// 振荡复现 v2:两个"永不成功"的假 More 栏(门户式菜单,关菜单时焦点还原触发器),
// 分别位于页首(y≈0)与 README 区(y≈中部),并周期性制造 body 变更(模拟 GitHub React 注水/活跃更新)。
// 预期:两个栏交替重试 → 页面在"顶部锚点"与"中部锚点"间来回跳。
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

const UA_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const INSTRUMENT = `
  window.__YLOG = [];
  window.__FOCUSJ = [];
  const y = () => Math.round(window.scrollY);
  const origFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (...a) {
    const b = y();
    const r = origFocus.apply(this, a);
    const af = y();
    if (af !== b) window.__FOCUSJ.push({ t: Date.now() % 1000000, from: b, to: af, el: ((this.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 24)) });
    return r;
  };
  window.addEventListener("scroll", () => {
    const last = window.__YLOG[window.__YLOG.length - 1];
    const cy = y();
    if (!last || last.y !== cy) window.__YLOG.push({ t: Date.now() % 1000000, y: cy });
  }, { passive: true, capture: true });
`;

async function run(browser) {
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
  `);
  await page.evaluateOnNewDocument(INSTRUMENT);
  await page.goto(REPO, { waitUntil: "domcontentloaded", timeout: 60000 });
  const raw = fs.readFileSync(SCRIPT, "utf8");
  let cleaned = extractBody(raw), idx;
  while ((idx = cleaned.indexOf("<script>")) !== -1) cleaned = stripScriptBlock(cleaned, idx);
  await page.evaluate(`try { ${cleaned}\n } catch (e) { window.__MGGA_BOOT_ERRORS.push(String(e && e.stack || e)); }`);
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 8000)); // 初始收割完成

  // 注入两个假失败栏:菜单为"门户式"(打开时挂到 body,关闭时移除),关菜单时焦点还原触发器
  const injected = await page.evaluate(() => {
    const mkBar = (id, host, before) => {
      const wrap = document.createElement("nav");
      wrap.id = id;
      wrap.setAttribute("aria-label", id);
      wrap.style.cssText = "display:block;height:44px;background:#f6f8fa;border-bottom:1px solid #d0d7de;";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "More items";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-haspopup", "true");
      wrap.appendChild(btn);
      before ? host.insertBefore(wrap, before) : host.appendChild(wrap);

      let menu = null;
      btn.addEventListener("click", () => {
        const opening = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(opening));
        if (opening) {
          menu = document.createElement("div");
          menu.setAttribute("role", "menu");
          menu.style.cssText = "position:fixed;left:8px;right:8px;top:60px;background:#fff;border:1px solid #d0d7de;z-index:2147482000;";
          const item = document.createElement("a");
          item.href = "#" + id;
          item.setAttribute("role", "menuitem");
          item.setAttribute("tabindex", "-1");
          item.textContent = "Item of " + id;
          item.style.cssText = "display:block;padding:8px 12px;";
          menu.appendChild(item);
          document.body.appendChild(menu);
          item.focus({ preventScroll: true }); // fixed 菜单:聚焦不滚页
        } else if (menu) { menu.remove(); menu = null; }
      });
      wrap.__closeLikePrimer = () => {
        if (btn.getAttribute("aria-expanded") === "true") btn.click();
        btn.focus({ preventScroll: false }); // primer 关:焦点还原触发器(可滚页)
      };
      return wrap;
    };
    const header = document.querySelector("header") || document.body;
    mkBar("mgga-fake-top", header, header.firstChild); // 页首栏
    const article = document.querySelector("article");
    if (article) mkBar("mgga-fake-mid", article.parentElement, article); // README 区栏
    return !!article;
  });

  // Escape 时按 primer 方式关闭两个假栏(焦点还原触发器)
  await page.evaluate(() => {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        for (const id of ["mgga-fake-top", "mgga-fake-mid"]) {
          const w = document.getElementById(id);
          if (w && w.__closeLikePrimer) w.__closeLikePrimer();
        }
      }
    });
    // 周期性制造 body 变更(模拟 GitHub 注水/活跃更新触发 MutationObserver)
    setInterval(() => {
      const c = document.createComment("tick-" + Date.now());
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 50);
    }, 1200);
  });

  await new Promise((r) => setTimeout(r, 30000));
  const out = await page.evaluate(() => ({
    ylog: window.__YLOG,
    focusJumps: window.__FOCUSJ,
    dock: !!document.getElementById("mgga-mobile-nav-dock"),
    errors: window.__MGGA_BOOT_ERRORS,
  }));
  await page.close();
  return out;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"],
  });
  const r = await run(browser);
  await browser.close();
  const bigJumps = r.ylog.filter((e, i) => i > 0 && Math.abs(e.y - r.ylog[i - 1].y) > 200);
  console.log("article-bar injected:", r.dock, "| errors:", r.errors.length);
  console.log("scrollY track:", JSON.stringify(r.ylog));
  console.log("focus-jump events:", JSON.stringify(r.focusJumps));
  console.log("big jumps (>200px):", bigJumps.length, JSON.stringify(bigJumps));
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
