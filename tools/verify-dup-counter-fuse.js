// 专项验证:More 菜单收割路径的计数器标签(Counter 节点、无空白拼接)
// 与直扫同名 tab 的去重(v2026.10.14:标签提取统一 + 计数剥尾正则;
// v2026.10.15:目的地去重拦截 "Security" vs "Security and quality" 别名)。
// 注入 legacy 风格平行栏:More 触发器 + 预挂载可见(aria-hidden)菜单,
// 菜单项用同仓库真实路径 + query/尾斜杠变体 + 别名标签 —— 金丝雀项
// 证明收割路径确实执行;同名与目的地双断言都必须为零重复。
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
  let cleaned = extractBody(raw);
  let idx;
  while ((idx = cleaned.indexOf("<script>")) !== -1) cleaned = stripScriptBlock(cleaned, idx);
  return cleaned;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => {
    const t = m.text();
    if (t.includes("[MGGA]")) console.log("[page]", t.slice(0, 160));
  });
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluateOnNewDocument(`
    window.GM_getValue = (k, d) => d;
    window.GM_setValue = () => {};
    window.GM_registerMenuCommand = () => {};
    window.GM_addStyle = (css) => { const s = document.createElement("style"); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
    window.GM_notification = () => {};
    window.unsafeWindow = window;
    window.__MGGA_BOOT_ERRORS = [];
  `);
  await page.goto(REPO, { waitUntil: "domcontentloaded", timeout: 60000 });
  const pageScript = buildPageScript();
  await page.evaluate(`try { ${pageScript}\n } catch (e) { window.__MGGA_BOOT_ERRORS.push(String(e && e.stack || e)); }`);
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 30000 }).catch(() => {});
  // 注入:aria-hidden 使直扫跳过菜单锚点,仅收割路径可见。
  // 别名场景:页面 canonical 条是 "Security and quality",注入条用旧名
  // "Security";href 用绝对 URL、query(?tab=all)与尾斜杠(/pulls/)变体
  // (More 菜单收割拿到的 href 形态,10.15 的字符串归一拦不住绝对 URL)。
  await page.evaluate(() => {
    const bar = document.createElement("nav");
    bar.setAttribute("aria-label", "Probe Legacy");
    bar.innerHTML =
      '<button type="button" aria-haspopup="true">More items</button>' +
      '<div class="ActionMenu-Overlay" aria-hidden="true" style="position:fixed;left:-9999px;top:0;width:240px;height:200px;opacity:0.01">' +
      '<ul class="ActionList" role="menu">' +
      '<li><a href="https://github.com/react/react/issues?tab=all">Issues<span class="Counter">1,834</span></a></li>' +
      '<li><a href="https://github.com/react/react/pulls/">Pull requests</a></li>' +
      '<li><a href="https://github.com/react/react/security">Security</a></li>' +
      '<li><a href="/react/react/probe-menu-canary">Probe Menu Canary</a></li>' +
      "</ul></div>";
    document.body.appendChild(bar);
  });
  await new Promise((r) => setTimeout(r, 9000));
  const bootErrors = await page.evaluate(() => window.__MGGA_BOOT_ERRORS || []);
  if (bootErrors.length) console.log("BOOT ERRORS:", bootErrors.slice(0, 2));
  const data = await page.evaluate(() => {
    const dock = document.getElementById("mgga-mobile-nav-dock");
    const links = dock
      ? [...dock.querySelectorAll("a")].map((a) => ({
          label: (a.textContent || "").replace(/\s+/g, " ").trim(),
          href: a.getAttribute("href"),
        }))
      : [];
    return { dock: !!dock, links, here: location.pathname };
  });
  await browser.close();
  const labels = data.links.map((l) => l.label);
  console.log("dock:", data.dock, "items:", data.links.length);
  console.log("labels:", JSON.stringify(labels));
  const norm = (s) =>
    s.replace(/[\s\u00a0]*\(?[\d][\d.,]*[kmb]?\)?[\s\u00a0]*$/i, "").trim().toLowerCase();
  const seen = new Set();
  const dup = [];
  for (const l of labels) {
    const k = norm(l);
    if (seen.has(k)) dup.push(l);
    seen.add(k);
  }
  const canary = labels.some((l) => /Probe Menu Canary/i.test(l));
  console.log("canary harvested:", canary);
  console.log("dup normalized labels:", JSON.stringify(dup));
  const destOf = (h) =>
    String(h || "").split("#")[0].split("?")[0].replace(/\/+$/, "").toLowerCase();
  const herePath = destOf(data.here || "");
  const seenDest = new Set();
  const dupDest = [];
  for (const l of data.links) {
    const d = destOf(l.href);
    if (!d) continue;
    if (d === herePath) continue; // Code/README 共享当前页路径,豁免
    if (seenDest.has(d)) dupDest.push(d);
    seenDest.add(d);
  }
  console.log("dup destinations:", JSON.stringify(dupDest));
  if (!data.dock) { console.log("RESULT: FAIL (no dock)"); process.exit(1); }
  if (!canary) { console.log("RESULT: FAIL (canary missing, harvest path not exercised)"); process.exit(1); }
  if (dup.length || dupDest.length) { console.log("RESULT: FAIL (duplicates)"); process.exit(1); }
  console.log("RESULT: PASS");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
