// 取证:页面滚动到底由谁触发。
// 在 document-start 拦截 focus / scrollIntoView / scrollTo / scrollBy / scroll,
// 记录调用栈;监听 scroll 事件记录 scrollY 轨迹;记录所有 aria-expanded 元素的点击。
// 三阶段:被动观察 → 主动模拟 More 收割点击(开/关循环) → 汇总。
"use strict";
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const REPO = process.env.MGGA_PROBE_REPO || "https://github.com/facebook/react";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCRIPT = path.join(__dirname, "..", "Make-GitHub-Great-Again.js");

function extractBody(html) {
  const marker = "==/UserScript==";
  const mi = html.indexOf(marker);
  if (mi < 0) throw new Error("userscript header not found");
  const iife = html.indexOf("(function", mi);
  if (iife < 0) throw new Error("IIFE not found after header");
  return html.slice(iife);
}
function stripScriptBlock(src, startIdx) {
  const end = src.indexOf("<\/script>", startIdx);
  if (end < 0) throw new Error("no closing </script>");
  return src.slice(0, startIdx) + src.slice(end + 9);
}
function buildPageScript() {
  const raw = fs.readFileSync(SCRIPT, "utf8");
  let cleaned = extractBody(raw), idx;
  while ((idx = cleaned.indexOf("<script>")) !== -1) cleaned = stripScriptBlock(cleaned, idx);
  return cleaned;
}

const UA_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const INSTRUMENT = `
  window.__SCROLL_SRC = [];
  window.__FOCUS_LOG = [];
  window.__CLICK_LOG = [];
  window.__Y_LOG = [];
  const stackTop = () => {
    const lines = String(new Error().stack || "").split("\\n").slice(2, 7);
    return lines.map((l) => l.trim().replace(/^at /, "").replace(/\\?[^:]*$/, "").slice(0, 160)).join(" <= ");
  };
  const y = () => Math.round(window.scrollY);
  const origFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (...a) {
    const before = y();
    const r = origFocus.apply(this, a);
    const after = y();
    if (after !== before || true) {
      window.__FOCUS_LOG.push({ t: Date.now() % 1000000, before, after, el: (this.tagName || "?") + ":" + ((this.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 30)) + ":" + (this.className || "").toString().slice(0, 40), src: stackTop() });
    }
    return r;
  };
  for (const name of ["scrollIntoView"]) {
    const orig = Element.prototype[name];
    Element.prototype[name] = function (...a) {
      window.__SCROLL_SRC.push({ kind: name, t: Date.now() % 1000000, before: y(), el: (this.tagName || "?") + ":" + ((this.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 30)), src: stackTop() });
      return orig.apply(this, a);
    };
  }
  for (const name of ["scrollTo", "scrollBy", "scroll"]) {
    const orig = window[name].bind(window);
    window[name] = function (...a) {
      window.__SCROLL_SRC.push({ kind: "win." + name, t: Date.now() % 1000000, before: y(), src: stackTop() });
      return orig(...a);
    };
  }
  const origClick = HTMLElement.prototype.click;
  HTMLElement.prototype.click = function (...a) {
    const expanded = this.getAttribute && this.getAttribute("aria-expanded");
    if (expanded !== null && expanded !== undefined) {
      window.__CLICK_LOG.push({ t: Date.now() % 1000000, expanded, text: (this.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 36), inNav: !!this.closest("nav"), navAria: (this.closest("nav") || {}).getAttribute ? (this.closest("nav").getAttribute("aria-label") || "") : "" });
    }
    return origClick.apply(this, a);
  };
  window.addEventListener("scroll", () => {
    const now = Date.now() % 1000000;
    const last = window.__Y_LOG[window.__Y_LOG.length - 1];
    const cy = y();
    if (!last || last.y !== cy) window.__Y_LOG.push({ t: now, y: cy });
  }, { passive: true, capture: true });
`;

