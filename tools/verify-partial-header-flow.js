// 验证登录态头部 react-partial 式结构的收割:切 Responsive 后
// ①头部 More 触发器延迟 1.5s 才注入(React 重渲染);②点击后菜单 portal
// 再延迟 600ms 挂载;③primer 式焦点行为(开→聚焦菜单项;Esc→焦点还原)。
// 期望:溢出项最终进入面板;该触发器点击 ≤2 次;页面不滚动。
"use strict";
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const REPO = process.env.MGGA_PROBE_REPO || "https://github.com/react/react";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCRIPT = path.join(__dirname, "..", "Make-GitHub-Great-Again.js");

function extractBody(html) {
  const marker = "==/UserScript==";
  const mi = html.indexOf(marker);
  const iife = html.indexOf("(function", mi);
  return html.slice(iife);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluateOnNewDocument(`
    window.GM_getValue = (k, d) => d;
    window.GM_setValue = (k, v) => {};
    window.GM_registerMenuCommand = () => {};
    window.GM_addStyle = (s) => { const e = document.createElement("style"); e.textContent = s; document.head.appendChild(e); };
    window.GM_notification = () => {};
    window.__CLICKS = [];
    window.__ALLCLICKS = [];
    window.__LOGS = [];
    const origClick = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function () {
      const t = (this.textContent || "").trim().slice(0, 20);
      const tag = this.tagName + ":" + t;
      window.__ALLCLICKS.push(tag);
      if (this.id === "partial-header-more") {
        window.__CLICKS.push({ t: Date.now() % 1000000, y: window.scrollY });
      }
      return origClick.call(this);
    };
    window.__YLOG = [];
    setInterval(() => { const y = window.scrollY; const L = window.__YLOG; if (!L.length || L[L.length-1].y !== y) L.push({ t: Date.now() % 1000000, y }); }, 120);
  `);
  const consoleLogs = [];
  page.on("console", (msg) => {
    const t = msg.text();
    consoleLogs.push(t);
    if (t.includes("[MGGA]")) console.log("  [page]", t);
  });
  await page.goto(REPO, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(await fs.promises.readFile(SCRIPT, "utf8").then((s) => extractBody(s)));

  // 1) 桌面宽度:注入"登录态头部容器"(react-partial 结构),无 More 触发器
  await page.evaluate(() => {
    const partial = document.createElement("react-partial");
    partial.id = "fake-partial-header";
    const header = document.createElement("div");
    header.className = "position-relative header-wrapper js-header-wrapper";
    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Fake Global");
    nav.innerHTML =
      '<ul style="display:flex;gap:8px;list-style:none;margin:0;padding:0">' +
      '<li><a href="/features">Features</a></li>' +
      '<li><a href="/enterprise">Enterprise</a></li></ul>';
    header.appendChild(nav);
    partial.appendChild(header);
    document.body.insertBefore(partial, document.body.firstChild);
  });
  await new Promise((r) => setTimeout(r, 3000));
  const desktop = await page.evaluate(() => ({
    items: document.querySelectorAll("#mgga-mobile-nav-dock a[href]").length,
  }));

  // 2) 切 Responsive 400px:1.5s 后 react-partial "重渲染"出 More 触发器
  await page.setViewport({ width: 400, height: 800 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => {
    const nav = document.querySelector("#fake-partial-header nav");
    if (!nav) return;
    const btn = document.createElement("button");
    btn.id = "partial-header-more";
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-haspopup", "true");
    btn.textContent = "More";
    nav.appendChild(btn);
    btn.addEventListener("click", () => {
      if (btn.getAttribute("aria-expanded") === "true") return;
      btn.setAttribute("aria-expanded", "true");
      // 模拟 react-partial 菜单 portal 延迟挂载(600ms)
      setTimeout(() => {
        if (btn.getAttribute("aria-expanded") !== "true") return;
        const menu = document.createElement("ul");
        menu.setAttribute("role", "menu");
        menu.className = "partial-overlay-menu";
        menu.style.cssText = "position:fixed;top:10px;left:10px;background:#fff;border:1px solid #d0d7de;padding:4px;list-style:none;z-index:99";
        menu.innerHTML =
          '<li><a role="menuitem" href="/pricing">Pricing</a></li>' +
          '<li><a role="menuitem" href="/team">Team</a></li>' +
          '<li><a role="menuitem" href="/customer-stories">Customer Stories</a></li>';
        document.body.appendChild(menu);
        const first = menu.querySelector("a");
        if (first) first.focus(); // primer 行为:聚焦菜单项
        const close = () => {
          btn.setAttribute("aria-expanded", "false");
          menu.remove();
          document.removeEventListener("keydown", onKey, true);
          btn.focus(); // primer 行为:焦点还原触发器
        };
        const onKey = (e) => { if (e.key === "Escape") close(); };
        document.addEventListener("keydown", onKey, true);
      }, 600);
    });
  });

  // 3) 等待收割(含 2.5s 重试窗口 + 观察余量)
  await new Promise((r) => setTimeout(r, 12000));
  const afterSwitch = await page.evaluate(() => ({
    items: document.querySelectorAll("#mgga-mobile-nav-dock a[href]").length,
    partialItems: [...document.querySelectorAll("#mgga-mobile-nav-dock a[href]")]
      .map((a) => (a.textContent || "").trim().replace(/\s+/g, " "))
      .filter((t) => /^(Pricing|Team|Customer Stories)$/.test(t)),
    partialClicks: window.__CLICKS.length,
    yMax: Math.max(...window.__YLOG.map((p) => p.y)),
    // 诊断:假头部 nav 与按钮的实际状态
    diag: (() => {
      const nav = document.querySelector("#fake-partial-header nav");
      const btn = document.getElementById("partial-header-more");
      if (!nav) return { navFound: false };
      const cs = btn ? getComputedStyle(btn) : null;
      const r = btn ? btn.getBoundingClientRect() : null;
      return {
        navFound: true,
        navInBody: document.body.contains(nav),
        btnFound: !!btn,
        btnText: btn ? (btn.textContent || "").trim() : null,
        btnDisplay: cs ? cs.display : null,
        btnVisible: btn ? !btn.hasAttribute("hidden") : null,
        btnRect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
        navCount: document.querySelectorAll("nav").length,
        allClicks: window.__ALLCLICKS || [],
      };
    })(),
  }));
  // 4) 再等 10s:确认不再点击(有界)
  await new Promise((r) => setTimeout(r, 10000));
  const settle = await page.evaluate(() => ({
    partialClicks: window.__CLICKS.length,
    yMax: Math.max(...window.__YLOG.map((p) => p.y)),
  }));

  console.log("desktop-1280:", JSON.stringify(desktop));
  console.log("after-switch-400(+12s):", JSON.stringify(afterSwitch));
  console.log("settle(+10s):", JSON.stringify(settle));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
