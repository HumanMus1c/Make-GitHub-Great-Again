const { execSync } = require("child_process");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const REPO = "https://github.com/HumanMus1c/DeepLX";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCRIPT = path.join(__dirname, "..", "Make-GitHub-Great-Again.js");
const OUT = path.join(__dirname, "diag.json");

function log(...a) { console.log("[diag]", ...a); }

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

(async () => {
  const pageScript = buildPageScript();
  log("userscript body length:", pageScript.length);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  // Tampermonkey 姒涙顓?@run-at document-end閿涙艾鐏氶悧鍥у帥鐟佸拑绱濋懘姘拱娑撹缍嬮崷?DOMContentLoaded 閸氬孩澧界悰?
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

  const diag = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const qa = (s) => Array.from(document.querySelectorAll(s));
    const out = { url: location.href, vw: innerWidth };

    const filesNav = qa("nav").find((n) => (n.getAttribute("aria-label") || "") === "Repository files");
    out.filesNavFound = !!filesNav;
    if (filesNav) {
      out.filesNavHtmlTail = filesNav.outerHTML.slice(-700);
      out.filesNavButtons = Array.from(filesNav.querySelectorAll("button, summary, [role=button]")).map((b) => ({
        tag: b.tagName,
        text: (b.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30),
        ariaLabel: b.getAttribute("aria-label"),
        haspopup: b.getAttribute("aria-haspopup"),
        expanded: b.getAttribute("aria-expanded"),
        controls: b.getAttribute("aria-controls"),
        visible: b.getBoundingClientRect().width > 0,
      }));
      out.filesNavAnchorCount = filesNav.querySelectorAll("a[href]").length;
    }

    const portal = q("anchored-position[data-target~='action-menu.overlay']");
    out.portalPresentBeforeClick = !!portal;

    const dock = q("#mgga-mobile-nav-dock");
    const fab = q("#mgga-mobile-nav-dock-toggle");
    out.dockPresent = !!dock;
    out.fabPresent = !!fab;
    if (dock) {
      const links = Array.from(dock.querySelectorAll("a")).map((a) => ({
        label: (a.textContent || "").replace(/\s+/g, " ").trim(),
        href: a.getAttribute("href"),
      })).filter((l) => l.label);
      out.dockLinks = links;
      out.dockLabels = links.map((l) => l.label);
      out.dockHasContributing = links.some((l) => /contributing/i.test(l.label));
      out.dockHasLicense = links.some((l) => /^license$/i.test(l.label));
    }

    out.mggaErrors = (window.__MGGA_BOOT_ERRORS || []);
    return out;
  });

  fs.writeFileSync(OUT, JSON.stringify(diag, null, 2));
  log("diag written:", OUT);
  log("filesNavFound:", diag.filesNavFound);
  log("dockPresent:", diag.dockPresent, "labels:", JSON.stringify(diag.dockLabels));
  log("hasContributing:", diag.dock && diag.dockHasContributing, "hasLicense:", diag.dock && diag.dockHasLicense);

  await browser.close();
  process.exit(diag.dock && diag.dockHasContributing && diag.dockHasLicense ? 0 : 2);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });







