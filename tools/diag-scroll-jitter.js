// 复现"桌面浏览器模拟移动端时页面在顶部与 README 栏之间来回跳动"。
// 方法:移动视口(400px)加载完整脚本,注入 scrollY 采样器,
// 记录滚动位置变化序列;再对比禁用导航坞收割(harvestMoreItems 空转)时的表现。
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
function buildPageScript(disableHarvestClicks) {
  const raw = fs.readFileSync(SCRIPT, "utf8");
  let body = extractBody(raw);
  let cleaned = body, idx;
  while ((idx = cleaned.indexOf("<script>")) !== -1) cleaned = stripScriptBlock(cleaned, idx);
  if (disableHarvestClicks) {
    // A/B:收割点击改为立即返回空数组(不 click、不 escape、不重试)
    cleaned = cleaned.replace(
      /async function harvestMoreItems\(trigger\) \{/,
      "async function harvestMoreItems(trigger) { return []; // AB-DISABLED"
    );
  }
  return cleaned;
}

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// 采样器:每 100ms 记录 scrollY(>10 视为离开顶部),检测 0↔非0 的往返次数
const SAMPLER = `
  window.__SCROLL_LOG = [];
  window.__SAMPLER_STOP = false;
  (function tick() {
    if (window.__SAMPLER_STOP) return;
    const y = Math.round(window.scrollY);
    const last = window.__SCROLL_LOG[window.__SCROLL_LOG.length - 1];
    if (!last || last.y !== y) {
      window.__SCROLL_LOG.push({ t: Date.now(), y, h: document.documentElement.scrollHeight, bh: document.body.scrollHeight });
    }
    setTimeout(tick, 100);
  })();
`;

async function runVariant(browser, name, disableHarvestClicks) {
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800, isMobile: true, hasTouch: true });
  await page.setUserAgent(UA);
  await page.evaluateOnNewDocument(`
    window.GM_getValue = (k, d) => { try { const v = localStorage.getItem("mgga_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
    window.GM_setValue = (k, v) => { try { localStorage.setItem("mgga_" + k, JSON.stringify(v)); } catch (e) {} };
    window.GM_addStyle = (css) => { const s = document.createElement("style"); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
    window.GM_registerMenuCommand = () => {};
    window.unsafeWindow = window;
    window.__MGGA_BOOT_ERRORS = [];
    window.__CLICK_LOG = [];
    const origClick = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function (...args) {
      if (this.closest && this.closest("[aria-label='Repository']")) {
        window.__CLICK_LOG.push({ tag: this.tagName, text: (this.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40), t: Date.now() });
      }
      return origClick.apply(this, args);
    };
  `);
  await page.goto(REPO, { waitUntil: "domcontentloaded", timeout: 60000 });
  const pageScript = buildPageScript(disableHarvestClicks);
  await page.evaluate(`try { ${pageScript}\n } catch (e) { window.__MGGA_BOOT_ERRORS.push(String(e && e.stack || e)); }`);
  await page.evaluate(SAMPLER);
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 30000 }).catch(() => {});
  // 观察 25 秒:足够覆盖多轮收割(每栏至多 2.5s×2栏 + 重试轮)
  await new Promise((r) => setTimeout(r, 25000));
  const out = await page.evaluate(() => {
    const log = window.__SCROLL_LOG || [];
    // 计算方向反转次数:0→非0 与 非0→0 的转变
    let flips = 0, prevAway = null;
    const transitions = [];
    for (const e of log) {
      const away = e.y > 10;
      if (prevAway !== null && away !== prevAway) {
        flips++;
        transitions.push({ y: e.y, t: e.t });
      }
      prevAway = away;
    }
    const maxY = log.reduce((m, e) => Math.max(m, e.y), 0);
    return {
      vw: innerWidth,
      samples: log.length,
      distinctY: log.map((e) => e.y).filter((v, i, a) => a.indexOf(v) === i).length,
      flips,
      maxY,
      transitions: transitions.slice(0, 12),
      firstN: log.slice(0, 40),
      clickLog: window.__CLICK_LOG || [],
      clicks: (window.__CLICK_LOG || []).length,
      dockPresent: !!document.getElementById("mgga-mobile-nav-dock"),
      mggaErrors: window.__MGGA_BOOT_ERRORS || [],
    };
  });
  await page.close();
  console.log("==== " + name + " (vw=" + out.vw + ")");
  console.log(" dock:", out.dockPresent, "| harvestClicks on Repository nav:", out.clicks);
  console.log(" scroll samples:", out.samples, "| distinct Y:", out.distinctY, "| flips(顶部↔下方):", out.flips, "| maxY:", out.maxY);
  console.log(" transitions:", JSON.stringify(out.transitions));
  console.log(" scrollY log head:", JSON.stringify(out.firstN.map((e) => [e.t % 100000, e.y, e.h])));
  if (out.clicks) console.log(" clicks:", JSON.stringify(out.clickLog.slice(0, 10)));
  if (out.mggaErrors.length) console.log(" ERRORS:", out.mggaErrors.slice(0, 3));
  return out;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"],
  });
  const withScript = await runVariant(browser, "A: 完整脚本(现状)", false);
  const noHarvest = await runVariant(browser, "B: 禁用收割点击(A/B)", true);
  await browser.close();
  console.log("---- 结论 ----");
  console.log("A flips:", withScript.flips, "| B flips:", noHarvest.flips);
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
