// 移动端视口下「哪一栏的溢出项只能靠点击 More 才拿得到」的结构取证。
//
// 背景（用户报告）：脚本首次就在移动端初始化时，仍会丢失被收纳进 More
// （触发器的 aria-controls 形如 `_R_1afl_`）的项；而其它栏收纳进 More 的项
// 正常显示。判定式假设：
//   ① A 栏的溢出项是 SSR 预渲染的 DOM 副本（[data-menu-item] 或 nav 内
//      隐藏 li）⇒ 零点击即可读到 ⇒ 正常显示；
//   ② B 栏的溢出项在窄视口下**被 React 从 DOM 移除**，只存在于点击后
//      惰性挂载的菜单里 ⇒ 零点击读不到，而"零点击可得项 > 0"又把该栏挡在
//      点击收割闸门之外 ⇒ 永久丢失。
//
// 本探针把这两类分开量化：对每栏分别统计
//   zeroClick = 直扫锚点 ∪ [data-menu-item] ∪ aria-controls 目标（且目标在 nav 外）
//   clickOnly = 点开该栏 More 之后新出现的锚点（在文档中任意位置、未被上面覆盖）
//   ⇒ clickOnly 非空且 zeroClick 非空 就是"丢失"的确证。
//
// 用法：
//   node tools/probe-mobile-more-structure.js
//   node tools/probe-mobile-more-structure.js --url https://github.com/microsoft/vscode
//   node tools/probe-mobile-more-structure.js --mode desktop
//   node tools/probe-mobile-more-structure.js --width 320    # 触发剪裁溢出（实测 320px 下
//                                                            # 「Repository files」栏 3 项中 2 项被剪裁）
//   MGGA_OUT=tools/probe-more-structure.json node tools/probe-mobile-more-structure.js
"use strict";
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME =
  process.env.MGGA_CHROME ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function parseArgs(argv) {
  const o = { url: "https://github.com/iina/iina", mode: "mobile", out: "", width: 400 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--url") o.url = argv[++i];
    else if (argv[i] === "--mode") o.mode = argv[++i];
    else if (argv[i] === "--out") o.out = argv[++i];
    else if (argv[i] === "--width") o.width = Number(argv[++i]);
  }
  return o;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SNAPSHOT = () => {
  const qa = (s, root) => Array.from((root || document).querySelectorAll(s));
  const vis = (el) => {
    if (!el) return false;
    if (el.hasAttribute("hidden")) return false;
    if (el.closest("[hidden]")) return false;
    let cs;
    try {
      cs = getComputedStyle(el);
    } catch (e) {
      return false;
    }
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  };
  const anchorInfo = (a) => {
    const clone = a.cloneNode(true);
    clone.querySelectorAll("span[id], [class*='VisuallyHidden']").forEach((e) => e.remove());
    return {
      href: a.getAttribute("href"),
      aria: a.getAttribute("aria-label"),
      text: (clone.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
      visible: vis(a),
      inHiddenLi: !!(a.closest("li") && a.closest("li").hasAttribute("hidden")),
      menuItem: !!(a.closest("[data-menu-item]") || a.hasAttribute("data-menu-item")),
    };
  };

  const bars = qa("nav")
    .filter((n) => !n.closest("footer"))
    .map((n) => {
      const anchors = qa("a[href]", n);
      const buttons = qa("button, summary, [role=button]", n);
      const ctrls = buttons
        .filter((b) => b.getAttribute("aria-controls"))
        .map((b) => {
          const id = b.getAttribute("aria-controls");
          const t = document.getElementById(id);
          return {
            tag: b.tagName,
            text: (b.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24),
            ariaLabel: b.getAttribute("aria-label"),
            expanded: b.getAttribute("aria-expanded"),
            visible: vis(b),
            controls: id,
            targetExists: !!t,
            targetInBar: !!t && n.contains(t),
            targetAnchors: t ? qa("a[href]", t).length : 0,
            targetHost: t
              ? t.tagName +
                (t.id ? "#" + t.id : "") +
                "." +
                String(t.className || "").split(/\s+/)[0]
              : null,
          };
        });
      return {
        aria: n.getAttribute("aria-label"),
        cls: String(n.className || "").slice(0, 80),
        inNarrowChrome: !!n.closest("[class*='show-whenNarrow']"),
        overflowMode: n.getAttribute("data-overflow-mode"),
        anchors: anchors.map(anchorInfo),
        anchorCount: anchors.length,
        visibleAnchorCount: anchors.filter((a) => vis(a)).length,
        menuItemCount: qa("[data-menu-item]", n).length,
        ariaHiddenAnchorCount: anchors.filter((a) => !!a.closest('[aria-hidden="true"]')).length,
        // Primer UnderlineNav 剪裁项：li[aria-hidden="true"] 内的唯一锚点 ——
        // 这类项本体仍在 DOM 里、href 完整，只是被标成"当前不可见"
        clippedItemAnchors: anchors
          .filter((a) => {
            const h = a.closest('[aria-hidden="true"]');
            return h && h.tagName === "LI" && h.querySelectorAll("a[href]").length === 1;
          })
          .map(anchorInfo),
        controls: ctrls,
      };
    });

  // 文档级：nav 之外的、id 形如 React useId（_R_xxx_）的 portal 容器
  const portals = qa("[id^='_R_']")
    .filter((el) => !el.closest("nav"))
    .map((el) => ({
      id: el.id,
      host: el.tagName + "." + String(el.className || "").split(/\s+/)[0],
      anchorCount: qa("a[href]", el).length,
      visible: vis(el),
      hiddenAttr: el.hasAttribute("hidden"),
    }));

  return {
    vw: window.innerWidth,
    ua: navigator.userAgent.includes("Mobile") ? "mobile" : "desktop",
    navCount: bars.length,
    navLabels: bars.map((b) => b.aria),
    bars,
    reactIdPortalsOutsideNav: portals,
    // 全文档所有 _R_ id（含 nav 内），便于看 aria-controls 目标究竟挂在哪
    allReactIds: qa("[id^='_R_']").map((el) => ({
      id: el.id,
      inNav: !!el.closest("nav"),
      tag: el.tagName,
    })),
  };
};

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--ignore-certificate-errors",
      "--lang=zh-CN",
    ],
  });
  const page = await browser.newPage();
  if (opts.mode === "mobile") {
    await page.setViewport({
      width: opts.width || 400,
      height: 800,
      isMobile: true,
      hasTouch: true,
    });
    await page.setUserAgent(UA_MOBILE);
  } else {
    await page.setViewport({ width: opts.width && opts.width > 600 ? opts.width : 1280, height: 900 });
  }
  await page.goto(opts.url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => !!document.querySelector("nav"), { timeout: 60000 });
  await sleep(7000);

  // === 阶段 1：零点击快照 ===
  const before = await page.evaluate(SNAPSHOT);

  // === 阶段 2：逐栏点开 More，记录"点击后才能拿到"的锚点 ===
  const opened = [];
  for (let i = 0; i < before.bars.length; i++) {
    const bar = before.bars[i];
    const triggerSel = bar.controls.length
      ? null
      : null;
    void triggerSel;
    const info = await page.evaluate(
      async (idx) => {
        const nav = Array.from(document.querySelectorAll("nav")).filter(
          (n) => !n.closest("footer")
        )[idx];
        if (!nav) return { skipped: "no-nav" };
        const key = (a) => (a.getAttribute("href") || "") + "|" + (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
        const seen0 = new Set(Array.from(document.querySelectorAll("a[href]")).map(key));
        // 找该栏的 More 触发器：aria-controls 或 more 文案
        const cands = Array.from(nav.querySelectorAll("button, summary, [role=button]"));
        const isMoreish = (b) => {
          const t = (
            (b.getAttribute("aria-label") || "") + " " + (b.textContent || "")
          )
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
          return /^(more|more items|⋯|\.\.\.|\.\.\.$)/.test(t) || /more/.test(t);
        };
        const trig =
          cands.find((b) => b.getAttribute("aria-controls") && isMoreish(b)) ||
          cands.find((b) => isMoreish(b)) ||
          null;
        if (!trig) return { skipped: "no-more-trigger", buttons: cands.length };
        const cs = getComputedStyle(trig);
        if (cs.display === "none" || cs.visibility === "hidden") {
          return { skipped: "trigger-hidden" };
        }
        try {
          trig.click();
        } catch (e) {
          return { skipped: "click-threw: " + String(e).slice(0, 80) };
        }
        await new Promise((r) => setTimeout(r, 1200));
        const news = Array.from(document.querySelectorAll("a[href]"))
          .filter((a) => !seen0.has(key(a)))
          .map((a) => {
            const t = a.closest("[role='menu'], [data-testid], [id^='_R_']");
            return {
              href: a.getAttribute("href"),
              text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
              container: t
                ? t.tagName + (t.id ? "#" + t.id : "") + "." + String(t.className || "").split(/\s+/)[0]
                : "(无容器)",
            };
          });
        const openedNow = trig.getAttribute("aria-expanded");
        // 关闭（Escape，避免影响下一栏）
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        trig.click();
        await new Promise((r) => setTimeout(r, 400));
        return {
          trigger: {
            tag: trig.tagName,
            text: (trig.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24),
            ariaLabel: trig.getAttribute("aria-label"),
            controls: trig.getAttribute("aria-controls"),
            expandedAfterClick: openedNow,
          },
          newAnchorsAfterClick: news,
        };
      },
      i
    );
    opened.push({ barAria: before.bars[i].aria, ...info });
  }

  const after = await page.evaluate(SNAPSHOT);
  const out = {
    url: opts.url,
    mode: opts.mode,
    before,
    clickProbe: opened,
    after,
  };
  const OUT =
    opts.out ||
    process.env.MGGA_OUT ||
    // 默认落在不入库的 .workbuddy/probe/（tools/ 是入库目录，别往里写产物）
    path.join(__dirname, "..", ".workbuddy", "probe", "probe-more-structure.json");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log("wrote " + OUT + "\n");

  console.log("== 栏概览（" + before.navLabels.length + " 栏）");
  before.bars.forEach((b) => {
    console.log(
      `- "${b.aria}" anchors=${b.anchorCount} visible=${b.visibleAnchorCount} ` +
        `menuItem=${b.menuItemCount} ariaHidden=${b.ariaHiddenAnchorCount} ` +
        `overflow=${b.overflowMode || "-"} narrow=${b.inNarrowChrome}`
    );
    b.controls.forEach((c) => {
      console.log(
        `    ctrl[${c.tag}] "${(c.text || c.ariaLabel || "?").slice(0, 18)}" controls=${c.controls} ` +
          `targetExists=${c.targetExists} inBar=${c.targetInBar} targetAnchors=${c.targetAnchors} host=${c.targetHost}`
      );
    });
  });
  console.log("\n== 点击 More 后新出现的锚点（= 只能靠点击拿到）");
  opened.forEach((o) => {
    if (o.skipped) {
      console.log(`- "${o.barAria}" skipped=${o.skipped}`);
      return;
    }
    console.log(
      `- "${o.barAria}" trigger="${o.trigger.text || o.trigger.ariaLabel || "?"}" controls=${
        o.trigger.controls
      } new=${o.newAnchorsAfterClick.length}`
    );
    o.newAnchorsAfterClick.slice(0, 20).forEach((n) => {
      console.log(`    + "${n.text}" ${n.href}  <- ${n.container}`);
    });
  });
  console.log("\n== nav 之外的 React id 容器（可能的 portal）");
  before.reactIdPortalsOutsideNav.forEach((p) => {
    console.log(`- #${p.id} ${p.host} anchors=${p.anchorCount} visible=${p.visible} hidden=${p.hiddenAttr}`);
  });
  await browser.close();
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
