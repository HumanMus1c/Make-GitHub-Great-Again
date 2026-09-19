const puppeteer = require("puppeteer-core");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800, isMobile: true, hasTouch: true });
  await page.goto("https://github.com/react/react", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 8000));
  const out = await page.evaluate(() => {
    const nav = Array.from(document.querySelectorAll("nav")).find((n) => (n.getAttribute("aria-label") || "") === "Repository files");
    if (!nav) return { error: "no nav" };
    return Array.from(nav.querySelectorAll("a[href]")).map((a) => {
      const txt = (a.textContent || "").replace(/\s+/g, " ").trim();
      const cs = getComputedStyle(a);
      const r = a.getBoundingClientRect();
      const hiddenAncestor = a.closest("[hidden]") || a.closest('[aria-hidden="true"]');
      return {
        text: txt.slice(0, 30),
        dataContent: (a.querySelector("[data-content]") || {}).getAttribute ? a.querySelector("[data-content]").getAttribute("data-content") : null,
        href: a.getAttribute("href"),
        ariaCurrent: a.getAttribute("aria-current"),
        visible: r.width > 0 && cs.display !== "none",
        liHidden: !!hiddenAncestor,
        liClass: (a.closest("li") || {}).className ? a.closest("li").className.slice(0, 80) : null,
      };
    });
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
