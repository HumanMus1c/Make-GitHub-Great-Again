// 合成探针:平行双标签条(同名 tab 异形 href)注入 + 真实 GitHub 页面,
// 验证同名去重保险丝:同名 tab(去计数后缀)在 dock 中至多出现一次。
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
  const iife = html.indexOf("(function", mi);
  return html.slice(iife);
}
function stripScriptBlock(src, startIdx) {
  const end = src.indexOf("<\/script>", startIdx);
  return src.slice(0, startIdx) + src.slice(end + 9);
}
function buildPageScript() {
  let cleaned = fs.readFileSync(SCRIPT, "utf8");
  cleaned = cleaned.slice(cleaned.indexOf("(function", cleaned.indexOf("==/UserScript==")));
  let idx;
  while ((idx = cleaned.indexOf("<script>")) !== -1) cleaned = stripScriptBlock(cleaned, idx);
  return cleaned;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluateOnNewDocument(`
    window.GM_getValue = (k, d) => d;
    window.GM_setValue = (k, v) => {};
    window.GM_addStyle = (css) => { const s = document.createElement("style"); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
    window.GM_registerMenuCommand = () => {};
    window.unsafeWindow = window;
    window.__MGGA_BOOT_ERRORS = [];
  `);
  await page.goto(REPO, { waitUntil: "domcontentloaded", timeout: 60000 });
  const pageScript = buildPageScript();
  await page.evaluate(`try { ${pageScript}\n } catch (e) { window.__MGGA_BOOT_ERRORS.push(String(e && e.stack || e)); }`);
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 6000));

  // 注入第二份平行仓库标签条:同名 tab 异形 href(带 query/fragment/尾斜杠/占位)
  await page.evaluate(() => {
    const dup = document.createElement("nav");
    dup.setAttribute("aria-label", "Repository");
    dup.id = "mgga-dup-bar-probe";
    dup.innerHTML =
      '<ul style="list-style:none;margin:0;padding:0">' +
      '<li><a href="/facebook/react/probe-canary">Probe Canary</a></li>' +
      '<li><a href="/facebook/react/issues/list">Issues</a></li>' +
      '<li><a href="/facebook/react/pulls/index">Pull requests</a></li>' +
      '<li><a href="/facebook/react/security/overview">Security and quality</a></li>' +
      '<li><a href="/facebook/react/security#tab">Security</a></li>' +
      "</ul>";
    document.body.appendChild(dup);
  });
  // 触发重建
  await page.evaluate(() => {
    const fab = document.getElementById("mgga-mobile-nav-dock-toggle");
    if (fab) fab.remove();
    const dock = document.getElementById("mgga-mobile-nav-dock");
    if (dock) dock.remove();
    window.dispatchEvent(new Event("resize"));
  });
  await new Promise((r) => setTimeout(r, 6000));

  const out = await page.evaluate(() => {
    const dock = document.getElementById("mgga-mobile-nav-dock");
    const links = dock ? Array.from(dock.querySelectorAll("a")).map((a) => ({
      label: (a.textContent || "").replace(/\s+/g, " ").trim(),
      href: a.getAttribute("href"),
    })).filter((l) => l.label) : [];
    const norm = (t) => t.replace(/\s+\d[\d,]*\s*$/, "").toLowerCase();
    const seen = new Map();
    links.forEach((l) => seen.set(norm(l.label), (seen.get(norm(l.label)) || 0) + 1));
    return {
      labels: links.map((l) => l.label),
      hrefs: links.map((l) => l.href),
      dups: Array.from(seen.entries()).filter(([, c]) => c > 1),
      errors: window.__MGGA_BOOT_ERRORS || [],
    };
  });
  console.log("labels:", JSON.stringify(out.labels));
  console.log("hrefs:", JSON.stringify(out.hrefs));
  console.log("dup normalized labels:", JSON.stringify(out.dups));
  if (out.errors.length) console.log("ERRORS:", out.errors.slice(0, 3));
  await browser.close();
  const pass = out.labels.length > 0 && out.dups.length === 0 && !out.errors.length;
  console.log("RESULT:", pass ? "PASS" : "FAIL");
  process.exit(pass ? 0 : 2);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
