// 移动视口下枚举仓库页全部 nav 的结构:每个 nav 的 aria-label、是否在
// .js-header-wrapper 内、More 触发器(可见性)、锚点总数/隐藏数/真实 href 数,
// 用于定位登录态新版 React 仓库页"头部 nav More 收割失败"的结构特征。
"use strict";
const puppeteer = require("puppeteer-core");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const REPOS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["https://github.com/react/react", "https://github.com/vercel/next.js", "https://github.com/microsoft/vscode"];

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function isMoreLabel(t) {
  const s = String(t || "").replace(/\s+/g, " ").trim().toLowerCase();
  return /^(more|更多|더보기|もっと見る|mehr|plus|⋯|\.\.\.|more items)/i.test(s) && s.length <= 16;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=zh-CN"],
  });
  for (const repo of REPOS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 800, isMobile: true, hasTouch: true });
    await page.setUserAgent(UA);
    try {
      await page.goto(repo, { waitUntil: "domcontentloaded", timeout: 60000 });
      await new Promise((r) => setTimeout(r, 8000));
      const out = await page.evaluate((isMoreLabelSrc) => {
        const isMoreLabel = new Function("return (" + isMoreLabelSrc + ");")();
        const qa = (s) => Array.from(document.querySelectorAll(s));
        const vis = (el) => {
          if (!el) return false;
          if (el.hasAttribute("hidden")) return false;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 || r.height > 0;
        };
        return qa("nav").map((n) => {
          const triggers = qa.call(null, "button, summary, [role=button]").filter((b) => n.contains(b));
          const moreTriggers = triggers.filter((b) => {
            const label = b.getAttribute("aria-label") || (b.textContent || "").replace(/\s+/g, " ").trim();
            return isMoreLabel(label);
          });
          const anchors = Array.from(n.querySelectorAll("a[href]"));
          return {
            aria: n.getAttribute("aria-label"),
            cls: String(n.className || "").slice(0, 70),
            inHeaderWrapper: !!n.closest(".js-header-wrapper"),
            parentChain: (() => {
              let el = n, parts = [];
              for (let i = 0; i < 6 && el; i++) { parts.push(el.tagName + (el.getAttribute && el.getAttribute("class") ? "." + String(el.getAttribute("class")).split(" ")[0] : "")); el = el.parentElement; }
              return parts.join(" < ");
            })(),
            anchorsTotal: anchors.length,
            anchorsVisible: anchors.filter(vis).length,
            anchorsHidden: anchors.filter((a) => !vis(a)).length,
            anchorsRealHref: anchors.filter((a) => { const h = a.getAttribute("href"); return h && h !== "#" && !h.startsWith("javascript:"); }).length,
            moreTriggers: moreTriggers.map((b) => ({
              tag: b.tagName, text: (b.textContent || "").replace(/\s+/g, " ").trim().slice(0, 20),
              ariaLabel: b.getAttribute("aria-label"), expanded: b.getAttribute("aria-expanded"),
              visible: vis(b), display: getComputedStyle(b).display,
              controls: b.getAttribute("aria-controls"),
            })),
          };
        }).filter((n) => n.aria !== "Footer");
      }, isMoreLabel.toString());
      console.log("==== ", repo, " -> ", out.url || "");
      for (const n of out) {
        console.log(JSON.stringify(n));
      }
    } catch (e) {
      console.log("==== ", repo, " ERROR:", String(e).slice(0, 200));
    } finally {
      await page.close();
    }
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
