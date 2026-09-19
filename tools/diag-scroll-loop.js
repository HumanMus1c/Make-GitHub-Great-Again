// 决定性实验:
// 1) 真实脚本在桌面UA+400px 下运行 45s,统计 aria-expanded 元素的 .click() 次数随时间的分布
//    与 scroll 事件轨迹 —— 验证"重复收割"是否存在。
// 2) 注入一个"假 More 触发器"(可见、可 focus、点击永不产生菜单)到文件区上方,
//    模拟登录态下收割永远失败的栏 —— 验证 是否形成 持续 跳动/滚动。
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
  window.__CLICKS = [];
  window.__SCROLLS = [];
  window.__FOCUS_SCROLLED = [];
  const y = () => Math.round(window.scrollY);
  const origClick = HTMLElement.prototype.click;
  HTMLElement.prototype.click = function (...a) {
    const expanded = this.getAttribute && this.getAttribute("aria-expanded");
    if (expanded !== null && expanded !== undefined) {
      window.__CLICKS.push({ t: Date.now() % 1000000, phase: window.__PHASE || "?", expanded, text: (this.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 30), navAria: (this.closest("nav") || {}).getAttribute ? (this.closest("nav").getAttribute("aria-label") || "") : "", yBefore: y() });
    }
    return origClick.apply(this, a);
  };
  const origFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (...a) {
    const b = y();
    const r = origFocus.apply(this, a);
    const af = y();
    if (af !== b) window.__FOCUS_SCROLLED.push({ t: Date.now() % 1000000, phase: window.__PHASE || "?", from: b, to: af, el: (this.tagName || "?") + ":" + ((this.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 26)) });
    return r;
  };
  window.addEventListener("scroll", () => {
    const last = window.__SCROLLS[window.__SCROLLS.length - 1];
    const cy = y();
    if (!last || last.y !== cy) window.__SCROLLS.push({ t: Date.now() % 1000000, phase: window.__PHASE || "?", y: cy });
  }, { passive: true, capture: true });
`;

async function run(browser, withFakeTrigger) {
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800, isMobile: true, hasTouch: true });
  await page.setUserAgent(UA_DESKTOP);
  await page.evaluateOnNewDocument(`
    window.GM_getValue = (k, d) => { try { const v = localStorage.getItem("mgga_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
    window.GM_setValue = (k, v) => { try { localStorage.setItem("mgga_" + k, JSON.stringify(v)); } catch (e) {} };
    window.GM_addStyle = (css) => { const s = document.createElement("style"); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
    window.GM_registerMenuCommand = () => {};
    window.unsafeWindow = window;
    window.__MGGA_BOOT_ERRORS = [];
    window.__PHASE = "load";
  `);
  await page.evaluateOnNewDocument(INSTRUMENT);
  await page.goto(REPO, { waitUntil: "domcontentloaded", timeout: 60000 });
  const pageScript = buildPageScript();
  await page.evaluate(`try { ${pageScript}\n } catch (e) { window.__MGGA_BOOT_ERRORS.push(String(e && e.stack || e)); }`);
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 30000 }).catch(() => {});

  // 阶段 P:纯被动 20s(脚本自身收割)
  await page.evaluate(() => { window.__PHASE = "passive"; });
  await new Promise((r) => setTimeout(r, 20000));
  const passive = await page.evaluate(() => ({
    clicks: window.__CLICKS.slice(),
    scrolls: window.__SCROLLS.slice(),
    focusScrolled: window.__FOCUS_SCROLLED.slice(),
  }));

  let fake = null;
  if (withFakeTrigger) {
    // 阶段 F:注入假 More 栏(可见、位于 README 区附近、点击后 aria-expanded 翻转但永不出现菜单)
    fake = await page.evaluate(() => {
      window.__PHASE = "fake";
      const readme = document.querySelector("article") || document.querySelector("#readme") || document.querySelector("main");
      if (!readme) return null;
      const wrap = document.createElement("div");
      wrap.id = "mgga-fake-more-bar";
      wrap.style.cssText = "height:40px;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid #d0d7de;background:#f6f8fa;";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "More items";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-haspopup", "true");
      wrap.appendChild(btn);
      readme.parentElement.insertBefore(wrap, readme);
      // 点击只翻转 aria-expanded,不产生菜单(模拟收割永远失败)
      btn.addEventListener("click", () => {
        btn.setAttribute("aria-expanded", btn.getAttribute("aria-expanded") === "true" ? "false" : "true");
      });
      // 触发一次 MutationObserver 重估
      document.body.appendChild(document.createComment("mgga-fake-trigger"));
      return true;
    });
    await new Promise((r) => setTimeout(r, 25000));
  }

  const after = await page.evaluate(() => ({
    clicks: window.__CLICKS.slice(),
    scrolls: window.__SCROLLS.slice(),
    focusScrolled: window.__FOCUS_SCROLLED.slice(),
    dock: !!document.getElementById("mgga-mobile-nav-dock"),
  }));
  await page.close();
  return { passive, after, fake };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"],
  });
  const r = await run(browser, true);
  await browser.close();

  const summarize = (label, clicks, scrolls, focusScrolled) => {
    console.log("---- " + label);
    console.log(" clicks:", clicks.length, JSON.stringify(clicks.slice(0, 20)));
    if (clicks.length > 20) console.log("  …total", clicks.length, "clicks; last:", JSON.stringify(clicks.slice(-3)));
    console.log(" focusScrolled:", JSON.stringify(focusScrolled.slice(0, 15)));
    console.log(" scrollY track:", JSON.stringify(scrolls.slice(0, 40)));
  };
  summarize("阶段P 被动 20s", r.passive.clicks, r.passive.scrolls, r.passive.focusScrolled);
  summarize("阶段F 假失败栏注入后 25s", r.after.clicks, r.after.scrolls, r.after.focusScrolled);
  console.log("fake injected:", r.fake, "| dock:", r.after.dock);
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
