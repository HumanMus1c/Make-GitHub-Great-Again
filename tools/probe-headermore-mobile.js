// 移动端视口下全局头部 nav 的 More 收割取证:
// 1) 枚举页面所有 nav(aria-label / 锚点数 / 按钮数)
// 2) 定位头部 nav(.js-header-wrapper header nav),列出全部按钮的标签与 aria
// 3) 注入 userscript 原始 findMoreTrigger / findMoreMenu / extractMenuItems /
//    harvestMoreItems,在真实 DOM 上运行,报告匹配结果与点击收割产物
// 4) 对照 #mgga-mobile-nav-dock 面板实际条目
"use strict";
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const REPO = process.env.MGGA_PROBE_REPO || "https://github.com/facebook/react";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCRIPT = path.join(__dirname, "..", "Make-GitHub-Great-Again.js");
const OUT = path.join(__dirname, "probe-headermore-mobile.json");

function log(...a) { console.log("[probe]", ...a); }

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
  if (end < 0) throw new Error("no closing </script> after " + startIdx);
  return src.slice(0, startIdx) + src.slice(end + 9);
}

function buildPageScript() {
  const raw = fs.readFileSync(SCRIPT, "utf8");
  const body = extractBody(raw);
  let cleaned = body;
  let idx;
  while ((idx = cleaned.indexOf("<script>")) !== -1) {
    cleaned = stripScriptBlock(cleaned, idx);
  }
  return cleaned;
}

// 与 tools/verify-harvest-sim.js 相同的括号配对函数截取
function grabFn(name) {
  const src = fs.readFileSync(SCRIPT, "utf8");
  const re = new RegExp("  (?:async )?function " + name + "\\(");
  const m = src.search(re);
  if (m < 0) throw new Error("fn not found: " + name);
  let i = src.indexOf("{", m), depth = 0, j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) break; }
  }
  return src.slice(m, j + 1);
}

const FN_CODE = [
  grabFn("normalizedText"),
  grabFn("isMoreLabel"),
  grabFn("isVisibleMenu"),
  grabFn("findMoreTrigger"),
  grabFn("findMoreMenu"),
  grabFn("extractMenuItems"),
  grabFn("harvestMoreItems"),
].join("\n");

