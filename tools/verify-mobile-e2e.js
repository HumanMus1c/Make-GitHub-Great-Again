// 端到端验证(真实 Chrome + userscript 垫片):
// 移动 400px 与桌面 1280px 两个视口加载完整脚本,报告 dock 面板条目与收割覆盖。
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
  const body = extractBody(raw);
  let cleaned = body, idx;
  while ((idx = cleaned.indexOf("<script>")) !== -1) cleaned = stripScriptBlock(cleaned, idx);
  return cleaned;
}

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

async function runViewport(browser, name, viewport, mobileUA) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  if (mobileUA) await page.setUserAgent(UA);
  await page.evaluateOnNewDocument(`
    window.GM_getValue = (k, d) => { try { const v = localStorage.getItem("mgga_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
    window.GM_setValue = (k, v) => { try { localStorage.setItem("mgga_" + k, JSON.stringify(v)); } catch (e) {} };
    window.GM_addStyle = (css) => { const s = document.createElement("style"); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
    window.GM_registerMenuCommand = () => {};
    window.unsafeWindow = window;
    window.__MGGA_BOOT_ERRORS = [];
  `);
  await page.goto(REPO, { waitUntil: "domcontentloaded", timeout: 60000 });
  const pageScript = buildPageScript();
  await page.evaluate(`try { ${pageScript}\n } catch (e) { window.__MGGA_BOOT_ERRORS.push(String(e && e.stack || e)); }`);
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 9000));
  const out = await page.evaluate(() => {
    const qa = (s) => Array.from(document.querySelectorAll(s));
    const dock = document.getElementById("mgga-mobile-nav-dock");
    const links = dock ? Array.from(dock.querySelectorAll("a")).map((a) => ({
      label: (a.textContent || "").replace(/\s+/g, " ").trim(),
      href: a.getAttribute("href"),
    })).filter((l) => l.label) : [];
    return {
      url: location.href,
      vw: innerWidth,
      dockPresent: !!dock,
      dockLabels: links.map((l) => l.label),
      dockLinks: links,
      hasContributing: links.some((l) => /contributing/i.test(l.label)),
      hasLicense: links.some((l) => /license/i.test(l.label)),
      hasCodeOfConduct: links.some((l) => /code of conduct/i.test(l.label)),
      hasSecurity: links.some((l) => /^security/i.test(l.label)),
      mggaErrors: window.__MGGA_BOOT_ERRORS || [],
    };
  });
  await page.close();
  console.log("==== " + name + " (" + out.vw + "px)");
  console.log(" dock:", out.dockPresent, "items:", out.dockLabels.length);
  console.log(" labels:", JSON.stringify(out.dockLabels));
  console.log(" filesMore tabs:", "contributing=" + out.hasContributing, "license=" + out.hasLicense, "coc=" + out.hasCodeOfConduct, "security=" + out.hasSecurity);
  if (out.mggaErrors.length) console.log(" ERRORS:", out.mggaErrors.slice(0, 3));
  return out;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"],
  });
  const mobile = await runViewport(browser, "MOBILE", { width: 400, height: 800, isMobile: true, hasTouch: true }, true);
  const desktop = await runViewport(browser, "DESKTOP", { width: 1280, height: 800 }, false);
  await browser.close();
  const core = ["Code", "Issues", "Pull requests"];
  const hasCore = (labels) => core.every((c) => labels.some((l) => l.startsWith(c)));
  // 语义(v2026.10.8):移动宽度会额外收割头部 More 溢出项(如 Node/React
  // Native),故移动 ≥ 桌面;核心仓库 tab 双视口都必须在。
  const pass =
    mobile.dockPresent && desktop.dockPresent &&
    mobile.dockLabels.length > 0 &&
    hasCore(mobile.dockLabels) && hasCore(desktop.dockLabels) &&
    mobile.dockLabels.length >= desktop.dockLabels.length &&
    mobile.hasContributing && mobile.hasLicense;
  console.log("RESULT:", pass ? "PASS" : "FAIL");
  process.exit(pass ? 0 : 2);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
