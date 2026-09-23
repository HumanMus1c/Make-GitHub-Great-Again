// 真机验证：用本机 Chrome + puppeteer-core 打开**真实 GitHub 仓库页**，
// 把主脚本注入页面，然后按用户报告的场景逐条点 dock 面板并断言。
//
// 为什么要走 page.evaluate(字符串) 注入而不是 addScriptTag：
//   GitHub 的 CSP 是 `script-src github.githubassets.com 'sha256-…'`，往页面里
//   插 <script> 元素会被直接拒绝（实测 "Executing inline script violates…"）。
//   page.evaluate 走 CDP Runtime.evaluate，与 DevTools 控制台同级，不受页面 CSP 约束。
//
// 用法：
//   node tools/verify-live-navdock.js                       # 默认 iina/iina 移动视口（400px）
//   node tools/verify-live-navdock.js --mode desktop
//   node tools/verify-live-navdock.js --url https://github.com/microsoft/vscode
//   node tools/verify-live-navdock.js --width 320           # 复现 Primer 剪裁（折进 More）
//   node tools/verify-live-navdock.js --json .workbuddy/probe/live-verify.json
//
// 环境变量：MGGA_CHROME 覆盖浏览器路径；
//           MGGA_SCRIPT 覆盖被测脚本（红绿对照：喂给修复前版本应必然失败）。
"use strict";
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME =
  process.env.MGGA_CHROME ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCRIPT = process.env.MGGA_SCRIPT
  ? path.resolve(process.env.MGGA_SCRIPT)
  : path.join(__dirname, "..", "Make-GitHub-Great-Again.js");
const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/** GM_* 打桩：@grant 的那几个 API 在纯页面上下文里不存在，用 sessionStorage 兑底 */
const GM_STUB = `
(function () {
  try {
    var KEY = "__mgga_gm_store";
    var store = {};
    try { store = JSON.parse(sessionStorage.getItem(KEY) || "{}") || {}; } catch (e) { store = {}; }
    window.GM_addStyle = function (css) {
      var s = document.createElement("style");
      s.textContent = String(css);
      (document.head || document.documentElement).appendChild(s);
      return s;
    };
    window.GM_registerMenuCommand = function () { return 1; };
    window.GM_getValue = function (k, d) {
      return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : d;
    };
    window.GM_setValue = function (k, v) {
      store[k] = v;
      try { sessionStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
    };
    window.GM_notification = function () {};
    // 文档身份：整页重载 / 硬导航必然换新 document ⇒ 新随机 id。
    // 比 page.on('load') 可靠 —— load 事件子框架也会发（实测桌面视口误报过一次）。
    window.__mggaDocId = String(Math.random()).slice(2);
  } catch (e) { /* ignore */ }
})();
`;

