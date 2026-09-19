// 验证"晚出现的 More 栏"状态机:页面加载 34s 后(任何旧窗口早已过期)
// 注入一个带真实溢出项的假头部 More 栏(门户菜单 + primer 式焦点还原,
// 位于页首下方 1500px)。期望:该栏按钮恰好被点击 1 次、2 个溢出项进入
// 面板、期间页面不滚动(snap-back)、之后不再有任何点击。
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
  await page.setViewport({ width: 400, height: 800 });
  await page.evaluateOnNewDocument(`
    window.GM_getValue = (k, d) => d;
    window.GM_setValue = (k, v) => {};
    window.GM_registerMenuCommand = () => {};
    window.GM_addStyle = (s) => { const e = document.createElement("style"); e.textContent = s; document.head.appendChild(e); };
    window.GM_notification = () => {};
    window.__CLICKS = [];
    const origClick = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function () {
      if (this.id === "fake-late-more") {
        window.__CLICKS.push({ t: Date.now() % 1000000, y: window.scrollY });
      }
      return origClick.call(this);
    };
    window.__YLOG = [];
    setInterval(() => { const y = window.scrollY; const L = window.__YLOG; if (!L.length || L[L.length-1].y !== y) L.push({ t: Date.now() % 1000000, y }); }, 120);
  `);
  await page.goto(REPO, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(await fs.promises.readFile(SCRIPT, "utf8").then((s) => extractBody(s)));
  // 34s:任何时间窗设计下都已过期;期间正常完成首次收割
  await new Promise((r) => setTimeout(r, 34000));

  const before = await page.evaluate(() => ({
    items: document.querySelectorAll("#mgga-mobile-nav-dock a[href]").length,
    hasFakeItems: [...document.querySelectorAll("#mgga-mobile-nav-dock a[href]")]
      .some((a) => /Fake (Alpha|Beta)/.test(a.textContent || "")),
  }));

  // 注入"晚出现"的假头部 More 栏:margin-top 1500px(在视口外),
  // 菜单为 body 门户 + primer 式焦点行为(开→聚焦菜单项;Esc→焦点还原按钮)
  await page.evaluate(() => {
    const bar = document.createElement("nav");
    bar.setAttribute("aria-label", "FakeLateHeader");
    bar.id = "fake-late-bar";
    bar.style.cssText = "margin:1500px 0; padding:8px; background:#f6f8fa;";
    bar.innerHTML =
      '<ul style="display:flex;gap:8px;list-style:none;margin:0;padding:0">' +
      '<li><a href="/react/react/discussions">Visible One</a></li></ul>' +
      '<button id="fake-late-more" type="button" aria-expanded="false">More items</button>';
    document.body.appendChild(bar);
    const btn = bar.querySelector("#fake-late-more");
    btn.addEventListener("click", () => {
      if (btn.getAttribute("aria-expanded") === "true") return;
      btn.setAttribute("aria-expanded", "true");
      // 模拟 React portal 延迟渲染
      setTimeout(() => {
        if (btn.getAttribute("aria-expanded") !== "true") return;
        const menu = document.createElement("ul");
        menu.setAttribute("role", "menu");
        menu.style.cssText = "position:fixed;top:10px;left:10px;background:#fff;border:1px solid #d0d7de;padding:4px;list-style:none;z-index:99";
        menu.innerHTML =
          '<li><a role="menuitem" href="/react/react/discussions?tab=fake-alpha">Fake Alpha</a></li>' +
          '<li><a role="menuitem" href="/react/react/discussions?tab=fake-beta">Fake Beta</a></li>';
        document.body.appendChild(menu);
        const first = menu.querySelector("a");
        if (first) first.focus(); // primer 行为:聚焦菜单项(可滚动页面)
        const close = () => {
          btn.setAttribute("aria-expanded", "false");
          menu.remove();
          document.removeEventListener("keydown", onKey, true);
          btn.focus(); // primer 行为:焦点还原触发器(可滚动页面)
        };
        const onKey = (e) => { if (e.key === "Escape") close(); };
        document.addEventListener("keydown", onKey, true);
      }, 400);
    });
  });
  await new Promise((r) => setTimeout(r, 12000));

  const after = await page.evaluate(() => ({
    items: document.querySelectorAll("#mgga-mobile-nav-dock a[href]").length,
    fakeClicks: window.__CLICKS.length,
    fakeItems: [...document.querySelectorAll("#mgga-mobile-nav-dock a[href]")]
      .map((a) => (a.textContent || "").trim().replace(/\s+/g, " "))
      .filter((t) => /Fake (Alpha|Beta)/.test(t)),
    yMax: Math.max(...window.__YLOG.map((p) => p.y)),
  }));
  // 再等 10s 确认无后续点击
  await new Promise((r) => setTimeout(r, 10000));
  const settle = await page.evaluate(() => ({
    fakeClicks: window.__CLICKS.length,
    yMax: Math.max(...window.__YLOG.map((p) => p.y)),
  }));

  console.log("before-inject(34s):", JSON.stringify(before));
  console.log("after-inject(+12s):", JSON.stringify(after));
  console.log("after-settle(+10s):", JSON.stringify(settle));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
