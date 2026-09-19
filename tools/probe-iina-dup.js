// 探针:iina/iina 双视口(移动400/桌面1280)加载完整脚本,dump dock 条目与页面 nav bar 结构。
"use strict";
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const REPO = process.env.MGGA_PROBE_REPO || "https://github.com/iina/iina";
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
    window.__MGGA_CONSOLE = [];
    const _ci = console.info.bind(console);
    console.info = (...a) => { try { window.__MGGA_CONSOLE.push(a.map(String).join(" ").slice(0, 200)); } catch (e) {} _ci(...a); };
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
    const bars = qa("nav").map((n) => {
      const anchors = Array.from(n.querySelectorAll("a[href]")).map((a) => ({
        label: (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
        href: (a.getAttribute("href") || "").slice(0, 80),
      })).filter((x) => x.label);
      return {
        aria: n.getAttribute("aria-label") || "",
        cls: String(n.className || "").slice(0, 80),
        inNarrow: !!n.closest("[class*='show-whenNarrow']"),
        anchorCount: anchors.length,
        anchors: anchors.slice(0, 24),
      };
    }).filter((b) => b.anchorCount > 0);
    return {
      url: location.href,
      vw: innerWidth,
      dockPresent: !!dock,
      dockLinks: links,
      dockLabels: links.map((l) => l.label),
      bars,
      scanLogs: (window.__MGGA_CONSOLE || []).filter((t) => t.includes("[MGGA] scan")),
      mggaErrors: window.__MGGA_BOOT_ERRORS || [],
    };
  });
  await page.close();
  console.log("==== " + name + " (" + out.vw + "px)");
  console.log(" dock:", out.dockPresent, "labels:", JSON.stringify(out.dockLabels));
  const seen = new Map();
  out.dockLinks.forEach((l, i) => {
    const k = l.label.replace(/\s+\d[\d,]*\s*$/, "").toLowerCase();
    seen.set(k, (seen.get(k) || 0) + 1);
  });
  const dups = Array.from(seen.entries()).filter(([, c]) => c > 1);
  console.log(" dup normalized labels:", JSON.stringify(dups));
  console.log(" scan logs:", JSON.stringify(out.scanLogs));
  if (out.mggaErrors.length) console.log(" ERRORS:", out.mggaErrors.slice(0, 3));
  fs.writeFileSync(path.join(__dirname, "probe-iina-" + name.toLowerCase() + ".json"), JSON.stringify(out, null, 2));
  return out;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"],
  });
  await runViewport(browser, "MOBILE", { width: 400, height: 800, isMobile: true, hasTouch: true }, true);
  await runViewport(browser, "DESKTOP", { width: 1280, height: 800 }, false);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
