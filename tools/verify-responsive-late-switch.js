// 决定性验证:模拟用户真实时序 —— 桌面 1280px 加载 → 等 25s(超过旧窗口,
// 模拟打开 DevTools 的时间)→ 切 Responsive 400px → 观察头部 More 是否
// 恰好被收割一次、头部溢出项是否进入面板、点击是否全局有界。
// 登录态头部才是问题栏,但匿名态头部在重排后同样晚出 More(react-partial),
// 足以验证状态机时序;登录态由用户实测覆盖。
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
    const origClick = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function () {
      const t = (this.textContent || "").trim();
      if (/^more/i.test(t) || /more/i.test(this.getAttribute("aria-label") || "")) {
        window.__CLICKS.push({ t: Date.now() % 1000000, label: t.slice(0, 14), y: window.scrollY });
      }
      return origClick.call(this);
    };
    window.__YLOG = [];
    setInterval(() => { const y = window.scrollY; const L = window.__YLOG; if (!L.length || L[L.length-1].y !== y) L.push({ t: Date.now() % 1000000, y }); }, 120);
  `);
  await page.goto(REPO, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(await fs.promises.readFile(SCRIPT, "utf8").then((s) => extractBody(s)));
  // 关键:等 25s,远超旧版 20s 收割窗口,复现"窗口过期"时序
  await new Promise((r) => setTimeout(r, 25000));

  const snapDesktop = await page.evaluate(() => ({
    items: document.querySelectorAll("#mgga-mobile-nav-dock a[href]").length,
    clicks: window.__CLICKS.length,
  }));

  // 切 Responsive 400px(不刷新)
  await page.setViewport({ width: 400, height: 800 });
  await new Promise((r) => setTimeout(r, 15000));

  const snapMobile = await page.evaluate(() => ({
    items: document.querySelectorAll("#mgga-mobile-nav-dock a[href]").length,
    labels: [...document.querySelectorAll("#mgga-mobile-nav-dock a[href]")]
      .map((a) => (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 18)),
    clicks: window.__CLICKS,
    yMin: Math.min(...window.__YLOG.map((p) => p.y), 0),
    yMax: Math.max(...window.__YLOG.map((p) => p.y)),
  }));

  console.log("desktop(25s wait)(items, clicks):", JSON.stringify(snapDesktop));
  console.log("responsive400(after switch):", JSON.stringify(snapMobile, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
