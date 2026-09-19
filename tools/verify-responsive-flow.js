// 验证用户场景:桌面 UA,桌面宽度加载 → 切 Responsive 400px(不刷新)。
// 期望:dock 存在、条目不缩水、More 点击有界、无振荡。
"use strict";
const puppeteer = require("puppeteer-core");
const path = require("path");

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
  await page.evaluate(await require("fs/promises").readFile(SCRIPT, "utf8").then((s) => extractBody(s)));
  await new Promise((r) => setTimeout(r, 9000));

  const snapDesktop = await page.evaluate(() => ({
    items: document.querySelectorAll("#mgga-mobile-nav-dock a[href]").length,
    clicks: window.__CLICKS.length,
  }));

  // 切 Responsive 400px(不刷新)
  await page.setViewport({ width: 400, height: 800 });
  await new Promise((r) => setTimeout(r, 12000));

  const snapMobile = await page.evaluate(() => ({
    items: document.querySelectorAll("#mgga-mobile-nav-dock a[href]").length,
    labels: [...document.querySelectorAll("#mgga-mobile-nav-dock a[href]")].slice(0, 16).map((a) => (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 18)),
    clicks: window.__CLICKS,
    yMin: Math.min(...window.__YLOG.map((p) => p.y), 0),
    yMax: Math.max(...window.__YLOG.map((p) => p.y)),
  }));

  console.log("desktop(dock items, moreClicks):", JSON.stringify(snapDesktop));
  console.log("responsive400:", JSON.stringify(snapMobile, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