async function run(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800, isMobile: true, hasTouch: true });
  await page.setUserAgent(UA_DESKTOP); // DevTools 模拟移动端默认保留桌面 UA
  await page.evaluateOnNewDocument(`
    window.GM_getValue = (k, d) => { try { const v = localStorage.getItem("mgga_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
    window.GM_setValue = (k, v) => { try { localStorage.setItem("mgga_" + k, JSON.stringify(v)); } catch (e) {} };
    window.GM_addStyle = (css) => { const s = document.createElement("style"); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
    window.GM_registerMenuCommand = () => {};
    window.unsafeWindow = window;
    window.__MGGA_BOOT_ERRORS = [];
  `);
  await page.evaluateOnNewDocument(INSTRUMENT);
  await page.goto(REPO, { waitUntil: "domcontentloaded", timeout: 60000 });
  const pageScript = buildPageScript();
  await page.evaluate(`try { ${pageScript}\n } catch (e) { window.__MGGA_BOOT_ERRORS.push(String(e && e.stack || e)); }`);
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 30000 }).catch(() => {});

  // 阶段1:被动观察 15s
  await new Promise((r) => setTimeout(r, 15000));
  const phase1 = await page.evaluate(() => ({
    yLog: window.__Y_LOG.slice(0, 60),
    scrollSrc: window.__SCROLL_SRC.slice(0, 20),
    focusLog: window.__FOCUS_LOG.filter((f) => f.before !== f.after).slice(0, 20),
    clicks: window.__CLICK_LOG.slice(0, 40),
  }));

  // 阶段2:主动模拟收割点击:找到所有 More 触发器,执行 开→Escape→(必要时点关) 循环 ×3
  const phase2 = await page.evaluate(async () => {
    const out = { steps: [], yTrace: [] };
    const triggers = Array.from(document.querySelectorAll("nav button, nav summary, nav a"))
      .filter((el) => {
        const t = (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        return /^(more|more items)/i.test(t);
      });
    out.triggers = triggers.map((el) => ({
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30),
      navAria: (el.closest("nav") || {}).getAttribute ? (el.closest("nav").getAttribute("aria-label") || "") : "",
    }));
    const markY = (label) => out.yTrace.push({ label, y: Math.round(window.scrollY), t: Date.now() % 1000000 });
    markY("start");
    for (let round = 0; round < 3; round++) {
      for (const trig of triggers) {
        try { trig.click(); } catch (e) {}
        markY("open:" + (trig.textContent || "").trim().slice(0, 12));
        await new Promise((r) => setTimeout(r, 400));
        try { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); } catch (e) {}
        markY("escape");
        await new Promise((r) => setTimeout(r, 400));
        if (trig.getAttribute("aria-expanded") === "true") {
          try { trig.click(); } catch (e) {}
          markY("close-click");
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
    markY("end");
    return out;
  });

  const phase2After = await page.evaluate(() => ({
    yLogTail: window.__Y_LOG.slice(-60),
    scrollSrcTail: window.__SCROLL_SRC.slice(-30),
    focusMoved: window.__FOCUS_LOG.filter((f) => f.before !== f.after).slice(-30),
  }));

  await page.close();
  return { phase1, phase2, phase2After };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"],
  });
  const r = await run(browser);
  await browser.close();
  console.log("== 阶段1 被动观察(桌面UA 400px + 完整脚本)");
  console.log("scrollY log:", JSON.stringify(r.phase1.yLog));
  console.log("scrollIntoView/scrollTo calls:", JSON.stringify(r.phase1.scrollSrc, null, 1).slice(0, 2000));
  console.log("focus-moved:", JSON.stringify(r.phase1.focusLog.slice(0, 8), null, 1).slice(0, 1500));
  console.log("aria-expanded clicks:", JSON.stringify(r.phase1.clicks, null, 1).slice(0, 1500));
  console.log("== 阶段2 模拟收割循环");
  console.log("triggers:", JSON.stringify(r.phase2.triggers));
  console.log("yTrace:", JSON.stringify(r.phase2.yTrace));
  console.log("== 阶段2之后");
  console.log("scrollY tail:", JSON.stringify(r.phase2After.yLogTail));
  console.log("scroll calls tail:", JSON.stringify(r.phase2After.scrollSrcTail, null, 1).slice(0, 2500));
  console.log("focus-moved tail:", JSON.stringify(r.phase2After.focusMoved.slice(0, 12), null, 1).slice(0, 2500));
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