(async () => {
  const pageScript = buildPageScript();
  log("userscript body length:", pageScript.length);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"],
  });
  const page = await browser.newPage();
  // 与 DevTools 设备工具栏模拟手机一致:窄视口 + 触摸
  await page.setViewport({ width: 400, height: 800, isMobile: true, hasTouch: true });
  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  );
  await page.evaluateOnNewDocument(`
    window.GM_getValue = (k, d) => { try { const v = localStorage.getItem("mgga_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
    window.GM_setValue = (k, v) => { try { localStorage.setItem("mgga_" + k, JSON.stringify(v)); } catch (e) {} };
    window.GM_addStyle = (css) => { const s = document.createElement("style"); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
    window.GM_registerMenuCommand = () => {};
    window.unsafeWindow = window;
    window.__MGGA_BOOT_ERRORS = [];
  `);
  page.on("console", (msg) => {
    const t = msg.text();
    if (t.includes("MGGA") || t.includes("nav dock")) log("page:", t.slice(0, 300));
  });
  page.on("pageerror", (e) => log("pageerror:", String(e).slice(0, 300)));

  log("navigating:", REPO);
  await page.goto(REPO, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(`try { ${pageScript}\n } catch (e) { window.__MGGA_BOOT_ERRORS.push(String(e && e.stack || e)); }`);
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 9000));

  const diag = await page.evaluate(`(async () => {
    const out = { url: location.href, vw: innerWidth, ua: navigator.userAgent };
    const qa = (s) => Array.from(document.querySelectorAll(s));

    // 注入 userscript 原函数
    const api = new Function(
      "document", "window", "HTMLDetailsElement", "HTMLAnchorElement",
      ${JSON.stringify(FN_CODE)} + "\\nreturn { findMoreTrigger, findMoreMenu, extractMenuItems, harvestMoreItems, isMoreLabel };"
    )(document, window, window.HTMLDetailsElement, window.HTMLAnchorElement);

    // 1) 全部 nav 概览
    out.navs = qa("nav").map((n) => ({
      aria: n.getAttribute("aria-label"),
      cls: String(n.className || "").slice(0, 90),
      inHeaderWrapper: !!n.closest(".js-header-wrapper"),
      anchors: n.querySelectorAll("a[href]").length,
      visibleAnchors: qa.call ? 0 : 0,
      buttons: n.querySelectorAll("button, summary").length,
    }));

    // 2) 头部 nav 结构与按钮
    const headerNav = document.querySelector(".js-header-wrapper header nav") ||
      document.querySelector("header nav");
    out.headerNavFound = !!headerNav;
    if (headerNav) {
      out.headerNavAria = headerNav.getAttribute("aria-label");
      out.headerNavHtmlHead = headerNav.outerHTML.slice(0, 2600);
      out.headerNavButtons = Array.from(headerNav.querySelectorAll("button, summary, [role=button]")).map((b) => {
        const r = b.getBoundingClientRect();
        return {
          tag: b.tagName,
          text: (b.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40),
          ariaLabel: b.getAttribute("aria-label"),
          haspopup: b.getAttribute("aria-haspopup"),
          expanded: b.getAttribute("aria-expanded"),
          controls: b.getAttribute("aria-controls"),
          visible: r.width > 0,
          w: Math.round(r.width),
          isMoreByScript: !!api.findMoreTrigger(headerNav) === false ? undefined : (api.findMoreTrigger(headerNav) === b),
        };
      });
      const trig = api.findMoreTrigger(headerNav);
      out.scriptTrigger = trig ? {
        tag: trig.tagName,
        text: (trig.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40),
        ariaLabel: trig.getAttribute("aria-label"),
        expanded: trig.getAttribute("aria-expanded"),
        controls: trig.getAttribute("aria-controls"),
        visible: trig.getBoundingClientRect().width > 0,
      } : null;
      // 全头部(含 header 容器)里文本含 more 的元素,看 isMoreLabel 是否拒绝
      out.moreish = qa("header button, header summary, header [role=button]").map((b) => {
        const t = (b.textContent || "").replace(/\\s+/g, " ").trim().toLowerCase();
        const al = (b.getAttribute("aria-label") || "").toLowerCase();
        return /more|⋯|\\.\\.\\./.test(t + " " + al) ? {
          tag: b.tagName, text: t.slice(0, 40), ariaLabel: al.slice(0, 40) || null,
          isMoreLabel_text: api.isMoreLabel(t),
          isMoreLabel_aria: api.isMoreLabel(al),
        } : null;
      }).filter(Boolean);

      // 3) 预检 + 点击收割(走 userscript 原函数)
      if (trig) {
        const pre = api.findMoreMenu(trig, false);
        out.precheck = pre ? { anchors: pre.querySelectorAll("a[href]").length } : null;
        const harvested = await api.harvestMoreItems(trig);
        out.harvested = harvested.map((it) => ({ href: it.href, label: it.label }));
        // 点击后 1s 快照所有 role=menu
        trig.click && trig.click();
        await new Promise((r) => setTimeout(r, 1000));
        out.openMenus = qa("[role='menu']").map((m) => ({
          visible: m.getBoundingClientRect().width > 0 && !m.hasAttribute("hidden"),
          anchors: Array.from(m.querySelectorAll("a[href]")).map((a) => (a.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 24)),
        }));
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      }
    }

    // 4) dock 面板现状
    const dock = document.getElementById("mgga-mobile-nav-dock");
    const fab = document.getElementById("mgga-mobile-nav-dock-toggle");
    out.dockPresent = !!dock;
    out.fabPresent = !!fab;
    if (dock) {
      const links = Array.from(dock.querySelectorAll("a")).map((a) => ({
        label: (a.textContent || "").replace(/\\s+/g, " ").trim(),
        href: a.getAttribute("href"),
      })).filter((l) => l.label);
      out.dockLinks = links;
      out.dockLabels = links.map((l) => l.label);
    }

    out.mggaErrors = (window.__MGGA_BOOT_ERRORS || []);
    return out;
  })()`, { timeout: 60000 }).catch((e) => ({ evalError: String(e) }));

  fs.writeFileSync(OUT, JSON.stringify(diag, null, 2));
  log("diag written:", OUT);
  log(JSON.stringify(diag, null, 1).slice(0, 3500));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