function parseArgs(argv) {
  const o = { url: "https://github.com/iina/iina", mode: "mobile", json: "", width: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") o.url = argv[++i];
    else if (a === "--mode") o.mode = argv[++i];
    else if (a === "--json") o.json = argv[++i];
    else if (a === "--width") o.width = Number(argv[++i]) || 0;
  }
  return o;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 找到 dock 面板里 aria-label 匹配的条目（面板可能被重建，每次都重新查） */
const FIND_ITEM = (label) => {
  const panel = document.getElementById("mgga-nav-dock");
  if (!panel) return null;
  const want = String(label).toLowerCase();
  return (
    Array.from(panel.querySelectorAll("a")).find(
      (a) => String(a.getAttribute("aria-label") || "").toLowerCase() === want
    ) || null
  );
};

/** 页面几何 + 状态快照 */
const MEASURE = () => {
  const art = document.querySelector(
    "#repos-split-pane-content article.markdown-body, " +
      "#repos-split-pane-content .markdown-body, " +
      "#repo-content-pjax-container article.markdown-body.entry-content"
  );
  const root = document.getElementById("repos-split-pane-content");
  const panel = document.getElementById("mgga-nav-dock");
  const r = (el) => (el ? Math.round(el.getBoundingClientRect().top) : null);
  const doc = document.documentElement;
  // 固定/粘性顶栏实测：解释 off= 为何是 0，也验证"吸顶"是否真的被顶栏遮住
  const stickyBars = [];
  document
    .querySelectorAll(
      "header, [class*='js-header-wrapper'], [data-testid='repository-container-header']"
    )
    .forEach((el) => {
      let cs;
      try {
        cs = getComputedStyle(el);
      } catch (e) {
        return;
      }
      if (cs.position !== "fixed" && cs.position !== "sticky") return;
      const rr = el.getBoundingClientRect();
      if (rr.height <= 0) return;
      stickyBars.push({
        cls: String(el.className || "").slice(0, 48),
        position: cs.position,
        top: Math.round(rr.top),
        bottom: Math.round(rr.bottom),
      });
    });
  return {
    href: location.href,
    pathname: location.pathname,
    search: location.search,
    scrollY: Math.round(window.scrollY || 0),
    maxScroll: Math.max(0, doc.scrollHeight - window.innerHeight),
    articleTop: r(art),
    rootTop: r(root),
    stickyBars,
    panelExpanded: panel ? panel.className.indexOf("mgga-visible") >= 0 : null,
    panelItemCount: panel ? panel.querySelectorAll("a").length : 0,
    tabParam: new URLSearchParams(location.search).get("tab"),
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
    await page.setViewport({ width: opts.width || 1280, height: 900 });
  }

  /** 整页加载计数：Turbo 软导航不会触发 load，用它区分"重载"与"软切换" */
  let loadCount = 0;
  const frameUrls = [];
  page.on("load", () => loadCount++);
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) frameUrls.push(f.url());
  });
  const logs = [];
  page.on("console", (m) => logs.push({ type: m.type(), text: m.text(), at: Date.now() }));
  page.on("pageerror", (e) => logs.push({ type: "pageerror", text: e.message, at: Date.now() }));

  await page.evaluateOnNewDocument(GM_STUB);
  await page.goto(opts.url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => !!document.querySelector("nav"), { timeout: 60000 });
  await sleep(7000);

  const scriptBody = fs.readFileSync(SCRIPT, "utf8");
  // 探针需要**直接调用**脚本内部的判定函数（它们都在 IIFE 闭包里），所以在
  // 闭包出口前把判定函数挂到 window 上。只影响本地验证，交付物不改。
  const instrumented = scriptBody.replace(
    /\n\}\)\(\);\s*$/,
    "\n  try {\n" +
      "    window.__mggaProbe = { navDockSourceVisibility, navDockAnchorLabel };\n" +
      "  } catch (e) {}\n})();\n"
  );
  const usedProbe = instrumented !== scriptBody;
  await page.evaluate(instrumented);
  await page.waitForFunction(
    () => !!document.getElementById("mgga-nav-dock-toggle"),
    { timeout: 40000 }
  );
  await sleep(6000);

  // 展开面板（真实鼠标点悬浮球）
  if (!(await page.evaluate(() => {
    const p = document.getElementById("mgga-nav-dock");
    return !!p && p.className.indexOf("mgga-visible") >= 0;
  }))) {
    await page.click("#mgga-nav-dock-toggle");
    await sleep(700);
  }

  const results = [];
  const record = (name, pass, detail) => {
    results.push({ name, pass: !!pass, detail });
    console.log((pass ? "PASS  " : "FAIL  ") + name + "  " + detail);
  };

  // === 可选诊断（MGGA_DIAG=1）：点击到底命中谁、最终有没有被 preventDefault ===
  // 只有"不接管"（放行为真实 href、靠 Turbo 软导航）的条目才依赖默认行为，
  // 一旦默认被谁拦掉，表现就是"点了没反应"。window 的冒泡监听是最后一个看到
  // 事件的，此时 e.defaultPrevented 已是终值。
  const DIAG = process.env.MGGA_DIAG === "1";
  if (DIAG) {
    await page.evaluate(() => {
      window.__mggaClicks = [];
      window.__mggaHits = [];
      const desc = (el) => {
        if (!el) return "null";
        let s = (el.tagName || "").toLowerCase();
        if (el.id) s += "#" + el.id;
        const cls = typeof el.className === "string" ? el.className.split(/\s+/)[0] : "";
        if (cls) s += "." + cls;
        const al = el.getAttribute && el.getAttribute("aria-label");
        if (al) s += "[al=" + al + "]";
        return s;
      };
      window.__mggaHitDesc = desc;
      window.addEventListener(
        "click",
        (e) => {
          const t = e.target;
          const a = t && t.closest ? t.closest("a") : null;
          const rec = {
            at: Date.now(),
            target: desc(t),
            anchorHref: a ? a.getAttribute("href") : null,
            inPanel: !!(t && t.closest && t.closest("#mgga-nav-dock")),
            // 合成点击的来源定位：这条锚点在页面哪个 nav 里（判断是谁在回放）
            navOf: a && a.closest ? (a.closest("nav") ? a.closest("nav").getAttribute("aria-label") || "(nav 无 label)" : "(不在 nav 内)") : null,
            prevented: null,
            trusted: e.isTrusted,
          };
          window.__mggaClicks.push(rec);
          // 冒泡到底之后再读，defaultPrevented 才是终值
          setTimeout(() => {
            rec.prevented = e.defaultPrevented;
          }, 0);
        },
        false
      );
    });
  }

  /** 点一个 dock 条目：能用真实鼠标就用，定位不到则回退合成点击 */
  const clickItem = async (label) => {
    const box = await page.evaluate((l) => {
      const a = (function () {
        const panel = document.getElementById("mgga-nav-dock");
        if (!panel) return null;
        const want = String(l).toLowerCase();
        return Array.from(panel.querySelectorAll("a")).find(
          (x) => String(x.getAttribute("aria-label") || "").toLowerCase() === want
        ) || null;
      })();
      if (!a) return null;
      const r = a.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    }, label);
    if (box && box.w > 0 && box.h > 0 && box.y > 0 && box.y < 1000) {
      if (DIAG) {
        await page.evaluate(
          (b) => {
            const el = document.elementFromPoint(b.x, b.y);
            window.__mggaHits.push({
              label: b.label,
              wanted: b.label,
              x: Math.round(b.x),
              y: Math.round(b.y),
              hit: window.__mggaHitDesc(el),
              hitInPanel: !!(el && el.closest && el.closest("#mgga-nav-dock")),
              hitIsWanted:
                !!(el && el.closest && el.closest("a") &&
                   String((el.closest("a").getAttribute("aria-label") || "")).toLowerCase() ===
                     String(b.label).toLowerCase()),
            });
          },
          { x: box.x, y: box.y, label }
        );
      }
      await page.mouse.click(box.x, box.y);
      return "mouse";
    }
    const ok = await page.evaluate((l) => {
      const panel = document.getElementById("mgga-nav-dock");
      if (!panel) return false;
      const want = String(l).toLowerCase();
      const a = Array.from(panel.querySelectorAll("a")).find(
        (x) => String(x.getAttribute("aria-label") || "").toLowerCase() === want
      );
      if (!a) return false;
      a.click();
      return true;
    }, label);
    return ok ? "synthetic" : "missing";
  };

  /** 按模式取面板里真实的标签名（各仓库 tab 命名不同：License vs "MIT license"） */
  const pickLabel = (pattern) =>
    page.evaluate((src) => {
      const r = new RegExp(src, "i");
      const panel = document.getElementById("mgga-nav-dock");
      if (!panel) return null;
      const a = Array.from(panel.querySelectorAll("a")).find((x) =>
        r.test(x.getAttribute("aria-label") || "")
      );
      return a ? a.getAttribute("aria-label") || "" : null;
    }, pattern);

  /** 当前 document 的身份标识：整页重载会换新值 */
  const readDocId = () => page.evaluate(() => window.__mggaDocId || "");

  /** 抓取 since 之内的 locate 日志行（脚本自带的取证埋点） */
  const locateLines = (since) =>
    logs
      .slice(since)
      .filter((l) => /nav dock: locate/.test(l.text))
      .map((l) => l.text);

  /** 从 locate 行里解析通过路径 */
  const parseLocate = (line) => {
    const m = /locate "([^"]*)" via=([^\s]+)(.*)$/.exec(line);
    if (!m) return null;
    const rest = m[3] || "";
    const num = (k) => {
      const mm = new RegExp("(?:^|\\s)" + k + "=(-?\\d+)").exec(rest);
      return mm ? Number(mm[1]) : null;
    };
    return {
      label: m[1],
      via: m[2],
      id: (/"id="([^"]*)"/.exec(line) || [])[1] || "",
      top: num("top"),
      y: num("y"),
      off: num("off"),
      elTop: num("elTop"),
      inner: num("inner"),
      href: (/"href="([^"]*)"/.exec(line) || [])[1] || "",
    };
  };

  // ============ 场景 0：基线结构 ============
  const base = await page.evaluate(() => {
    const panel = document.getElementById("mgga-nav-dock");
    const items = panel
      ? Array.from(panel.querySelectorAll("a")).map((a) => ({
          label: a.getAttribute("aria-label") || "",
          href: a.getAttribute("href") || "",
        }))
      : [];
    const navs = Array.from(document.querySelectorAll("nav")).map(
      (n) => n.getAttribute("aria-label") || ""
    );
    return { items, navs };
  });
  const baseLabels = base.items.map((i) => i.label);
  const uniq = new Set(base.items.map((i) => i.label));
  record(
    "0.1 面板条目非空且无空标签",
    base.items.length > 0 && base.items.every((i) => i.label),
    "items=" + base.items.length + " labels=" + JSON.stringify(baseLabels)
  );
  record(
    "0.2 无重复 tab（同标签只出现一次）",
    uniq.size === base.items.length,
    "unique=" + uniq.size + "/" + base.items.length
  );
  record(
    "0.3 无面包屑/picker 泄漏（nav 清单里无 Breadcrumbs）",
    base.navs.indexOf("Breadcrumbs") < 0,
    "navs=" + JSON.stringify(base.navs)
  );
  const baseDocId = await readDocId();
  console.log(
    "INFO  0.4 基线文档标识 docId=" + baseDocId + "（整页重载会换新值，本工具用它判『重载』）"
  );

  /** 页面 nav 入口的可见性真值（0.8 采集），后面的场景据此选期望分支 */
  let pageVis = [];

  // ============ 场景 0.8：页面外露探测（本轮新增的分诊依据）============
  // 「页面上这一项还在不在、有没有被收纳进 More」直接调用脚本内部的判定函数
  // 取真值 —— 比肉眼猜可靠，也能证明这个判定**不是恒值**（同一栏在不同视口
  // 下既有 exposed 也有 more）。四类返回：exposed / more / gone / detached。
  if (usedProbe) {
    // 探针可用性以**页面里函数真实存在**为准：旧版脚本没有这个判定函数，
    // 硬调会抛错并中断整轮验证（红绿对照时正需要它能跑完并如实记 FAIL）
    const probeOk = await page.evaluate(
      () =>
        !!(window.__mggaProbe &&
          typeof window.__mggaProbe.navDockSourceVisibility === "function")
    );
    const vis = probeOk
      ? await page.evaluate(() => {
          const P = window.__mggaProbe;
          const out = [];
          document.querySelectorAll("nav a[href]").forEach((a) => {
            if (a.closest("#mgga-nav-dock")) return;
            const bar = a.closest("nav");
            out.push({
              label: P.navDockAnchorLabel(a),
              bar: bar ? bar.getAttribute("aria-label") || "" : "",
              state: P.navDockSourceVisibility({ source: a }).state,
            });
          });
          return out;
        })
      : [];
    pageVis = vis;
    const byState = {};
    const byBar = {};
    vis.forEach((v) => {
      byState[v.state] = (byState[v.state] || 0) + 1;
      const k = (v.bar || "(无 label)") + " → " + v.state;
      byBar[k] = (byBar[k] || 0) + 1;
    });
    console.log("INFO  0.8 页面 nav 入口可见性统计：" + JSON.stringify(byState));
    console.log("INFO  0.85 按栏细分：" + JSON.stringify(byBar));
    console.log(
      "INFO  0.86 剪裁样本（折进 More）：" +
        JSON.stringify(
          vis.filter((v) => v.state === "more").slice(0, 8).map((v) => v.label)
        )
    );
    record(
      "0.8 外露探测可用：页面上存在被判定为 exposed 的入口",
      probeOk && (byState.exposed || 0) > 0,
      "exposed=" + (byState.exposed || 0) + " more=" + (byState.more || 0) +
        " gone=" + (byState.gone || 0) + " detached=" + (byState.detached || 0) +
        " total=" + vis.length + (probeOk ? "" : "（判定函数未注入）")
    );
  } else {
    record("0.8 探针注入成功（可直调内部判定函数）", false, "instrumented === scriptBody");
  }

  /**
   * 通用定位场景：卷到页中 → 点条目 → 三段断言。
   * ① 无整页重载（load 计数不变）且未离开仓库页；
   * ② 目标吸顶 —— 用脚本自己的埋点自证 `y == top`（期望 scrollTop 已达成）
   *    且 `elTop ≈ 0`（目标实测落在视口顶）。**不能用 `scrollY == 0`**：内容根
   *    容器 `#repos-split-pane-content` 本身就在文档 171px 处，"回到内容顶部"
   *    对应的 scrollY 就是 171 而不是 0（第一版断言在此误报，已修正）。
   * ③ 走了预期分支（via=）。
   */
  const locateScenario = async (
    tag,
    label,
    expectVia,
    expectNoLocate,
    expectUrlChanged,
    waitMs
  ) => {
    await page.evaluate(() => window.scrollTo(0, 600));
    await sleep(400);
    const mark = logs.length;
    const loadsBefore = loadCount;
    const docBefore = await readDocId();
    const urlBefore = await page.evaluate(() => location.href);
    const basePath = new URL(opts.url).pathname.replace(/\/+$/, "");
    const how = await clickItem(label);
    await sleep(waitMs || 2600);
    const m = await page.evaluate(MEASURE);
    const docAfter = await readDocId();
    const parsed = locateLines(mark).map(parseLocate).filter(Boolean);
    const mine = parsed.filter((l) => l.label.toLowerCase() === label.toLowerCase());
    const last = mine[mine.length - 1] || null;
    const noReload = docBefore === docAfter;
    const samePath = m.pathname.replace(/\/+$/, "") === basePath;
    record(
      tag + ".1 点 " + label + "：无整页重载" +
        (expectUrlChanged ? "（放行导航，允许换路径）" : "且未离开仓库页"),
      noReload && (expectUrlChanged || samePath),
      "docId=" + docBefore + "->" + docAfter + " loads=" + loadsBefore + "->" + loadCount +
        " url=" + m.pathname + m.search + " click=" + how
    );
    if (expectNoLocate) {
      // 判据是"有没有**真的滚动定位**"，不是"有没有日志"：放行分支自己也会留
      // 一条决策日志（via=*-hidden / pass-through / same-page-cleartab），
      // 那些日志的实测值恒为 null（logNavDockLocate 收到 m=null）。
      const located = parsed.filter((p) => p.top !== null);
      record(
        tag + ".2 点 " + label + "：页面上已无可见落点 ⇒ 一次定位都不做",
        located.length === 0,
        located.length
          ? "仍有定位：" + JSON.stringify(located.map((p) => p.via))
          : "零定位（决策 via=" +
            (parsed.map((p) => p.via).join(",") || "无日志") + "）"
      );
      if (expectUrlChanged) {
        record(
          tag + ".4 放行后确实跳走了（落到该项自己的目的地）",
          m.href !== urlBefore,
          urlBefore + "  ->  " + m.href
        );
      }
    } else {
      const pinned =
        !!last &&
        last.top !== null && last.y !== null && Math.abs(last.y - last.top) <= 12 &&
        last.elTop !== null && Math.abs(last.elTop) <= 8;
      record(
        tag + ".2 点 " + label + "：目标吸顶（y==top 且 elTop≈0）",
        pinned,
        last
          ? "via=" + last.via + " top=" + last.top + " y=" + last.y + " off=" + last.off +
            " elTop=" + last.elTop + " inner=" + last.inner
          : "no locate log"
      );
    }
    if (expectVia) {
      record(
        tag + ".3 点 " + label + "：走 " + expectVia.join("/") + " 分支",
        !!last && expectVia.indexOf(last.via) >= 0,
        last ? "via=" + last.via : "no locate log"
      );
    }
    return { m, last };
  };

  const FILE_TAB_VIA = ["file-tab", "file-tab-await"];

  /**
   * 条目在**页面上**的可见性（多来源取"最可见"的那个）：面板里同名的入口
   * 可能既有外露的那份（Repository 栏）也有 SSR 直出的隐藏副本，只要有一份
   * 外露，用户就看得见 ⇒ 期望"定位"而非"放行导航"。
   */
  const pageStateOf = (label) => {
    const hit = (pageVis || []).filter(
      (v) => String(v.label || "").toLowerCase() === String(label || "").toLowerCase()
    );
    if (!hit.length) return "unknown";
    if (hit.some((v) => v.state === "exposed")) return "exposed";
    return hit[0].state;
  };

  // ============ 场景 0.7：仓库侧栏区块（PaneWrapper 内的 borderGrid）============
  // 期望值直接**从真实 DOM 现算**，不写死标签：各仓库区块命名与存在性都不同
  // （iina 有 Sponsor this project，vscode 没有；许可 tab 名也不同）。
  {
    const expect = await page.evaluate(() => {
      const scope = document.getElementById("repos-split-pane-content") || document;
      const grid =
        scope.querySelector("[class*='borderGrid']") ||
        document.querySelector("[class*='PageLayout-PaneWrapper'] [class*='borderGrid']");
      if (!grid) return { found: false, rows: [] };
      const rows = Array.from(grid.children)
        .map((sec) => {
          const h2 = sec.querySelector("h2");
          if (!h2) return null;
          const a = h2.querySelector("a[href]");
          const sp = sec.querySelector('a[href^="/sponsors/"]');
          const lg = sec.querySelector('a[href*="/search?l="]');
          const href = a
            ? a.getAttribute("href")
            : sp
            ? sp.getAttribute("href")
            : lg
            ? lg.getAttribute("href")
            : null;
          const clone = h2.cloneNode(true);
          clone
            .querySelectorAll("[data-component='CounterLabel'], [class*='VisuallyHidden']")
            .forEach((e) => e.remove());
          const label = (clone.textContent || "").replace(/\s+/g, " ").trim();
          const c = h2.querySelector("[data-component='CounterLabel']");
          return {
            label,
            href,
            counter: c ? (c.textContent || "").trim() : "",
            sameOrigin: href ? new URL(href, location.origin).origin === location.origin : false,
          };
        })
        .filter(Boolean)
        .filter((r) => r.href && !r.href.startsWith("#") && r.sameOrigin);
      return {
        found: true,
        allHeadings: Array.from(grid.querySelectorAll("h2")).map((h) =>
          (h.textContent || "").replace(/\s+/g, " ").trim()
        ),
        rows,
      };
    });

    const panel = await page.evaluate(() => {
      const p = document.getElementById("mgga-nav-dock");
      return p
        ? Array.from(p.querySelectorAll("a")).map((a) => ({
            label: a.getAttribute("aria-label") || "",
            href: a.getAttribute("href") || "",
            counter: (a.querySelector(".Counter") || {}).textContent || "",
          }))
        : [];
    });

    const byLabel = {};
    panel.forEach((i) => (byLabel[i.label] = i));
    const missing = expect.rows.filter((r) => !byLabel[r.label]);
    record(
      "0.7 侧栏区块进入面板（每个区块一条主链接）",
      expect.found && expect.rows.length > 0 && missing.length === 0,
      "侧栏可导航区块=" + expect.rows.length + " 面板已有 " +
        expect.rows.filter((r) => byLabel[r.label]).length +
        (missing.length ? " 缺=" + JSON.stringify(missing.map((m) => m.label)) : "") +
        " 全部标题=" + JSON.stringify(expect.allHeadings)
    );

    const wrongHref = expect.rows.filter(
      (r) => byLabel[r.label] && byLabel[r.label].href !== r.href
    );
    record(
      "0.8 侧栏条目主链接与 DOM 一致",
      wrongHref.length === 0,
      wrongHref.length
        ? JSON.stringify(wrongHref.map((r) => r.label + ": " + byLabel[r.label].href + " ≠ " + r.href))
        : expect.rows.map((r) => r.label + "→" + r.href).join("；")
    );

    const withCounter = expect.rows.filter((r) => r.counter);
    const badCounter = withCounter.filter(
      (r) => !byLabel[r.label] || String(byLabel[r.label].counter).trim() !== r.counter
    );
    record(
      "0.9 侧栏计数徽章渲染正确",
      badCounter.length === 0,
      withCounter.length
        ? withCounter
            .map((r) => r.label + "=" + r.counter + "→" + (byLabel[r.label] || {}).counter)
            .join("；")
        : "本仓库侧栏无计数标题"
    );

    // About：真实存在但**不该**进面板（无主链接）
    const aboutHeading = (expect.allHeadings || []).find((h) => /^about|^关于/i.test(h));
    record(
      "0.10 About 区块未进面板",
      !aboutHeading || !byLabel[aboutHeading],
      aboutHeading ? "侧栏有 " + JSON.stringify(aboutHeading) + "，面板" +
        (byLabel[aboutHeading] ? "却收了它" : "未收") : "本仓库无 About 区块"
    );

    // 站外链接（仓库官网 / ko-fi / liberapay）不该进面板
    const external = panel.filter((i) => {
      try {
        return new URL(i.href, location.origin).origin !== location.origin;
      } catch (_) {
        return false;
      }
    });
    record(
      "0.11 面板无站外条目",
      external.length === 0,
      external.length ? JSON.stringify(external) : "0 条"
    );
  }

  /** 面板里真实的条目名（各仓库命名不同：License / "MIT license" / "Code of conduct"） */
  const L = {
    readme: await pickLabel("^readme$"),
    code: await pickLabel("^code$"),
    license: await pickLabel("licen[cs]e"),
    contributing: await pickLabel("^contributing$"),
  };
  console.log("INFO  0.5 关键条目实际标签：" + JSON.stringify(L));
  const need = (key) => {
    if (L[key]) return true;
    record("0.6 面板缺少关键条目 " + key, false, "labels=" + JSON.stringify(baseLabels));
    return false;
  };

  // 场景 1：仓库页默认态（README 就是选中 tab）→ 必须页内直接定位，一次导航都不发
  if (need("readme")) await locateScenario("1", L.readme, ["in-page"]);

  // 场景 2：已在 Code 页时再点 Code —— 页面上 Code 入口**外露**时直接定位到它
  // 自身（不导航）；被收纳进 More 时不定位、放行导航。期望哪一条取决于真实
  // 可见性，所以先取真值（0.8 那套判定函数）再断言，不写死。
  if (need("code")) {
    const codeState = await page.evaluate(() => {
      const P = window.__mggaProbe;
      const panel = document.getElementById("mgga-nav-dock");
      if (!panel || !P || typeof P.navDockSourceVisibility !== "function") {
        return "no-probe";
      }
      const a = Array.from(panel.querySelectorAll("a")).find((x) =>
        /^code\b/i.test(x.getAttribute("aria-label") || "")
      );
      if (!a) return "no-panel-item";
      // 面板锚点是克隆、不可反查源锚点；按落地 URL 在页面 nav 里找同目的地的入口
      const cand = Array.from(document.querySelectorAll("nav a[href]")).filter(
        (x) =>
          !x.closest("#mgga-nav-dock") &&
          (x.href === a.href || x.getAttribute("href") === a.getAttribute("href"))
      );
      return cand.length
        ? cand.map((c) => P.navDockSourceVisibility({ source: c }).state).join(",")
        : "no-page-anchor";
    });
    console.log("INFO  2.0 页面上 Code 入口的可见性判定：" + codeState);
    const folded = codeState.indexOf("exposed") < 0;
    await locateScenario(
      "2",
      L.code,
      folded ? ["page-item-hidden"] : ["page-item"],
      folded
    );
  }

  // 场景 3/4/5：文件区概览 tab（React 路由占位 tab）→ 接管后切 tab + 对新正文吸顶。
  // 这里**刻意不**按"页面上是否被收纳"分支：被折进 More 的 tab（320/400px 下的
  // License / Contributing / "MIT license"）一旦放行导航，就会用到
  // resolveFileAreaTabHref 反推的落地路径 —— 实测 vscode 的 `MIT license` 因此
  // 落到不存在的 /blob/HEAD/license 并被 301 成整页重载。探测结果只作 INFO。
  const fileTabScenario = async (tag, label) => {
    const st = pageStateOf(label);
    console.log(
      "INFO  " + tag + ".0 " + label + " 在页面上的可见性：" + st +
        (st === "more" ? "（已折进 More；面板仍提供切 tab 入口，不套用放行规则）" : "")
    );
    await locateScenario(tag, label, FILE_TAB_VIA);
  };

  if (need("license")) await fileTabScenario("3", L.license);
  if (need("contributing")) await fileTabScenario("4", L.contributing);

  // 场景 5：此时选中态已迁到 Contributing，再点 README → 必须切回 README 并吸顶
  if (L.readme && L.contributing) await fileTabScenario("5", L.readme);

  // 场景 6：?tab= 残留 —— 先切到 License 视图，再点 Code。
  // 断言的是**我们的决策**（放行软导航 rather than 接管）：这一条确定、可红绿对照
  // （旧版恒为 same-page-top）。下游"参数是否真的被清掉"由页面自己那条锚点的软导航
  // 决定，属 GitHub 的行为面，故只作 INFO 观测（6.0/6.0d/6.2 是诊断证据）。
  {
    const SELECTED_FILE_TAB = () => {
      const bar = document.querySelector('nav[aria-label="Repository files"]');
      const cur = bar ? bar.querySelector("[aria-current]") : null;
      return {
        selected: cur
          ? (cur.getAttribute("aria-label") || cur.textContent || "").replace(/\s+/g, " ").trim()
          : null,
        search: location.search,
      };
    };
    await clickItem(L.license);
    await sleep(2400);
    const before = await page.evaluate(SELECTED_FILE_TAB);
    // 诊断：panel 里「Code」这条自身的 href 是什么 —— 例外分支只负责"不接管"，
    // 真正清掉 ?tab= 的是这次放行出去的导航，所以必须知道锚点指向哪。
    const codeAnchor = await page.evaluate((l) => {
      const panel = document.getElementById("mgga-nav-dock");
      if (!panel) return null;
      const want = String(l).toLowerCase();
      const a =
        Array.from(panel.querySelectorAll("a")).find(
          (x) => String(x.getAttribute("aria-label") || "").toLowerCase() === want
        ) || null;
      if (!a) return null;
      const r = a.getBoundingClientRect();
      return {
        raw: a.getAttribute("href"),
        resolved: a.href,
        hasTab: /[?&]tab=/.test(a.href),
        // 页面那层文档级拦截靠属性认领克隆锚点（React Router 认 data-discover）：
        // cloneNode 只复制属性、不复制 __react* 自有键，所以这两个字段一起看
        dataDiscover: a.getAttribute("data-discover"),
        hasReactKey: Object.keys(a).some((k) => k.startsWith("__react")),
        onScreen: r.width > 0 && r.height > 0 && r.top > 0 && r.top < 1000,
        box: Math.round(r.left) + "," + Math.round(r.top) + " " + Math.round(r.width) + "x" + Math.round(r.height),
      };
    }, L.code);
    console.log(
      "INFO  6.0 panel 里 Code 条目锚点：" + JSON.stringify(codeAnchor) + "（例外只负责放行，清参靠这次导航）"
    );
    const mark = logs.length;
    const loadsBefore = loadCount;
    const docBefore = await readDocId();
    // URL 采样序列：区分"从未变化"与"变了又被还原" —— ?tab= 能否被清掉这一步
    // 实测约 2/3 成功，只有知道 URL 到底动没动才能判是页面没出手还是被回滚。
    await page.evaluate(() => {
      window.__urlSeq = [location.pathname + location.search];
      window.__urlTimer = setInterval(() => {
        const u = location.pathname + location.search;
        if (u !== window.__urlSeq[window.__urlSeq.length - 1]) window.__urlSeq.push(u);
      }, 80);
    });
    let hardNav = false;
    let after = null;
    try {
      await clickItem(L.code);
      await sleep(2200);
      after = await page.evaluate(SELECTED_FILE_TAB);
    } catch (err) {
      // 硬导航会把执行上下文销毁（docId/URL 采样都读不到了），以前的工具会
      // 直接 EXIT=2 整个挂掉 —— 这本身就是"发生了整页导航"的证据，记下来并继续。
      hardNav = true;
      after = { selected: "(context destroyed)", search: "(context destroyed)" };
      console.log("INFO  6.0n 点击后执行上下文被销毁 ⇒ 发生了**整页导航**：" + String(err.message).slice(0, 120));
    }
    let urlSeq = [];
    try {
      urlSeq = await page.evaluate(() => {
        clearInterval(window.__urlTimer);
        return window.__urlSeq || [];
      });
    } catch (_) {
      urlSeq = ["(context destroyed)"];
    }
    console.log("INFO  6.0s URL 采样序列：" + JSON.stringify(urlSeq) + " hardNav=" + hardNav);
    if (DIAG && !hardNav) {
      const d = await page.evaluate(() => ({
        hits: window.__mggaHits.slice(-3),
        clicks: window.__mggaClicks.slice(-6),
        total: window.__mggaClicks.length,
      }));
      console.log(
        "INFO  6.0d 点击诊断（命中谁/谁拦了默认）: " +
          JSON.stringify(d) +
          "  URL=" + JSON.stringify(await page.evaluate(() => location.pathname + location.search))
      );
    }
    const last =
      locateLines(mark).map(parseLocate).filter(Boolean).slice(-1)[0] || null;
    const docAfter = hardNav ? "(destroyed)" : await readDocId();
    record(
      "6.1 在 License 视图下点 Code：放行软导航而非接管",
      !hardNav &&
        docBefore === docAfter &&
        !!last &&
        last.via === "same-page-cleartab",
      "docId=" + docBefore + "->" + docAfter + " loads=" + loadsBefore + "->" + loadCount +
        " via=" + (last ? last.via : "?") + "（期望 same-page-cleartab；旧版恒为 same-page-top）"
    );
    console.log(
      "INFO  6.2 点 Code 前后：选中文件 tab " +
        JSON.stringify(before.selected) + " -> " + JSON.stringify(after.selected) +
        "；URL " + JSON.stringify(before.search) + " -> " + JSON.stringify(after.search) +
        (before.selected === after.selected
          ? "  ⇒ 正文未切换，仍停在 " + JSON.stringify(after.selected) + "（tab 参数未清理）"
          : "  ⇒ 正文已切回 " + JSON.stringify(after.selected))
    );
  }

  // ============ 场景 7：点击后控制台静默（无自激励扫描） ============
  {
    const mark = logs.length;
    await sleep(3000);
    const tail = logs.slice(mark);
    record(
      "7.1 空闲 3s 内无新 [MGGA] 日志（无不收敛重扫）",
      tail.filter((l) => /MGGA/.test(l.text)).length === 0,
      "new=" + tail.filter((l) => /MGGA/.test(l.text)).length +
        " " + JSON.stringify(tail.slice(0, 3).map((l) => l.text.slice(0, 90)))
    );
    const scans = logs.filter((l) => /\[MGGA\] scan/.test(l.text)).length;
    record("7.2 全程 [MGGA] scan 条数受控（<=16）", scans <= 16, "scan=" + scans);
    const errs = logs.filter((l) => l.type === "pageerror");
    record("7.3 脚本无未捕获异常", errs.length === 0, "pageerror=" + errs.length +
      " " + JSON.stringify(errs.slice(0, 2).map((e) => e.text.slice(0, 120))));
  }

  // ============ 场景 7.5：滚动条只覆盖条目区（标题栏不在滚动口内）============
  // 用户诉求演进：① v2026.10.29「标题栏固定不参与滚动」—— 当时面板自己就是滚动
  // 容器，修法是 position:sticky；② v2026.10.30「滚动条应该排除标题栏区域，不再
  // 涵盖标题栏」—— sticky 做不到：滚动条由**滚动容器**绘制、必然覆盖容器全高。
  // 于是把标题栏移出滚动容器：面板变成 flex 列 + overflow:hidden，滚动口下沉为
  // .mgga-nav-dock-body。判据**不能看 CSS 声明**（声明在 ≠ 生效：祖先 overflow、
  // flex 子项被内容撑破、被别的层盖住都会让它失效），必须看**真实排版**：
  // 把面板压到必然溢出（只写内联 max-height，不碰被测样式），然后量四件事：
  //   ① 滚动口上沿是否**就在标题栏下沿**（bodyTop >= headerBottom）—— 这一条直接
  //      证明滚动条画不进标题栏那一行，是本场景的核心判据；
  //   ② 标题栏是否真的落在滚动区之外（header.closest(选择器) 为 null）；
  //   ③ 滚一段后标题相对面板顶边**前后一致**（不被卷走、不被裁切）；
  //   ④ 首条目确实上移（证明确实滚了，而不是整体没动）。
  // 归一化到「面板顶边」而不是视口顶边：面板是 position:fixed + translateY(-50%)，
  // 用面板自身作参照系，才不受页面滚动与视口高度影响。
  // **判据是「标题相对面板顶边不变」而不是「≈0」**（上一版写成 ≈0，实测误报）：
  // 面板有 1px 边框 + 6px 内边距，标题停在 7px 处也完全正确。
  {
    const setup = await page.evaluate(() => {
      const panel = document.getElementById("mgga-nav-dock");
      const header = panel && panel.querySelector(".mgga-nav-dock-header");
      const body = panel && panel.querySelector(".mgga-nav-dock-body");
      if (!panel || !header) return null;
      // 滚动条宿主 = 从滚动区往上最近的 overflow-y(auto|scroll) 元素 —— 滚动条就画在
      // 这个元素的 border-box 里，它的纵向范围 = 滚动条的纵向范围。
      // 新结构命中 .mgga-nav-dock-body；旧结构（无 body）退化为面板自身，
      // 那正是"滚动条覆盖全高、连标题栏一起画"的根源。
      const findScroller = (el) => {
        let n = el;
        while (n && n !== document.body) {
          const oy = getComputedStyle(n).overflowY;
          if (oy === "auto" || oy === "scroll") return n;
          n = n.parentElement;
        }
        return null;
      };
      const scroller = findScroller(body || header);
      // 注意：宿主的 rect 必须与面板 rect **同一时刻**取 —— 下面给面板设 max-height
      // 会让面板收缩、居中位置随之变化（实测偏移 162px），先取会把两个坐标系混起来，
      // 差出十几到上百像素的假值。（这正是本场景第一版误报 FAIL 的原因，已实测。）
      // 内联 !important 优先级高于样式表里的 max-height: calc(100dvh - 1em)
      panel.style.setProperty("max-height", "220px", "important");
      if (body) body.scrollTop = 0;
      const pr = panel.getBoundingClientRect();
      const hr = header.getBoundingClientRect();
      const br = body ? body.getBoundingClientRect() : null;
      // 与 pr 同一时刻取（见上）
      const sr = scroller ? scroller.getBoundingClientRect() : null;
      return {
        headerPosition: getComputedStyle(header).position,
        panelOverflowY: getComputedStyle(panel).overflowY,
        headerInsideBody: !!header.closest(".mgga-nav-dock-body"),
        headerBottom: Math.round(hr.bottom - pr.top),
        panelH: Math.round(pr.height),
        scrollerDesc: scroller
          ? scroller.id
            ? "#" + scroller.id
            : "." + String(scroller.className || "?")
          : "(none)",
        scrollerTop: sr ? Math.round(sr.top - pr.top) : null,
        scrollerBottom: sr ? Math.round(sr.bottom - pr.top) : null,
        scrollable: scroller
          ? scroller.scrollHeight - scroller.clientHeight
          : 0,
        gutter: scroller ? Math.round(scroller.offsetWidth - scroller.clientWidth) : null,
        // 布局诊断：一旦滚动宿主的 rect 与 clientHeight 对不上，这些数字能直接指出
        // 是"没收缩"还是"收缩了但 rect 过期"。常态留存，省得下次再猜。
        diag: body
          ? {
              bodyRectH: Math.round(br.height),
              bodyOffsetH: body.offsetHeight,
              bodyClientH: body.clientHeight,
              bodyScrollH: body.scrollHeight,
              headerH: Math.round(hr.height),
              panelFlexDir: getComputedStyle(panel).flexDirection,
              bodyFlex: getComputedStyle(body).flexGrow + "/" +
                getComputedStyle(body).flexShrink + "/" +
                getComputedStyle(body).flexBasis,
              bodyMinH: getComputedStyle(body).minHeight,
              bodyPos: getComputedStyle(body).position,
            }
          : null,
      };
    });
    if (!setup) {
      record(
        "7.5 滚动条只覆盖条目区（标题栏不在滚动口内）",
        false,
        "面板或标题栏不存在"
      );
    } else {
      const measure = () =>
        page.evaluate(() => {
          const panel = document.getElementById("mgga-nav-dock");
          const header = panel.querySelector(".mgga-nav-dock-header");
          // 滚动宿主：优先滚动区，旧结构退化为面板自身
          // —— 保证红绿对照能在同一套测量下跑完
          const scroller = panel.querySelector(".mgga-nav-dock-body") || panel;
          const item = scroller.querySelector("a");
          const pr = panel.getBoundingClientRect();
          const hr = header.getBoundingClientRect();
          const ir = item ? item.getBoundingClientRect() : null;
          return {
            scrollTop: Math.round(scroller.scrollTop),
            deltaTop: Math.round(hr.top - pr.top),
            headerBottom: Math.round(hr.bottom - pr.top),
            itemTop: ir ? Math.round(ir.top - pr.top) : null,
            title: (header.textContent || "").replace(/\s+/g, " ").trim().slice(0, 20),
          };
        });
      await sleep(300);
      const at0 = await measure();
      await page.evaluate(() => {
        const panel = document.getElementById("mgga-nav-dock");
        const scroller = panel.querySelector(".mgga-nav-dock-body") || panel;
        scroller.scrollTop = Math.min(
          160,
          Math.max(1, scroller.scrollHeight - scroller.clientHeight)
        );
      });
      await sleep(400);
      const after = await measure();
      // 核心判据：**滚动条宿主**（滚动条就画在它的 border-box 里）的顶边不得高过
      // 标题栏下沿 —— 这一条直接等价于「滚动条不会出现在标题栏那一行」。
      const ok =
        setup.scrollerTop !== null &&
        setup.scrollerTop >= setup.headerBottom - 1 &&
        setup.scrollerBottom !== null &&
        setup.scrollerBottom <= setup.panelH + 1 &&
        !setup.headerInsideBody &&
        setup.scrollable > 0 &&
        after.scrollTop > 0 &&
        Math.abs(after.deltaTop - at0.deltaTop) <= 2 &&
        after.itemTop !== null &&
        at0.itemTop !== null &&
        after.itemTop < at0.itemTop - 20;
      record(
        "7.5 滚动条只覆盖条目区（标题栏不在滚动口内）",
        ok,
        "滚动宿主=" + setup.scrollerDesc +
          "（纵向 " + setup.scrollerTop + "-" + setup.scrollerBottom + "px）" +
          "、标题下沿 " + setup.headerBottom + "px、面板高 " + setup.panelH + "px" +
          "（滚动条只能画在宿主纵向范围内 ⇒ 宿主顶边应 >= 标题下沿）；" +
          "标题在滚动区内=" + setup.headerInsideBody + "、position=" + setup.headerPosition +
          "、面板 overflow-y=" + setup.panelOverflowY + "；可滚 " + setup.scrollable + "px；" +
          "scrollTop 0→" + after.scrollTop +
          "，标题相对面板顶边 " + at0.deltaTop + "→" + after.deltaTop +
          "px（应前后一致）；首条目 " + at0.itemTop + "→" + after.itemTop +
          "px（应随滚动上移）；滚动条占位 " + setup.gutter + "px；标题=" +
          JSON.stringify(after.title)
      );
      if (setup.diag) {
        console.log("INFO  7.5d 布局诊断：" + JSON.stringify(setup.diag));
      }
      // 还原，别把内联 max-height / 滚动位置带进后面的场景
      await page.evaluate(() => {
        const panel = document.getElementById("mgga-nav-dock");
        const body = document.querySelector("#mgga-nav-dock > .mgga-nav-dock-body");
        if (panel) panel.style.removeProperty("max-height");
        if (body) body.scrollTop = 0;
      });
      await sleep(200);
    }
  }

  // ============ 场景 8：跨页条目走 GitHub 自己的软导航（不是整页重载）============
  // 放在最后 —— 点完就离开仓库主页，dock 会随之拆除，后续场景不可能再跑。
  // 这条覆盖的是分诊路径 5（pass-through）：**不接管**、把点击交还给
  // Turbo / React Router 的全局拦截器，比我们自己替换更保真。
  {
    const repoPath = new URL(opts.url).pathname.replace(/\/+$/, "");
    const expectPath = repoPath + "/issues";
    const label = await page.evaluate((p) => {
      const panel = document.getElementById("mgga-nav-dock");
      if (!panel) return null;
      const a = Array.from(panel.querySelectorAll("a")).find(
        (x) => x.getAttribute("href") === p
      );
      return a ? a.getAttribute("aria-label") || "" : null;
    }, expectPath);
    if (!label) {
      record("8.1 跨页条目走软导航（无整页重载）", false, "面板里没有指向 " + expectPath + " 的条目");
    } else {
      // 这条路径依赖 GitHub 自己的 Turbo 拦截，**偶发**会因面板重建 / 点击落点
      // 偏差而没触发访问（实测 6 次里 2 次）。给一次重试，并把点击方式与
      // locate 日志一并记进证据 —— 区分"偶发"与"真的不导航"。
      let ok = false;
      let detail = "";
      for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
        await page.evaluate(() => window.scrollTo(0, 500));
        await sleep(300);
        const docBefore = await readDocId();
        const loadsBefore = loadCount;
        const mark = logs.length;
        const how = await clickItem(label);
        await sleep(2800);
        const after = await page.evaluate(() => ({
          pathname: location.pathname,
          docId: window.__mggaDocId || "",
        }));
        const via =
          (locateLines(mark).map(parseLocate).filter(Boolean).slice(-1)[0] || {}).via ||
          "无 locate 日志";
        ok = after.docId === docBefore && after.pathname === expectPath;
        detail =
          "docId=" + docBefore + "->" + after.docId + " url=" + after.pathname +
          "（期望 " + expectPath + "）loads=" + loadsBefore + "->" + loadCount +
          " click=" + how + " via=" + via + " 第" + attempt + "次";
      }
      record("8.1 跨页条目「" + label + "」走软导航（无整页重载）", ok, detail);
    }
  }

  const out = {
    url: opts.url,
    mode: opts.mode,
    docId: baseDocId,
    loadCount,
    frameUrls,
    results,
    passed: results.filter((r) => r.pass).length,
    total: results.length,
    mgGaLogs: logs.filter((l) => /MGGA/.test(l.text)).map((l) => l.text),
    errors: logs.filter((l) => l.type === "pageerror").map((l) => l.text),
  };
  if (opts.json) {
    fs.writeFileSync(opts.json, JSON.stringify(out, null, 2));
    console.log("\nwrote " + opts.json);
  }
  console.log("\n==== " + out.passed + "/" + out.total + " passed ====");
  await browser.close();
  process.exit(out.passed === out.total ? 0 : 1);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(2);
});
