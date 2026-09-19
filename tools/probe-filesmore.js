const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const REPO = "https://github.com/HumanMus1c/Make-GitHub-Great-Again";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = path.join(__dirname, "probe.json");

function log(...a) { console.log("[probe]", ...a); }

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800, isMobile: true, hasTouch: true });
  page.on("pageerror", (e) => log("pageerror:", String(e).slice(0, 200)));

  log("navigating:", REPO);
  await page.goto(REPO, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => document.readyState === "complete", { timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 6000));

  const result = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = { steps: [] };
    const qa = (s) => Array.from(document.querySelectorAll(s));

    const filesNav = qa("nav").find((n) => (n.getAttribute("aria-label") || "") === "Repository files");
    if (!filesNav) { out.error = "files nav not found"; return out; }
    const btn = Array.from(filesNav.querySelectorAll("button")).find((b) =>
      /^(more|more items)/i.test((b.textContent || "").replace(/\s+/g, " ").trim()));
    if (!btn) { out.error = "more button not found"; return out; }

    const snap = (tag) => {
      const portals = qa("anchored-position[data-target~='action-menu.overlay']");
      const menus = qa("[role='menu']");
      const vis = (el) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { hidden: el.hasAttribute("hidden"), display: cs.display, vis: cs.visibility,
                 w: Math.round(r.width), h: Math.round(r.height), opa: cs.opacity, popover: el.getAttribute("popover") };
      };
      const s = {
        tag,
        expanded: btn.getAttribute("aria-expanded"),
        btnVisible: btn.getBoundingClientRect().width > 0,
        btnDisplay: getComputedStyle(btn).display,
        containerDisplay: getComputedStyle(btn.parentElement).display,
        portalCount: portals.length,
        portals: portals.map((p) => ({ ...vis(p), innerAnchors: p.querySelectorAll("a[href]").length,
          labels: Array.from(p.querySelectorAll("a[href]")).map((a) => (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24)).slice(0, 6) })),
        roleMenuCount: menus.length,
        menusVis: menus.map((m) => ({ ...vis(m), anchors: m.querySelectorAll("a[href]").length })),
      };
      out.steps.push(s);
      return s;
    };

    snap("before-click");

    // 方式1: 程序化 click
    btn.click();
    await sleep(500); snap("after-click-500ms");
    await sleep(800); snap("after-click-1300ms");

    // 若仍未展开,方式2: 完整鼠标事件序列
    if (btn.getAttribute("aria-expanded") !== "true") {
      const seq = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
      for (const type of seq) {
        btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
      }
      await sleep(800); snap("after-eventseq-800ms");
    }

    // 若仍未展开,方式3: 容器先强制可见再点
    if (btn.getAttribute("aria-expanded") !== "true") {
      const cont = btn.closest("div");
      if (cont) { cont.style.setProperty("display", "block", "important"); btn.style.setProperty("display", "inline-flex", "important"); }
      await sleep(100);
      btn.click();
      await sleep(800); snap("after-forcevisible-click-800ms");
    }

    // 终态: portal 内链接明细
    const portal = qa("anchored-position[data-target~='action-menu.overlay']").pop();
    out.final = {
      expanded: btn.getAttribute("aria-expanded"),
      portalAnchors: portal ? Array.from(portal.querySelectorAll("a[href]")).map((a) => ({
        href: a.getAttribute("href"), label: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30) })) : [],
      portalHtmlHead: portal ? portal.outerHTML.slice(0, 500) : null,
    };
    return out;
  });

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  log("steps:");
  for (const s of result.steps) {
    log(` ${s.tag}: expanded=${s.expanded} btnVis=${s.btnVisible} btnDisplay=${s.btnDisplay} contDisplay=${s.containerDisplay} portals=${s.portalCount} roleMenus=${s.roleMenuCount}`);
    for (const p of s.portals) log(`   portal: ${JSON.stringify(p)}`);
    for (const m of s.menusVis) log(`   roleMenu: ${JSON.stringify(m)}`);
  }
  log("final:", JSON.stringify(result.final, null, 2).slice(0, 1200));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
