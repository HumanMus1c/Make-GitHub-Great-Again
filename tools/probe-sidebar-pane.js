// 侧栏「PaneWrapper 归属」探针:双视口(移动 400 / 桌面 1280)在真实 GitHub
// 仓库页上核验 —— 用户给的容器
//   #repos-split-pane-content > div > div > div > div.prc-PageLayout-PaneWrapper-pHPop.pr-2
// 是否命中,以及 Releases / Sponsor this project / Deployments / Packages /
// Used by / Contributors / Languages 这些侧栏区块是否位于其内部、是否包在
// <nav> 里(nav-dock 的"栏"判定只看 <nav>)、各自标题的实际文本(含计数)、
// 以及 CSS 可见性(hide-sm hide-md 之类的响应式行为)。
//
// 用法: node tools/probe-sidebar-pane.js [repo ...]
// 输出: tools/probe-sidebar-pane.json
"use strict";
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const SEL =
  "#repos-split-pane-content > div > div > div > div.prc-PageLayout-PaneWrapper-pHPop.pr-2";

const REPOS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["https://github.com/iina/iina"];

const VIEWPORTS = [
  { name: "mobile-400", width: 400, height: 800, isMobile: true, hasTouch: true, ua: UA_MOBILE },
  { name: "desktop-1280", width: 1280, height: 900, isMobile: false, hasTouch: false, ua: null },
];

const IN_PAGE = (sel) => {
  const T = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
  const q = (s, root) => Array.from((root || document).querySelectorAll(s));
  const vis = (el) => {
    if (!el) return false;
    if (el.hasAttribute("hidden")) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const chainOf = (el, stopAt) => {
    const parts = [];
    let p = el;
    let depth = 0;
    while (p && depth < 40) {
      parts.push(
        p.tagName.toLowerCase() +
          (p.id ? "#" + p.id : "") +
          (p.getAttribute && p.getAttribute("class")
            ? "." + String(p.getAttribute("class")).split(/\s+/)[0]
            : "")
      );
      if (stopAt && p === stopAt) break;
      p = p.parentElement;
      depth++;
    }
    return parts;
  };

  const content = document.getElementById("repos-split-pane-content");
  const hits = document.querySelectorAll(sel);
  const hit = hits.length ? hits[0] : null;
  const anyWrap = content
    ? Array.from(content.querySelectorAll('[class*="PageLayout-PaneWrapper"]'))
    : [];

  // 侧栏区块
  const sections = q('div[class*="SidebarSection-module__sidebarSection"]').map((s) => {
    const h = s.querySelector("h1,h2,h3,h4,summary");
    const wrapper = s.querySelector('[class*="headingLinkWrapper"]');
    // 可见标签 = a/span 里跑出来的纯名(不含计数)
    const nameEl = wrapper ? wrapper.querySelector("a") || wrapper.querySelector("span") : h;
    const counter = wrapper ? wrapper.querySelector('[class*="CounterLabel"]') : null;
    const nav = s.closest("nav");
    return {
      headingText: h ? T(h) : null,
      labelOnly: nameEl ? T(nameEl) : null,
      counter: counter ? T(counter) : null,
      inExactSelector: !!(hit && hit.contains(s)),
      inAnyPaneWrapper: anyWrap.some((w) => w.contains(s)),
      inNav: !!nav,
      navAria: nav ? nav.getAttribute("aria-label") : null,
      visible: vis(s),
      classes: String(s.className || ""),
      offsetTop: Math.round(s.getBoundingClientRect().top + window.scrollY),
      docLeft: Math.round(s.getBoundingClientRect().left),
      docWidth: Math.round(s.getBoundingClientRect().width),
    };
  });

  return {
    url: location.href,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    hasContent: !!content,
    exactSelectorHits: hits.length,
    exactSelectorChain: hit ? chainOf(hit, document.documentElement).join(" < ") : null,
    exactSelectorDepthBelowContent: (() => {
      if (!hit || !content) return -1;
      let p = hit;
      let d = 0;
      while (p && p !== content) {
        p = p.parentElement;
        d++;
        if (d > 30) return -1;
      }
      return p === content ? d : -1;
    })(),
    anyPaneWrapperCount: anyWrap.length,
    anyPaneWrapperChain: anyWrap.length ? chainOf(anyWrap[0], document.documentElement).join(" < ") : null,
    paneTextPreview: anyWrap.length ? T(anyWrap[0]).slice(0, 160) : null,
    sections,
    navCount: q("nav").length,
    navs: q("nav").map((n) => ({
      aria: n.getAttribute("aria-label"),
      anchors: n.querySelectorAll("a[href]").length,
      inPaneWrapper: anyWrap.some((w) => w.contains(n)),
      visible: vis(n),
    })),
  };
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--ignore-certificate-errors", "--lang=en-US"],
  });
  const report = [];
  try {
    for (const repo of REPOS) {
      for (const vp of VIEWPORTS) {
        const page = await browser.newPage();
        await page.setViewport({
          width: vp.width,
          height: vp.height,
          isMobile: vp.isMobile,
          hasTouch: vp.hasTouch,
        });
        if (vp.ua) await page.setUserAgent(vp.ua);
        const label = repo + "  [" + vp.name + "]";
        try {
          await page.goto(repo, { waitUntil: "domcontentloaded", timeout: 90000 });
          await new Promise((r) => setTimeout(r, 9000));
          const out = await page.evaluate(IN_PAGE, SEL);
          report.push({ repo, viewport: vp.name, ...out });

          console.log("\n===== " + label + " =====");
          console.log(
            "  精确选择器命中=" +
              out.exactSelectorHits +
              "  content→PaneWrapper 深度=" +
              out.exactSelectorDepthBelowContent +
              "  任意 PaneWrapper=" +
              out.anyPaneWrapperCount
          );
          console.log("  nav 总数=" + out.navCount + "（PaneWrapper 内 nav=" +
            out.navs.filter((n) => n.inPaneWrapper).length + "）");
          console.log("  侧栏区块（" + out.sections.length + "）:");
          out.sections.forEach((s) => {
            console.log(
              "    - " +
                String(s.labelOnly || s.headingText).padEnd(22) +
                " 计数=" +
                String(s.counter || "-").padEnd(6) +
                " 在精确容器内=" +
                (s.inExactSelector ? "Y" : "N") +
                " inNav=" +
                (s.inNav ? "Y" : "N") +
                " 可见=" +
                (s.visible ? "Y" : "N") +
                " 类=" +
                s.classes.split(/\s+/).slice(1).join("|")
            );
          });
        } catch (e) {
          console.log("\n===== " + label + " =====\n  FAIL: " + e.message);
          report.push({ repo, viewport: vp.name, error: String(e.message) });
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  const outFile = path.join(__dirname, "probe-sidebar-pane.json");
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");
  console.log("\nJSON 已写入 " + outFile);
})();
