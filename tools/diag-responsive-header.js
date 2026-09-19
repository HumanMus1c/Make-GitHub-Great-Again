// 诊断:桌面 UA + 桌面宽度加载 → 切 Responsive 400px(不刷新)。
// 观察各导航栏 More 触发器结构与收割行为差异(桌面→缩窄重排流)。
"use strict";
const puppeteer = require("puppeteer-core");
const path = require("path");

const REPO = process.env.MGGA_PROBE_REPO || "https://github.com/react/react";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  // 桌面 UA(默认 puppeteer UA,不开 mobile)
  await page.goto(REPO, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 6000));

  const before = await page.evaluate(() => {
    const bars = [];
    document.querySelectorAll("header nav, nav").forEach((nav) => {
      if (nav.closest("footer")) return;
      const btns = [...nav.parentElement.querySelectorAll("button, summary")].filter(
        (b) => /more|menu/i.test(b.textContent || "") || /more/i.test(b.getAttribute("aria-label") || "")
      );
      bars.push({
        aria: nav.getAttribute("aria-label") || "",
        cls: String(nav.className || "").slice(0, 90),
        anchors: nav.querySelectorAll("a[href]").length,
        moreButtons: btns.map((b) => ({
          tag: b.tagName,
          text: (b.textContent || "").trim().slice(0, 20),
          ariaExpanded: b.getAttribute("aria-expanded"),
          ariaControls: b.getAttribute("aria-controls"),
          inNav: nav.contains(b),
          cls: String(b.className || "").slice(0, 60),
        })),
      });
    });
    return bars;
  });
  console.log("== 桌面 1280px 各栏 ==");
  console.log(JSON.stringify(before, null, 1));

  // 切到 Responsive 400px(不刷新)
  await page.setViewport({ width: 400, height: 800 });
  await new Promise((r) => setTimeout(r, 8000));

  const after = await page.evaluate(() => {
    const bars = [];
    document.querySelectorAll("header nav, nav").forEach((nav) => {
      if (nav.closest("footer")) return;
      const btns = [...nav.parentElement.querySelectorAll("button, summary")].filter(
        (b) => /more|menu/i.test(b.textContent || "") || /more/i.test(b.getAttribute("aria-label") || "")
      );
      bars.push({
        aria: nav.getAttribute("aria-label") || "",
        cls: String(nav.className || "").slice(0, 90),
        anchors: nav.querySelectorAll("a[href]").length,
        visibleAnchors: [...nav.querySelectorAll("a[href]")].filter(
          (a) => a.offsetParent !== null || a.getClientRects().length
        ).length,
        moreButtons: btns.map((b) => ({
          tag: b.tagName,
          text: (b.textContent || "").trim().slice(0, 20),
          ariaExpanded: b.getAttribute("aria-expanded"),
          ariaControls: b.getAttribute("aria-controls"),
          inNav: nav.contains(b),
          cls: String(b.className || "").slice(0, 60),
        })),
      });
    });
    return bars;
  });
  console.log("== 切 400px(未刷新)各栏 ==");
  console.log(JSON.stringify(after, null, 1));

  // 对每个 More 触发器:点击前后可见菜单 diff(证明菜单归属)
  const diff = await page.evaluate(async () => {
    const visibleMenus = () =>
      new Set(
        [...document.querySelectorAll("[role='menu'], details-menu, ul[data-view-component], ActionMenu, action-lists, ul")].filter(
          (m) => {
            const st = getComputedStyle(m);
            return st.display !== "none" && st.visibility !== "hidden" && m.getClientRects().length;
          }
        )
      );
    const out = [];
    const triggers = [...document.querySelectorAll("button, summary")].filter(
      (b) => /^more/i.test((b.textContent || "").trim()) || /more/i.test(b.getAttribute("aria-label") || "")
    );
    for (const t of triggers) {
      const pre = visibleMenus();
      t.click();
      let appeared = null;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 150));
        const now = visibleMenus();
        for (const m of now) if (!pre.has(m)) { appeared = m; break; }
        if (appeared) break;
      }
      const info = appeared
        ? {
            tag: appeared.tagName,
            cls: String(appeared.className || "").slice(0, 70),
            anchors: appeared.querySelectorAll("a[href]").length,
            labels: [...appeared.querySelectorAll("a[href]")].slice(0, 14).map((a) => (a.textContent || "").trim().slice(0, 22)),
            inNav: !!appeared.closest("nav"),
            portalToBody: appeared.parentElement === document.body,
          }
        : null;
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      out.push({ trigger: (t.textContent || "").trim().slice(0, 16) + "/" + String(t.className || "").slice(0, 40), menu: info });
      await new Promise((r) => setTimeout(r, 300));
    }
    return out;
  });
  console.log("== 点击后新出现菜单 diff ==");
  console.log(JSON.stringify(diff, null, 1));

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
