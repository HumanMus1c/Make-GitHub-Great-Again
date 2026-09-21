/**
 * MGGA 主脚本本地冒烟测试（无需网络 / 无需真实 GitHub）
 *
 * 用 jsdom 构造最小化的 GitHub 页面结构，注入主脚本 IIFE，
 * 逐个走通关键路径并断言无异常、关键 DOM 产出符合预期。
 *
 * 用法: node tools/smoke-load.js
 * 退出码: 0 = 全部 PASS, 1 = 有 FAIL
 */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const SCRIPT = process.env.MGGA_SCRIPT
  ? path.resolve(process.env.MGGA_SCRIPT)
  : path.join(__dirname, "..", "Make-GitHub-Great-Again.js");
const REPO = "HumanMus1c/Make-GitHub-Great-Again";

/** 从 userscript 头解析 @version，保证断言与实际版本一致 */
const HEADER_VERSION = (() => {
  const raw = fs.readFileSync(SCRIPT, "utf8");
  const m = raw.match(/^\/\/ @version\s+(\S+)/m);
  if (!m) throw new Error("@version not found in userscript header");
  return m[1];
})();

const results = [];
function check(name, fn) {
  try {
    const detail = fn();
    results.push({ name, ok: true, detail: detail || "" });
  } catch (err) {
    results.push({ name, ok: false, detail: err && err.message ? err.message : String(err) });
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

/** 从 userscript 头部之后截出 IIFE 主体，并剥掉内联 <script> 块 */
function buildScriptBody() {
  const raw = fs.readFileSync(SCRIPT, "utf8");
  const marker = "==/UserScript==";
  const mi = raw.indexOf(marker);
  if (mi < 0) throw new Error("userscript header not found");
  const iife = raw.indexOf("(function", mi);
  if (iife < 0) throw new Error("IIFE not found after header");
  let body = raw.slice(iife);
  let idx;
  while ((idx = body.indexOf("<script>")) !== -1) {
    const end = body.indexOf("</scr" + "ipt>", idx);
    if (end < 0) throw new Error("unterminated <script> block");
    body = body.slice(0, idx) + body.slice(end + 9);
  }
  return body;
}

const RELEASE_ROWS = [
  { file: "tool-v1.0.0-windows-x64.zip", want: "Windows" },
  { file: "tool-v1.0.0-linux-x86_64.tar.gz", want: "Linux" },
  { file: "tool-v1.0.0-macos-universal.dmg", want: "Apple" },
  { file: "tool-v1.0.0-android-arm64.apk", want: "Android" },
  { file: "tool-v1.0.0-ios-arm64.ipa", want: "iOS" },
  { file: "tool-v1.0.0-src.tar.gz", want: "Source" },
  { file: "Source code (zip)", want: null },
];

function releaseRowHTML(file, useFallbackSelectors) {
  // 兜底形态：单元格改用无 GitHub 内部类名的宽松结构（仅 d-flex）
  const cellClass = useFallbackSelectors
    ? "d-flex"
    : "d-flex flex-justify-start col-12 col-lg-6";
  return (
    '<li class="Box-row">' +
    '<div class="' + cellClass + '">' +
    '<svg viewBox="0 0 16 16" data-native="1"><path d="M0 0h16v16H0z"/></svg>' +
    '<a href="#" class="text-bold">' + file + "</a>" +
    "</div>" +
    '<div class="col-12 col-lg-6"><a href="#" class="download">Download</a></div>' +
    "</li>"
  );
}

function repoHomeHTML() {
  return (
    '<nav aria-label="Global"><ul class="d-flex">' +
    '<li><a href="https://github.com/' + REPO + '">Code</a></li>' +
    '<li><a href="https://github.com/' + REPO + '/issues">Issues<span class="Counter">12</span></a></li>' +
    '<li><a href="https://github.com/' + REPO + '/pulls">Pull requests</a></li>' +
    '<li><a href="https://github.com/' + REPO + '/actions">Actions</a></li>' +
    '<li><button type="button" aria-label="More" data-testid="more">More</button></li>' +
    "</ul></nav>" +
    '<nav aria-label="Repository"><ul class="UnderlineNav-body">' +
    '<li><a href="https://github.com/' + REPO + '" aria-current="page">Code</a></li>' +
    '<li><a href="https://github.com/' + REPO + '/issues">Issues</a></li>' +
    "</ul></nav>"
  );
}

const REPO_SLUG = "https://github.com/" + REPO;

/**
 * 现网 SSR 形态的仓库主页：响应式标签栏 .js-responsive-underlinenav
 * + 溢出副本 li[data-menu-item][hidden]（与 2026-09-21 抓取的
 * microsoft/vscode、nodejs/node 等真实页面结构一致）。
 * Wiki / Security / Insights 三项**只存在于溢出副本里**，UnderlineNav-body
 * 中没有 —— 它们是"能否零点击拿到 More 折叠项"的判定样本。
 */
function repoHomeHTMLResponsive() {
  const tab = (id, href, text, counter) =>
    '<li class="js-responsive-underlinenav-item"><a href="' + href + '"' +
    (id === "i0code-tab" ? ' aria-current="page"' : "") +
    ' data-tab-item="' + id + '">' + text +
    (counter ? '<span class="Counter">' + counter + "</span>" : "") +
    "</a></li>";
  const menuItem = (id, href, text) =>
    '<li data-menu-item="' + id + '" hidden><a href="' + href + '">' + text + "</a></li>";

  return (
    '<nav aria-label="Repository" class="js-repo-nav js-responsive-underlinenav">' +
    '<ul class="UnderlineNav-body">' +
    tab("i0code-tab", REPO_SLUG, "Code") +
    tab("i1issues-tab", REPO_SLUG + "/issues", "Issues", "12") +
    tab("i2pull-requests-tab", REPO_SLUG + "/pulls", "Pull requests") +
    tab("i3actions-tab", REPO_SLUG + "/actions", "Actions") +
    "</ul>" +
    '<div class="js-responsive-underlinenav-overflow" style="visibility:hidden">' +
    '<button id="moreTrigger" type="button" aria-haspopup="true" aria-expanded="false" aria-label="More">More</button>' +
    "<ul hidden>" +
    menuItem("i0code-tab", REPO_SLUG, "Code") +
    menuItem("i1issues-tab", REPO_SLUG + "/issues", "Issues") +
    menuItem("i2pull-requests-tab", REPO_SLUG + "/pulls", "Pull requests") +
    menuItem("i3actions-tab", REPO_SLUG + "/actions", "Actions") +
    menuItem("i4wiki-tab", REPO_SLUG + "/wiki", "Wiki") +
    menuItem("i5security-tab", REPO_SLUG + "/security", "Security") +
    menuItem("i6insights-tab", REPO_SLUG + "/pulse", "Insights") +
    "</ul></div></nav>"
  );
}

/**
 * 登录态 AppHeader 的**面包屑栏**（nav[aria-label="Breadcrumbs"]）+ 一个
 * **无名图标弹出按钮**（aria-haspopup + aria-expanded，无 aria-label、无文本）。
 *
 * 这是 2026-09-20~21 反复出现的"多余点击"根因样本：
 *   ① 两个锚点是 owner / owner-repo，被取数链整体当面包屑剔除 ⇒ 本栏
 *      "零点击可得项"恒为 0；
 *   ② 因此免点击闸门（只看 zeroClick>0）**永远为它放行**；
 *   ③ 点开按钮拿到的是仓库选择器 picker 的链接，被当作导航项塞进面板。
 * 修复后：isDockEligibleBar 按 aria-label 识别面包屑栏，既不索引也不点击。
 */
function breadcrumbBarHTML() {
  const owner = REPO.split("/")[0];
  return (
    '<nav aria-label="Breadcrumbs">' +
    // 相对路径！真实页面就是 "/owner" 与 "/owner/repo" 两条 —— 前者命中
    // repoHomeRe、后者等于 location.pathname，两条都被 isBreadcrumbish 剔除
    '<a href="/' + owner + '">' + owner + "</a>" +
    '<a href="/' + REPO + '">' + REPO.split("/")[1] + "</a>" +
    '<button id="crumbTrigger" type="button" aria-haspopup="true" aria-expanded="false"></button>' +
    "</nav>"
  );
}

/**
 * 文件区"概览文件"栏 + 文件区正文容器 + 右侧 About 区的 `-ov-file` 页内锚点。
 *
 * 结构与真实 SSR 逐点对齐（证据：.workbuddy/probe/iina.html，github.com/iina/iina）：
 *   - README tab   `<a href="#" aria-current="page">`：**默认选中**的 React 客户端
 *     路由 tab（href 是占位符，点击由 React 拦截）⇒ 取数链把 href 落成
 *     location.pathname，面板克隆点它等于"重载当前页"，滚动位置清零。
 *   - Contributing  `<a href="#">`：未选中的 React 客户端路由 tab。
 *   - 右侧 Resources `<a href="#readme-ov-file">Readme</a>`：GitHub 自己跳概览
 *     文件区块用的页内锚点（真实 SSR 里只有 href，目标 id 由客户端补）。
 *   - `#repos-split-pane-content` + `article.markdown-body.entry-content`：
 *     文件区正文容器的稳定标识组合。
 *
 * @param opts.withOvId  是否渲染 `#readme-ov-file` 目标元素。
 *                       缺省 true；传 false 复现"锚点只有 href、目标未渲染"
 *                       的真实 SSR 形态（此时必须靠"已选中的正文块"兜住）。
 */
function overviewFilesHTML(opts) {
  const withOvId = !(opts && opts.withOvId === false);
  return (
    '<nav aria-label="Repository files" data-overflow-mode="wrap"><ul role="list">' +
    '<li role="presentation" aria-hidden="true" class="wrap-spacer"></li>' +
    '<li><a id="ovReadme" href="#" aria-current="page">' +
    '<span data-component="text" data-content="README">README</span></a></li>' +
    '<li><a id="ovContributing" href="#">' +
    '<span data-component="text" data-content="Contributing">Contributing</span></a></li>' +
    "</ul>" +
    '<button id="ovMore" type="button" aria-haspopup="true" aria-expanded="false">More items</button>' +
    "</nav>" +
    '<div data-selector="repos-split-pane-content" id="repos-split-pane-content" tabindex="0">' +
    (withOvId ? '<div id="readme-ov-file"></div>' : "") +
    '<div class="DirectoryRichtextContent-module__SharedMarkdownContent__hHXUL">' +
    '<article class="markdown-body entry-content" id="readmeArticle"><h1>README</h1></article>' +
    "</div></div>" +
    '<div id="about"><h3 class="sr-only"><span>Resources</span></h3>' +
    '<div class="mt-2"><a href="#readme-ov-file">Readme</a></div></div>'
  );
}

/**
 * 面板里按标签找条目锚点（标签可能被计数器/图标文本污染，用前缀包含比对）
 */
function panelItemByLabel(doc, label) {
  return (
    Array.from(doc.querySelectorAll("#mgga-nav-dock a")).find((a) =>
      (a.getAttribute("aria-label") || a.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .startsWith(label)
    ) || null
  );
}

/** 派发一次可观测 defaultPrevented 的点击 */
function dispatchClick(win, el, init) {
  const ev = new win.MouseEvent("click", Object.assign(
    { bubbles: true, cancelable: true, button: 0, view: win },
    init || {}
  ));
  el.dispatchEvent(ev);
  return ev;
}

/**
 * 装一套"可判读的假布局"。
 *
 * jsdom 没有排版层：`scrollY` 恒 0、`getBoundingClientRect()` 恒 0、
 * `scrollTop` 写入被忽略 —— 不补这些，"定位到哪个元素、有没有置顶、
 * 让位扣了没有"三类断言全都写不出来（旧版正是在这里出过"clicks=0 假绿"）。
 *
 *   win.__fakeY        当前滚动位置（可读写，供断言）
 *   win.__scrollCalls  window.scrollTo 的入参序列
 *   el.__absTop        absTops 里登记的文档绝对纵坐标
 *
 * @param absTops { id: 绝对纵坐标 } 或 { id: (rect)=>rect }（层叠场景自定义）
 */
function installFakeLayout(win, absTops) {
  win.__fakeY = 0;
  Object.defineProperty(win, "scrollY", {
    configurable: true,
    get: () => win.__fakeY,
  });
  const calls = [];
  win.scrollTo = function (a, b) {
    const top = a && typeof a === "object" ? a.top : b;
    calls.push(top);
    if (typeof top === "number") win.__fakeY = top;
  };
  win.__scrollCalls = calls;

  const doc = win.document;
  Object.keys(absTops || {}).forEach((id) => {
    const el = doc.getElementById(id);
    if (!el) return;
    const spec = absTops[id];
    if (typeof spec === "function") {
      el.getBoundingClientRect = spec;
      return;
    }
    el.__absTop = spec;
    el.getBoundingClientRect = () => {
      const top = spec - win.__fakeY;
      return { top, bottom: top + 600, left: 0, right: 800, width: 800, height: 600, x: 0, y: top };
    };
  });
  return win;
}

/** 假布局下元素的当前视口纵坐标（断言"是否置顶"用） */
function viewportTop(win, id) {
  const el = win.document.getElementById(id);
  return el ? el.getBoundingClientRect().top : NaN;
}

/** 固定/粘性元素：视口坐标恒定（顶栏、已贴顶的子导航） */
function stubViewportRect(el, top, height) {
  el.getBoundingClientRect = () => ({
    top, bottom: top + height, left: 0, right: 800, width: 800, height, x: 0, y: top,
  });
  return el;
}

/** 可滚动容器：jsdom 不实现 scrollTop 写入，这里给一份可读写的桩 */
function stubScrollable(el, scrollHeight, clientHeight) {
  let st = 0;
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    get: () => st,
    set: (v) => {
      st = v;
    },
  });
  Object.defineProperty(el, "scrollHeight", {
    configurable: true,
    get: () => scrollHeight,
  });
  Object.defineProperty(el, "clientHeight", {
    configurable: true,
    get: () => clientHeight,
  });
  return el;
}

function buildDOM(url, opts) {
  const useFallbackSelectors = !!(opts && opts.useFallbackSelectors);
  // 兜底形态：模拟 GitHub 改版后类名变化 —— 没有 .Box.Box--condensed，
  // 只有 data-testid="release-assets"，且文件名单元格不带 col-12 系列类名
  const listOpen = useFallbackSelectors
    ? '<section data-testid="release-assets"><ul>'
    : '<div class="Box Box--condensed"><ul>';
  const listClose = useFallbackSelectors ? "</ul></section>" : "</ul></div>";
  const rows = useFallbackSelectors
    ? RELEASE_ROWS.map((r) => releaseRowHTML(r.file, true)).join("")
    : RELEASE_ROWS.map((r) => releaseRowHTML(r.file)).join("");

  const html = [
    "<!DOCTYPE html>",
    '<html data-color-mode="light">',
    "<head><title>t</title></head>",
    "<body>",
    '<div data-testid="repository-container-header"><div id="repo-header"></div></div>',
    '<header class="AppHeader"><div class="d-flex">',
    '<a class="btn">Watch</a><a class="btn">Fork</a><a class="btn">Star</a><a class="btn">Sponsor</a>',
    "</div></header>",
    opts && opts.dockFixture ? opts.dockFixture() : repoHomeHTML(),
    "<main>",
    listOpen,
    rows,
    listClose,
    "</main>",
    "</body></html>",
  ].join("");

  const domOpts = { url, runScripts: "outside-only", pretendToBeVisual: true };
  if (opts && opts.quietNavigation) {
    // jsdom 不实现导航，"点击真实链接"会往 stderr 打 Not implemented；
    // 只在本场景屏蔽，避免淹没断言输出（不影响 window.onerror 收集）。
    const { VirtualConsole } = require("jsdom");
    const vc = new VirtualConsole();
    vc.on("jsdomError", () => {});
    domOpts.virtualConsole = vc;
  }
  const dom = new JSDOM(html, domOpts);
  const win = dom.window;

  // --- jsdom 缺口补齐 ---
  win.matchMedia =
    win.matchMedia ||
    function (q) {
      return { matches: false, media: q, addEventListener() {}, removeEventListener() {} };
    };
  const mockGradient = { addColorStop() {} };
  win.HTMLCanvasElement.prototype.getContext = function () {
    return {
      clearRect() {},
      fillRect() {},
      fillStyle: "",
      createLinearGradient() {
        return mockGradient;
      },
      createRadialGradient() {
        return mockGradient;
      },
    };
  };

  // --- GM_* stub ---
  const store = new Map();
  const menu = [];
  win.GM_info = { script: { version: HEADER_VERSION, name: "MGGA" } };
  win.GM_getValue = (k, d) => (store.has(k) ? store.get(k) : d);
  win.GM_setValue = (k, v) => void store.set(k, v);
  win.GM_addStyle = (css) => {
    const s = win.document.createElement("style");
    s.textContent = css;
    win.document.head.appendChild(s);
    return s;
  };
  win.GM_registerMenuCommand = (label, fn) => {
    menu.push({ label, fn });
  };
  win.GM_notification = () => {};

  const errors = [];
  win.addEventListener("error", (e) => errors.push(String(e.error || e.message)));
  win.onerror = (msg) => errors.push(String(msg));

  return { dom, win, store, menu, errors };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const body = buildScriptBody();
  const errors = [];

  // ---------- 场景 1: Release 页面 ----------
  const rel = buildDOM("https://github.com/" + REPO + "/releases");
  try {
    rel.win.eval(body);
  } catch (err) {
    errors.push("eval(release): " + err.message);
  }
  const relWin = rel.win;
  const relDoc = relWin.document;

  check("Release 页加载无异常", () => {
    assert(rel.errors.length === 0, "window error: " + rel.errors.join(" | "));
    assert(errors.length === 0, errors.join(" | "));
  });

  check("图标规则注入成功（自定义 SVG 已替换原生图标）", () => {
    const icons = relDoc.querySelectorAll("svg.custom-svg-icon");
    const rows = relDoc.querySelectorAll(".Box.Box--condensed li.Box-row");
    assert(rows.length === RELEASE_ROWS.length, "asset rows = " + rows.length);
    assert(icons.length === 6, "expected 6 custom icons, got " + icons.length);
    return icons.length + " 个图标已替换";
  });

  check("Source code 行未被替换图标", () => {
    const rows = Array.from(relDoc.querySelectorAll(".Box.Box--condensed li.Box-row"));
    const srcRow = rows.find((r) => r.textContent.includes("Source code (zip)"));
    assert(srcRow, "Source code row missing");
    assert(srcRow.querySelector("svg[data-native]"), "native svg should be preserved");
    return "原生图标保留";
  });

  check("架构关键词高亮生成", () => {
    const hl = relDoc.querySelectorAll(".arch-highlight");
    assert(hl.length > 0, "no .arch-highlight produced");
    const texts = Array.from(hl).map((n) => n.textContent.toLowerCase());
    assert(texts.includes("x86_64"), "x86_64 not highlighted; got " + texts.join(","));
    assert(texts.includes("arm64"), "arm64 not highlighted");
    return texts.length + " 处高亮: " + Array.from(new Set(texts)).join(", ");
  });

  check("动态架构样式表已注入", () => {
    const s = relDoc.getElementById("MGGA-custom-arch-style");
    assert(s, "#MGGA-custom-arch-style missing");
    assert(s.textContent.includes(".arch-highlight"), "style content empty");
    return "样式表长度 " + s.textContent.length;
  });

  check("悬浮设置按钮已创建", () => {
    assert(relDoc.getElementById("mgga-float-btn"), "#mgga-float-btn missing");
    return "ok";
  });

  check("菜单命令已注册", () => {
    assert(rel.menu.length >= 6, "only " + rel.menu.length + " menu commands");
    return rel.menu.map((m) => m.label).join(" / ");
  });

  // ---------- 场景 2: 打开设置面板 ----------
  const settingsCmd = rel.menu.find((m) => /设置|Settings/.test(m.label));
  check("找到设置面板菜单项", () => {
    assert(settingsCmd, "settings menu command not found");
    return settingsCmd.label;
  });

  if (settingsCmd) {
    check("打开设置面板无异常", () => {
      settingsCmd.fn();
      const dlg = relDoc.querySelector(".color-picker-dialog");
      assert(dlg, ".color-picker-dialog not created");
      assert(dlg.classList.contains("visible"), "dialog not marked visible");
      return "版本号渲染: " + (dlg.querySelector(".color-picker-title").textContent.match(/v[\d.]+/) || ["?"])[0];
    });

    check("面板控件齐备", () => {
      ["#oddRowColorBtn", "#evenRowColorBtn", "#hoverColorBtn", "#svgToggleBtn",
       "#mobileFixToggleBtn", "#highlightToggleBtn", "#customKeywordsContainer",
       "#newKeywordInput", "#addKeywordBtn", ".confirm-button", ".cancel-button",
       ".reset-button"].forEach((sel) => {
        assert(relDoc.querySelector(sel), "missing " + sel);
      });
      return "12 个控件全部存在";
    });

    check("关键词列表已渲染", () => {
      const items = relDoc.querySelectorAll("#customKeywordsContainer .custom-keyword-item");
      assert(items.length > 0, "no keyword items rendered");
      const defaults = relDoc.querySelectorAll("#customKeywordsContainer .default-keyword-item");
      return items.length + " 条规则（其中预设 " + defaults.length + " 条）";
    });

    check("点击颜色按钮弹出内置取色器面板", () => {
      const btn = relDoc.querySelector("#oddRowColorBtn");
      btn.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
      const panel = relDoc.querySelector(".custom-color-picker-panel");
      assert(panel, "color picker panel not created");
      assert(panel.querySelector(".builtin-color-picker-container"), "builtin picker not initialized");
      assert(panel.querySelector("#color-area-canvas"), "canvas missing");
      assert(panel.querySelectorAll(".builtin-preset-color-swatch").length === 18,
        "preset swatches = " + panel.querySelectorAll(".builtin-preset-color-swatch").length);
      return "内置取色器 + 18 个预设色块";
    });

    check("取色器面板可在视口定位（无崩溃）", () => {
      const panel = relDoc.querySelector(".custom-color-picker-panel");
      assert(panel.style.left !== "", "panel left not set");
      return "left=" + panel.style.left + " top=" + panel.style.top;
    });

    check("取色器交互链路：预设色块 → 按钮 → 页面样式实时刷新", () => {
      const styleEl = relDoc.getElementById("Make-GitHub-Great-Again-style");
      assert(styleEl, "page style element missing");
      const before = styleEl.textContent;
      const swatch = relDoc.querySelector(".custom-color-picker-panel .builtin-preset-color-swatch");
      assert(swatch, "no preset swatch");
      swatch.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
      const after = styleEl.textContent;
      assert(after !== before, "page style not refreshed after preset click");
      assert(/#000000/i.test(after), "odd row color not applied; style=" + after.replace(/\s+/g, " ").slice(0, 160));
      return "样式已实时改写为 " + (after.match(/#[0-9a-f]{6}/i) || ["?"])[0];
    });

    check("取色器交互链路：色域 / 色调条点击无异常", () => {
      const area = relDoc.querySelector(".custom-color-picker-panel #color-area-main");
      const hue = relDoc.querySelector(".custom-color-picker-panel #hue-strip");
      assert(area && hue, "color area / hue strip missing");
      area.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
      hue.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
      return "色域与色调条点击均未抛错";
    });

    check("关键词色块走同一条取色器链路", () => {
      const before = relDoc.querySelectorAll(".custom-color-picker-panel").length;
      const sw = relDoc.querySelector("#customKeywordsContainer .keyword-color-swatch");
      assert(sw, "no keyword swatch");
      sw.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
      const panel = relDoc.querySelector(".custom-color-picker-panel");
      assert(panel, "panel not opened from keyword swatch");
      assert(panel.querySelector(".builtin-color-picker-container"), "builtin picker not initialized");
      const preset = panel.querySelector(".builtin-preset-color-swatch");
      preset.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
      return "关键词色块面板可用（此前面板数 " + before + "）";
    });

    check("新增关键词颜色按钮走同一条取色器链路", () => {
      const btn = relDoc.querySelector("#newKeywordColorBtn");
      assert(btn, "newKeywordColorBtn missing");
      btn.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
      const panel = relDoc.querySelector(".custom-color-picker-panel");
      assert(panel, "panel not opened from newKeywordColorBtn");
      assert(panel.querySelector(".builtin-color-picker-container"), "builtin picker not initialized");
      const fmt = panel.querySelector(".builtin-format-toggle-btn");
      assert(fmt, "format toggle missing");
      fmt.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
      return "格式切换 " + fmt.textContent;
    });

    check("添加关键词规则生效", () => {
      const input = relDoc.querySelector("#newKeywordInput");
      input.value = "nightly";
      relDoc.querySelector("#addKeywordBtn")
        .dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
      const texts = Array.from(relDoc.querySelectorAll("#customKeywordsContainer .keyword-text"))
        .map((n) => n.textContent);
      assert(texts.includes("nightly"), "new keyword not rendered; got " + texts.slice(-4).join(","));
      return "共 " + texts.length + " 条规则";
    });

    check("切换上色开关生效", () => {
      const t = relDoc.querySelector("#toggleOddRowBtn");
      const before = t.innerHTML;
      t.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
      assert(t.innerHTML !== before, "toggle UI did not change");
      return before + " -> " + t.innerHTML;
    });

    check("三个功能开关各自持久化并生效", () => {
      const cases = [
        ["#svgToggleBtn", "svgEnabled"],
        ["#mobileFixToggleBtn", "mobileLayoutFix"],
        ["#highlightToggleBtn", "highlightEnabled"],
      ];
      const out = [];
      for (const [sel, key] of cases) {
        const btn = relDoc.querySelector(sel);
        assert(btn, "missing " + sel);
        const before = btn.innerHTML;
        btn.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
        assert(btn.innerHTML !== before, sel + " UI did not flip");
        assert(rel.store.get(key) === false,
          key + " not persisted (got " + String(rel.store.get(key)) + ")");
        // 再点回原状，避免影响后续断言
        btn.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
        assert(rel.store.get(key) === true, key + " did not flip back");
        out.push(key + "=" + before + "->" + btn.innerHTML);
      }
      return out.join(", ");
    });

    check("关闭图标识别后 SVG 图标被还原", () => {
      const btn = relDoc.querySelector("#svgToggleBtn");
      btn.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true })); // svgEnabled -> false
      assert(relDoc.querySelectorAll("svg.custom-svg-icon").length === 0,
        "custom icons not restored; remaining " + relDoc.querySelectorAll("svg.custom-svg-icon").length);
      // 6 个被替换行各自的原始 svg + Source code 行本身的原生 svg = 7
      const native = relDoc.querySelectorAll("svg[data-native]").length;
      assert(native === 7, "native icons not restored: " + native);
      btn.dispatchEvent(new relWin.MouseEvent("click", { bubbles: true })); // 还原
      assert(relDoc.querySelectorAll("svg.custom-svg-icon").length === 6, "custom icons not re-applied");
      return "关闭时还原为 " + native + " 个原生图标，重新开启后恢复 6 个";
    });

    check("确认保存写入 GM 存储", () => {
      relDoc.querySelector(".confirm-button")
        .dispatchEvent(new relWin.MouseEvent("click", { bubbles: true }));
      assert(rel.store.has("customColorsLight"), "customColorsLight not saved");
      assert(rel.store.has("colorToggleOdd"), "colorToggleOdd not saved");
      assert(rel.store.has("userCustomKeywords"), "userCustomKeywords not saved");
      assert(rel.store.has("deletedDefaults"), "deletedDefaults not saved");
      const saved = rel.store.get("customColorsLight");
      assert(/^#[0-9A-F]{6}$/i.test(saved.oddRowColor), "oddRowColor not hex: " + saved.oddRowColor);
      return JSON.stringify(saved);
    });

    check("确认后对话框关闭", () => {
      const dlg = relDoc.querySelector(".color-picker-dialog");
      assert(dlg && !dlg.classList.contains("visible"), "dialog still visible");
      return "ok";
    });

    check("无隐式全局泄漏（window.dialog 未被污染）", () => {
      assert(typeof relWin.dialog === "undefined",
        "window.dialog leaked: " + String(relWin.dialog));
      return "window.dialog = undefined";
    });
  }

  // ---------- 场景 3: 仓库主页（左侧悬浮导航） ----------
  const home = buildDOM("https://github.com/" + REPO);
  try {
    home.win.eval(body);
  } catch (err) {
    errors.push("eval(home): " + err.message);
  }
  const homeDoc = home.win.document;
  // dock 构建是 async（含 await harvest 与 500ms 有界重试），等它落定
  await wait(1500);

  check("仓库主页加载无异常", () => {
    assert(home.errors.length === 0, "window error: " + home.errors.join(" | "));
    assert(errors.length === 0, errors.join(" | "));
  });

  check("移动端布局修正样式已注入", () => {
    const styles = Array.from(homeDoc.querySelectorAll("style")).map((s) => s.textContent).join("\n");
    assert(styles.length > 0, "no styles injected");
    return "内联样式总长 " + styles.length;
  });

  check("悬浮导航球已创建", () => {
    assert(homeDoc.getElementById("mgga-nav-dock-toggle"), "#mgga-nav-dock-toggle missing");
    return "ok";
  });

  check("悬浮导航面板已构建且含导航项", () => {
    const panel = homeDoc.getElementById("mgga-nav-dock");
    assert(panel, "nav dock panel missing");
    const links = panel.querySelectorAll("a");
    assert(links.length > 0, "no nav items in panel");
    const labels = Array.from(links).map((a) => a.textContent.replace(/\d+$/, "").trim());
    const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
    assert(dupes.length === 0, "duplicate nav labels: " + dupes.join(","));
    return links.length + " 项: " + labels.join(" / ");
  });

  // ---------- 场景 3b: 溢出项免点击收割（2026-09-21 免点击改造回归） ----------
  // 现网 SSR 把溢出项直出在 nav 内的 li[data-menu-item][hidden] 里（hidden
  // 挂在 li 上、不在 a 上），GitHub 的 .js-responsive-underlinenav 行为只切
  // 可见性、从不插节点 —— 因此面板应能零点击拿到全部项，More 一次都别点。
  const resp = buildDOM("https://github.com/" + REPO, { dockFixture: repoHomeHTMLResponsive });
  const respMore = resp.win.document.getElementById("moreTrigger");
  let respMoreClicks = 0;
  respMore.addEventListener("click", () => { respMoreClicks++; });
  // jsdom 无布局：getBoundingClientRect 恒为 0，而 harvestMoreItems 对零尺寸
  // 触发器会直接早退（skipped=trigger-zero-size）—— 不打桩的话"clicks=0"
  // 是零尺寸早退凑出来的，验不到闸门。打桩后本断言才真正检验"闸门"。
  respMore.getBoundingClientRect = () => ({
    width: 80, height: 32, top: 0, left: 0, right: 80, bottom: 32,
  });
  try {
    resp.win.eval(body);
  } catch (err) {
    errors.push("eval(resp): " + err.message);
  }
  await wait(1500);

  const respPanel = resp.win.document.getElementById("mgga-nav-dock");

  check("免点击：响应式标签栏场景加载无异常", () => {
    assert(resp.errors.length === 0, "window error: " + resp.errors.join(" | "));
    assert(errors.length === 0, errors.join(" | "));
    return "ok";
  });

  check("免点击：More 触发器一次都未被点击", () => {
    assert(respMoreClicks === 0, "More clicked " + respMoreClicks + " time(s)");
    return "clicks=0";
  });

  check("免点击：溢出独有项（Wiki/Security/Insights）已进入面板", () => {
    assert(respPanel, "nav dock panel missing");
    const labels = Array.from(respPanel.querySelectorAll("a")).map((a) =>
      a.textContent.replace(/\s+/g, " ").trim()
    );
    for (const want of ["Wiki", "Security", "Insights"]) {
      assert(labels.includes(want), want + " missing; got " + labels.join(" / "));
    }
    return labels.join(" / ");
  });

  check("免点击：可见项与溢出副本去重后条目数正确", () => {
    const labels = Array.from(respPanel.querySelectorAll("a")).map((a) =>
      a.textContent.replace(/\s+/g, " ").trim()
    );
    // 4 个外显 tab + 3 个仅存在于溢出副本的 tab = 7
    assert(labels.length === 7, "expected 7 items, got " + labels.length + ": " + labels.join(" / "));
    const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
    assert(dupes.length === 0, "duplicate labels: " + dupes.join(","));
    return labels.length + " 项，无重复";
  });

  // ---------- 场景 3c: 面包屑栏不得参与点击收割（2026-09-21 多余点击根因回归） ----------
  // 面包屑栏的锚点全被剔除 ⇒ zeroClick 恒为 0 ⇒ 单看 zeroClick 的闸门会对它
  // 永久放行，每会话必然点开它的无名图标按钮，把 picker 链接塞进面板。
  // 修复后该栏既不索引也不点击（isDockEligibleBar 按 aria-label 识别）。
  const crumb = buildDOM("https://github.com/" + REPO, {
    dockFixture: () => repoHomeHTMLResponsive() + breadcrumbBarHTML(),
  });
  const crumbTrigger = crumb.win.document.getElementById("crumbTrigger");
  let crumbClicks = 0;
  crumbTrigger.addEventListener("click", () => {
    crumbClicks++;
    // 模拟仓库选择器 picker：点击后在 body 挂出含链接的菜单（真实行为）
    const menu = crumb.win.document.createElement("div");
    menu.className = "ActionMenu-Overlay picker";
    menu.setAttribute("role", "menu");
    menu.innerHTML =
      '<a href="/other/repo">Picker Repository</a>' +
      '<a href="/' + REPO + '/branches">Picker Branches</a>';
    menu.getBoundingClientRect = () => ({
      width: 260, height: 90, top: 0, left: 0, right: 260, bottom: 90,
    });
    crumb.win.document.body.appendChild(menu);
  });
  // 同上：给触发器打尺寸桩，避免"零尺寸早退"冒充闸门生效
  crumbTrigger.getBoundingClientRect = () => ({
    width: 24, height: 24, top: 0, left: 0, right: 24, bottom: 24,
  });
  try {
    crumb.win.eval(body);
  } catch (err) {
    errors.push("eval(crumb): " + err.message);
  }
  await wait(1500);

  const crumbPanel = crumb.win.document.getElementById("mgga-nav-dock");

  check("面包屑栏：无名图标触发器一次都未被点击", () => {
    assert(crumb.errors.length === 0, "window error: " + crumb.errors.join(" | "));
    assert(crumbClicks === 0, "breadcrumb trigger clicked " + crumbClicks + " time(s)");
    return "clicks=0";
  });

  check("面包屑栏：picker 链接未进入面板", () => {
    assert(crumbPanel, "nav dock panel missing");
    const labels = Array.from(crumbPanel.querySelectorAll("a")).map((a) =>
      a.textContent.replace(/\s+/g, " ").trim()
    );
    const junk = labels.filter((l) => /^Picker /.test(l));
    assert(junk.length === 0, "picker links leaked into panel: " + junk.join(" / "));
    return labels.join(" / ");
  });

  check("面包屑栏：仓库标签栏取数不受影响", () => {
    const labels = Array.from(crumbPanel.querySelectorAll("a")).map((a) =>
      a.textContent.replace(/\s+/g, " ").trim()
    );
    // 注意 Issues 带原生计数胶囊（"Issues12"），按前缀比对
    for (const want of ["Code", "Issues", "Wiki", "Security", "Insights"]) {
      assert(
        labels.some((l) => l.startsWith(want)),
        want + " missing; got " + labels.join(" / ")
      );
    }
    assert(labels.length === 7, "expected 7 items, got " + labels.length + ": " + labels.join(" / "));
    return labels.length + " 项（含 3 个溢出独有项）";
  });

  // ---------- 场景 3d: 概览文件条目点击 → 页内立即定位 / 交还原锚点 AJAX ----------
  // 2026-09-21 用户反馈：「点击 README 项之后无法立即定位到 README；默认情况下
  // README 不是在页面默认展示的吗？」以及「支持 AJAX 的项都要能立即定位并触发 AJAX」。
  // 根因：文件区概览 tab 的 href 是 React 客户端路由占位 `#`，取数链把 README
  // （默认选中）落成 location.pathname、把未选中项落成 blob 路径；面板克隆又
  // 不带 React 自有属性，于是点 README = 重载当前页 → 回到页首，既非定位也非 AJAX。
  const OV_URL = "https://github.com/" + REPO;
  const OV_FIXTURE = () => repoHomeHTMLResponsive() + overviewFilesHTML();

  /**
   * 建场景：假布局（README 正文绝对 2000、`#readme-ov-file` 绝对 1500，
   * 两者可区分 ⇒ 由 scrollTo 目标值即可判定定位到了哪个元素）+ scrollTo 记账。
   */
  async function buildOverviewScene(withOvId, reactManaged) {
    const sc = buildDOM(OV_URL, { dockFixture: OV_FIXTURE, quietNavigation: true });
    const d = sc.win.document;
    if (!withOvId) {
      const el = d.getElementById("readme-ov-file");
      if (el && el.parentNode) el.parentNode.removeChild(el);
      const sideLink = Array.from(d.querySelectorAll('a[href="#readme-ov-file"]'))[0];
      // 真实 SSR 形态：侧栏锚点在、目标元素不在
      if (!sideLink) throw new Error("fixture: #readme-ov-file anchor missing");
    }
    installFakeLayout(sc.win, { readmeArticle: 2000, "readme-ov-file": 1500 });
    if (reactManaged) {
      // 模拟已注水：React 把内部属性挂成 DOM 节点自有属性（cloneNode 不复制）
      const a = d.getElementById("ovContributing");
      a["__reactProps$test"] = {};
      a["__reactFiber$test"] = {};
    }
    sc.delegated = 0;
    const contrib = d.getElementById("ovContributing");
    if (contrib) contrib.addEventListener("click", () => sc.delegated++);
    try {
      sc.win.eval(body);
    } catch (err) {
      errors.push("eval(overview): " + err.message);
    }
    await wait(1200);
    return sc;
  }

  // 3d-1：README（目标 id 未渲染，靠"已选中正文块"兜住）→ 立即定位
  const ov1 = await buildOverviewScene(false, false);
  const ov1Readme = panelItemByLabel(ov1.win.document, "README");
  check("概览条目：README 点击就地定位到正文并置顶（不再重载当前页）", () => {
    assert(ov1.errors.length === 0, "window error: " + ov1.errors.join(" | "));
    assert(ov1Readme, "README item missing from panel");
    const hrefBefore = ov1.win.location.href;
    const ev = dispatchClick(ov1.win, ov1Readme);
    assert(ev.defaultPrevented, "click not intercepted (page would reload)");
    assert(
      ov1.win.__scrollCalls[0] === 2000,
      "located wrong target: scrollTo top = " + ov1.win.__scrollCalls[0]
    );
    assert(
      viewportTop(ov1.win, "readmeArticle") === 0,
      "article not pinned to viewport top: " + viewportTop(ov1.win, "readmeArticle")
    );
    assert(
      ov1.win.location.href === hrefBefore,
      "URL changed (hard navigation): " + ov1.win.location.href
    );
    return "→ #readmeArticle 置顶（top=2000），URL 未变";
  });

  // 3d-2：README（`#readme-ov-file` 目标已渲染）→ 认领 GitHub 自己的锚点 id
  const ov2 = await buildOverviewScene(true, false);
  const ov2Readme = panelItemByLabel(ov2.win.document, "README");
  check("概览条目：目标 id 已渲染时认领 GitHub 自己的锚点", () => {
    assert(ov2Readme, "README item missing from panel");
    const ev = dispatchClick(ov2.win, ov2Readme);
    assert(ev.defaultPrevented, "click not intercepted");
    assert(
      ov2.win.__scrollCalls[0] === 1500,
      "located wrong target: scrollTo top = " + ov2.win.__scrollCalls[0]
    );
    assert(
      viewportTop(ov2.win, "readme-ov-file") === 0,
      "anchor target not pinned: " + viewportTop(ov2.win, "readme-ov-file")
    );
    return "→ #readme-ov-file 置顶（top=1500）";
  });

  // 3d-3：未选中的概览 tab（Contributing）+ 原锚点已注水 → 交还原锚点触发 AJAX
  const ov3 = await buildOverviewScene(true, true);
  const ov3Contrib = panelItemByLabel(ov3.win.document, "Contributing");
  check("概览条目：未选中 tab 交还原锚点（React 路由 = AJAX）", () => {
    assert(ov3Contrib, "Contributing item missing from panel");
    const ev = dispatchClick(ov3.win, ov3Contrib);
    assert(ev.defaultPrevented, "click not intercepted");
    assert(ov3.delegated === 1, "original anchor clicked " + ov3.delegated + " time(s)");
    return "原锚点收到 1 次点击";
  });

  // 3d-4：非概览条目（Issues，真实 URL）→ 不接管，保持原生 href 导航
  const ov3Issues = panelItemByLabel(ov3.win.document, "Issues");
  check("概览条目：非概览项（Issues）不被接管", () => {
    assert(ov3Issues, "Issues item missing from panel");
    const ev = dispatchClick(ov3.win, ov3Issues);
    assert(!ev.defaultPrevented, "non-overview item was intercepted");
    return "原生 href 保留";
  });

  // 3d-5：修饰键点击 → 交还浏览器原生（新标签页等）
  check("概览条目：Ctrl+点击 README 不被接管", () => {
    const ev = dispatchClick(ov1.win, ov1Readme, { ctrlKey: true });
    assert(!ev.defaultPrevented, "ctrl+click was intercepted");
    return "原生行为保留";
  });

  // ---------- 场景 3e: 三层滚动 → 必须"置顶"而不是"下移" ----------
  // 用户反馈：「Repositories 的三个导航每次定位都会发生下移而不是置顶」。
  // 根因：`el.scrollIntoView()` 会把所有祖先滚动容器一并滚，每层偏移按**同一份
  // 初始几何**一次性算完 —— 新版仓库页里内容区自己就是 overflow 容器
  // （#repos-split-pane-content 带 tabindex），层数一多各层结果互相抵消，
  // 目标就停在视口偏下。本场景复刻三层结构（内容区自滚 + 粘性子导航 + 固定顶栏），
  // 断言"内层容器各滚各的量 + 窗口最后统一对齐 + 目标精确停在顶栏下沿"。
  const HEADER_H = 64;
  const PANE_ABS = 300; // 内容容器的文档绝对纵坐标
  const ART_IN_PANE = 900; // 正文相对容器滚动内容的纵坐标
  const STICKY_H = 40; // 容器内"已贴顶"的粘性子导航高度

  function layeredScrollHTML() {
    return (
      repoHomeHTMLResponsive() +
      '<header id="ghHeader" style="position:fixed;height:64px"></header>' +
      '<nav aria-label="Repository files" data-overflow-mode="wrap"><ul role="list">' +
      '<li><a id="ovReadme" href="#" aria-current="page">' +
      '<span data-component="text" data-content="README">README</span></a></li>' +
      "</ul></nav>" +
      '<div id="repos-split-pane-content" data-selector="repos-split-pane-content" ' +
      'style="overflow-y:auto" tabindex="0">' +
      '<nav id="paneSticky" style="position:sticky">Repository files</nav>' +
      '<article class="markdown-body entry-content" id="paneArticle"><h1>README</h1></article>' +
      "</div>" +
      // About 侧栏：只有 href、没有目标元素（真实 SSR 形态）
      '<div id="about"><div class="mt-2"><a href="#readme-ov-file">Readme</a></div></div>'
    );
  }

  const lz = buildDOM(OV_URL, { dockFixture: layeredScrollHTML, quietNavigation: true });
  {
    const w = lz.win;
    const d = w.document;
    stubViewportRect(d.getElementById("ghHeader"), 0, HEADER_H);
    const pane = stubScrollable(d.getElementById("repos-split-pane-content"), 4000, 600);
    installFakeLayout(w, {
      "repos-split-pane-content": () => {
        const top = PANE_ABS - w.__fakeY;
        return { top, bottom: top + 600, left: 0, right: 800, width: 800, height: 600, x: 0, y: top };
      },
      paneSticky: () => {
        const top = PANE_ABS - w.__fakeY; // 恒贴容器顶
        return { top, bottom: top + STICKY_H, left: 0, right: 800, width: 800, height: STICKY_H, x: 0, y: top };
      },
      paneArticle: () => {
        const top = PANE_ABS + ART_IN_PANE - w.__fakeY - pane.scrollTop;
        return { top, bottom: top + 600, left: 0, right: 800, width: 800, height: 600, x: 0, y: top };
      },
    });
    lz.pane = pane;
    try {
      w.eval(body);
    } catch (err) {
      errors.push("eval(layered): " + err.message);
    }
  }
  await wait(1200);
  const lzReadme = panelItemByLabel(lz.win.document, "README");

  check("置顶修复：三层滚动下正文精确停在顶栏下沿", () => {
    assert(lz.errors.length === 0, "window error: " + lz.errors.join(" | "));
    assert(lzReadme, "README item missing from panel");
    const ev = dispatchClick(lz.win, lzReadme);
    assert(ev.defaultPrevented, "click not intercepted");
    // 内层容器：扣掉 40px 粘性子导航，把正文顶到容器顶
    assert(lz.pane.scrollTop === 860, "pane.scrollTop = " + lz.pane.scrollTop);
    // 窗口：扣掉 64px 固定顶栏，做最后统一对齐
    assert(lz.win.__fakeY === 276, "window scroll top = " + lz.win.__fakeY);
    assert(
      viewportTop(lz.win, "paneArticle") === HEADER_H,
      "article viewport top = " + viewportTop(lz.win, "paneArticle")
    );
    return "容器 860 + 窗口 276 ⇒ 正文 elTop=64（顶栏下沿）";
  });

  await wait(1400); // 覆盖定位后的 1.2s 重定位窗口
  check("置顶修复：定位后不被二次滚动挪走（下移回归闸）", () => {
    assert(lz.win.__fakeY === 276, "window drifted to " + lz.win.__fakeY);
    assert(lz.pane.scrollTop === 860, "pane drifted to " + lz.pane.scrollTop);
    assert(
      viewportTop(lz.win, "paneArticle") === HEADER_H,
      "article not at top after settle: " + viewportTop(lz.win, "paneArticle")
    );
    return "1.4s 后无漂移";
  });

  // ---------- 场景 3f: 真实 URL 的社区文件链接不得被接管 ----------
  // 用户反馈：「点击导航的 LICENSE 会导致页面跳转至 .../blob/develop/LICENSE」。
  // 根因：上一版在等不到页内目标时执行 `location.assign(item.href)` —— 整页重载。
  // 正确行为：这类条目面板锚点自带真实 href，交还 Turbo 软导航，我们只旁观。
  function communityFileNavHTML() {
    return (
      '<nav aria-label="Repository"><ul>' +
      '<li><a id="fileLicense" href="/' + REPO + '/blob/develop/LICENSE">LICENSE</a></li>' +
      "</ul></nav>"
    );
  }
  const cf = buildDOM(OV_URL, {
    dockFixture: () => repoHomeHTMLResponsive() + communityFileNavHTML(),
    quietNavigation: true,
  });
  installFakeLayout(cf.win, {});
  try {
    cf.win.eval(body);
  } catch (err) {
    errors.push("eval(communityFile): " + err.message);
  }
  await wait(1200);
  const cfLicense = panelItemByLabel(cf.win.document, "LICENSE");

  check("禁止整页重载：真实 URL 的 LICENSE 条目不接管（交还软导航）", () => {
    assert(cf.errors.length === 0, "window error: " + cf.errors.join(" | "));
    assert(cfLicense, "LICENSE item missing from panel");
    assert(
      cfLicense.getAttribute("href") === "/" + REPO + "/blob/develop/LICENSE",
      "panel href = " + cfLicense.getAttribute("href")
    );
    const hrefBefore = cf.win.location.href;
    const ev = dispatchClick(cf.win, cfLicense);
    assert(
      !ev.defaultPrevented,
      "click was intercepted —— 上一版会在此 preventDefault 后 location.assign 整页重载"
    );
    assert(
      cf.win.location.href === hrefBefore,
      "URL changed: " + cf.win.location.href
    );
    return "未拦截，href 保持真实路径";
  });

  // ---------- 静态回归闸：分诊路径里不得再出现整页重载 ----------
  check("禁止整页重载：handleNavDockItemClick 内无 location.assign/replace", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    const i = raw.indexOf("function handleNavDockItemClick(");
    assert(i > 0, "handleNavDockItemClick not found");
    let s = raw.indexOf("{", i);
    let depth = 0;
    let j = s;
    for (; j < raw.length; j++) {
      if (raw[j] === "{") depth++;
      else if (raw[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    const fnBody = raw.slice(i, j + 1);
    const hit = fnBody.match(/location\s*\.\s*(assign|replace)\s*\(/);
    assert(!hit, "整页重载回归: " + (hit ? hit[0] : ""));
    return "只有软导航/页内定位";
  });

  // ---------- 场景 3g: 文件区 tab 切换后必须"吸顶"（Contributing / License） ----------
  // 用户反馈：「点击 README 不会下移，但点击 Contributing 和 License 却会下移一段距离，
  // 而不是和 README 一样吸顶」。
  // 根因：`-ov-file` **从来不是元素 id**（实证取自 GitHub 自身 bundle：它是
  // OverviewRepoFiles 组件的 React 路由键，只出现在 href / aria-current / ?tab=
  // 三处，页面里没有元素带这个 id）。旧版据此等待定位目标 ⇒ 必然等满超时 ⇒
  // tab 切了、页面却没被定位，于是"不像 README 那样吸顶"。
  // 修复：完成信号改为**选中态迁移**（栏内 aria-current 落到被点的 tab），
  // 目标改为**已渲染正文块**；切换完成后再补一次对齐。
  function fileTabSwitchHTML() {
    return (
      repoHomeHTMLResponsive() +
      '<nav aria-label="Repository files" data-overflow-mode="wrap"><ul role="list">' +
      '<li><a id="ovReadme" href="#" aria-current="page">' +
      '<span data-component="text" data-content="README">README</span></a></li>' +
      '<li><a id="ovContributing" href="#">' +
      '<span data-component="text" data-content="Contributing">Contributing</span></a></li>' +
      '<li><a id="ovLicense" href="#">' +
      '<span data-component="text" data-content="License">License</span></a></li>' +
      "</ul></nav>" +
      '<div data-selector="repos-split-pane-content" id="repos-split-pane-content" tabindex="0">' +
      '<div class="DirectoryRichtextContent-module__SharedMarkdownContent__hHXUL">' +
      '<article class="markdown-body entry-content" id="readmeArticle"><h1>README</h1></article>' +
      "</div></div>" +
      // About 侧栏：只有 href、没有目标元素 —— 与真实 SSR 逐字一致的形态
      '<div id="about"><div class="mt-2">' +
      '<a href="#contributing-ov-file">Contributing</a>' +
      '<a href="#License-1-ov-file">License</a>' +
      "</div></div>"
    );
  }

  const ft = buildDOM(OV_URL, { dockFixture: fileTabSwitchHTML, quietNavigation: true });
  {
    const w = ft.win;
    const d = w.document;
    ft.artAbs = 2000; // 正文的文档绝对纵坐标：随 tab 切换而变，用于证明"切换后重新对齐"
    installFakeLayout(w, {
      readmeArticle: () => {
        const top = ft.artAbs - w.__fakeY;
        return { top, bottom: top + 600, left: 0, right: 800, width: 800, height: 600, x: 0, y: top };
      },
    });
    const contrib = d.getElementById("ovContributing");
    const lic = d.getElementById("ovLicense");
    // 模拟已注水：React 把内部属性挂成 DOM 自有属性（cloneNode 不复制）
    contrib["__reactProps$test"] = {};
    contrib["__reactFiber$test"] = {};
    lic["__reactProps$test"] = {};
    // 模拟真实切 tab：选中态迁移 + 新正文换出（文档位置随之改变）
    ft.switches = 0;
    const wire = (anchor, absTop) => {
      anchor.addEventListener("click", () => {
        ft.switches++;
        d.querySelectorAll("nav[aria-label='Repository files'] [aria-current]").forEach((a) =>
          a.removeAttribute("aria-current")
        );
        anchor.setAttribute("aria-current", "page");
        ft.artAbs = absTop;
        d.getElementById("readmeArticle").innerHTML = "<h1>" + anchor.textContent + "</h1>";
      });
    };
    wire(contrib, 3200);
    wire(lic, 4400);
    try {
      w.eval(body);
    } catch (err) {
      errors.push("eval(fileTab): " + err.message);
    }
  }
  await wait(1200);

  check("文件区 tab：真实形态下 `-ov-file` 不是元素 id（夹具自证根因）", () => {
    const d = ft.win.document;
    assert(!d.getElementById("contributing-ov-file"), "fixture 不该有 #contributing-ov-file 元素");
    assert(!d.getElementById("License-1-ov-file"), "fixture 不该有 #License-1-ov-file 元素");
    assert(
      d.querySelectorAll('a[href="#contributing-ov-file"]').length === 1,
      "侧栏路由键锚点应存在"
    );
    return "只有 href 路由键，没有对应元素";
  });

  await (async () => {
    const fc = panelItemByLabel(ft.win.document, "Contributing");
    ft.contribClick = fc;
    if (fc) dispatchClick(ft.win, fc);
    await wait(500); // 覆盖 rAF 轮询（选中态迁移 → 补一次对齐）
  })();

  check("文件区 tab：切换完成后对新正文吸顶（不再「下移一段距离」）", () => {
    assert(ft.contribClick, "Contributing item missing from panel");
    assert(ft.errors.length === 0, "window error: " + ft.errors.join(" | "));
    assert(ft.switches === 1, "原锚点被点了 " + ft.switches + " 次（应恰好 1 次）");
    const calls = ft.win.__scrollCalls;
    assert(
      calls[calls.length - 1] === 3200,
      "切换后未重新对齐：最后一次 scrollTo = " + calls[calls.length - 1] + "，调用序列 " + calls.join(",")
    );
    assert(
      viewportTop(ft.win, "readmeArticle") === 0,
      "新正文未吸顶：elTop = " + viewportTop(ft.win, "readmeArticle")
    );
    return "先 2000 → 切换后 3200 ⇒ elTop=0";
  });

  await (async () => {
    const fl = panelItemByLabel(ft.win.document, "License");
    ft.licenseClick = fl;
    ft.win.__scrollCalls.length = 0;
    if (fl) dispatchClick(ft.win, fl);
    await wait(500);
  })();

  check("文件区 tab：License 同样吸顶（不同形状的路由键 id）", () => {
    assert(ft.licenseClick, "License item missing from panel");
    assert(ft.switches === 2, "原锚点累计点击 " + ft.switches + " 次（应为 2）");
    const calls = ft.win.__scrollCalls;
    assert(
      calls[calls.length - 1] === 4400,
      "切换后未重新对齐：最后一次 scrollTo = " + calls[calls.length - 1]
    );
    assert(
      viewportTop(ft.win, "readmeArticle") === 0,
      "新正文未吸顶：elTop = " + viewportTop(ft.win, "readmeArticle")
    );
    return "→ 4400 ⇒ elTop=0";
  });

  // ---------- 场景 3h: 已在本页时点本页 tab → 不重载，只回内容顶部 ----------
  // 用户反馈：「当页面已经处于 code 页面时，再点击 Code 就应该 Ajax 吸顶而不重载」。
  // 根因：Code 落地路径 == location.pathname，旧版分诊把它判成"不接管"，于是
  // 交给浏览器/Turbo 做同 URL 导航 —— 重取整块内容 + 滚动归零，用户感知即"重载"。
  const SAME_PANE_ABS = 300; // 内容区根的文档绝对纵坐标
  const SAME_HEADER_H = 64; // 固定顶栏

  function samePageTabHTML() {
    return (
      repoHomeHTMLResponsive() +
      '<header id="ghHeader" style="position:fixed;height:' + SAME_HEADER_H + 'px"></header>' +
      '<div id="repos-split-pane-content" data-selector="repos-split-pane-content" ' +
      'style="overflow-y:auto" tabindex="0">' +
      '<article class="markdown-body entry-content" id="paneArticle"><h1>README</h1></article>' +
      "</div>"
    );
  }

  const sp = buildDOM(OV_URL, { dockFixture: samePageTabHTML, quietNavigation: true });
  {
    const w = sp.win;
    const d = w.document;
    stubViewportRect(d.getElementById("ghHeader"), 0, SAME_HEADER_H);
    sp.pane = stubScrollable(d.getElementById("repos-split-pane-content"), 4000, 600);
    installFakeLayout(w, {
      "repos-split-pane-content": () => {
        const top = SAME_PANE_ABS - w.__fakeY;
        return { top, bottom: top + 600, left: 0, right: 800, width: 800, height: 600, x: 0, y: top };
      },
    });
    try {
      w.eval(body);
    } catch (err) {
      errors.push("eval(samePage): " + err.message);
    }
  }
  await wait(1200);
  const spCode = panelItemByLabel(sp.win.document, "Code");

  check("同页 tab：点 Code 不发起导航（不再重载），只回内容顶部", () => {
    assert(sp.errors.length === 0, "window error: " + sp.errors.join(" | "));
    assert(spCode, "Code item missing from panel");
    assert(
      new RegExp("/" + REPO + "$").test(spCode.getAttribute("href")),
      "面板 Code 落地路径 = " + spCode.getAttribute("href")
    );
    // 先"滚到半路"，模拟用户已在 Code 页往下看
    sp.win.__fakeY = 900;
    sp.pane.scrollTop = 700;
    sp.win.__scrollCalls.length = 0;
    const hrefBefore = sp.win.location.href;
    const ev = dispatchClick(sp.win, spCode);
    assert(ev.defaultPrevented, "同页 Code 未被接管 —— 会走同 URL 导航 = 重载");
    assert(
      sp.win.location.href === hrefBefore,
      "URL 变了（发生了导航）: " + sp.win.location.href
    );
    // 内层滚动容器自身归零（#repos-split-pane-content 自己就是滚动容器）
    assert(sp.pane.scrollTop === 0, "内容区内部未归零: scrollTop = " + sp.pane.scrollTop);
    // 窗口对齐到内容区顶部（扣掉 64px 固定顶栏）
    assert(
      sp.win.__fakeY === SAME_PANE_ABS - SAME_HEADER_H,
      "窗口未回内容顶部: __fakeY = " + sp.win.__fakeY
    );
    assert(
      viewportTop(sp.win, "repos-split-pane-content") === SAME_HEADER_H,
      "内容区未吸顶: elTop = " + viewportTop(sp.win, "repos-split-pane-content")
    );
    return "scrollTop 700→0，窗口 900→" + (SAME_PANE_ABS - SAME_HEADER_H) + "，URL 未变";
  });

  check("同页 tab：跨页条目（Code 之外的 Insights）仍不接管", () => {
    const ins = panelItemByLabel(sp.win.document, "Insights");
    assert(ins, "Insights item missing from panel");
    const ev = dispatchClick(sp.win, ins);
    assert(!ev.defaultPrevented, "跨页条目被误接管");
    return "原生 href 保留";
  });

  // ---------- 场景 4: GitHub 改版形态（无 .Box--condensed 内部类名） ----------
  const alt = buildDOM("https://github.com/" + REPO + "/releases", {
    useFallbackSelectors: true,
  });
  try {
    alt.win.eval(body);
  } catch (err) {
    errors.push("eval(alt): " + err.message);
  }
  const altDoc = alt.win.document;

  check("改版形态加载无异常", () => {
    assert(alt.errors.length === 0, "window error: " + alt.errors.join(" | "));
    return "ok";
  });

  check("选择器兜底：data-testid 形态下仍能替换图标", () => {
    const icons = altDoc.querySelectorAll("svg.custom-svg-icon");
    assert(icons.length === 6, "fallback selector failed, got " + icons.length + " icons");
    return "兜底路径替换 " + icons.length + " 个图标";
  });

  check("选择器兜底：data-testid 形态下关键词仍高亮", () => {
    const hl = altDoc.querySelectorAll(".arch-highlight");
    assert(hl.length > 0, "no highlight under fallback selectors");
    return hl.length + " 处高亮";
  });

  check("选择器兜底：data-testid 形态下上色规则已注入", () => {
    const styleEl = altDoc.getElementById("Make-GitHub-Great-Again-style");
    assert(styleEl, "page style element missing");
    assert(/\[data-testid="release-assets"\] li\.Box-row/.test(styleEl.textContent),
      "fallback CSS rule not present");
    return "兜底 CSS 规则已写入";
  });

  // ---------- 场景 5: 非仓库页（SPA 导航离开） ----------
  check("SPA 导航到非 Release 页不抛错", () => {
    home.win.history.pushState({}, "", "https://github.com/settings/profile");
    homeDoc.dispatchEvent(new home.win.Event("turbo:load"));
    home.win.dispatchEvent(new home.win.Event("popstate"));
    return "事件已派发";
  });
  await wait(300);

  check("SPA 离开仓库主页后 dock 已清理", () => {
    assert(!homeDoc.getElementById("mgga-nav-dock-toggle"),
      "dock toggle should be removed off repo home");
    return "已清理";
  });

  // ---------- 输出 ----------
  const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
  const lines = ["=== MGGA 主脚本冒烟测试 ===", ""];
  for (const r of results) {
    lines.push(`${r.ok ? "PASS" : "FAIL"}  ${pad(r.name, 44)} ${r.detail}`);
  }
  const failed = results.filter((r) => !r.ok);
  lines.push("");
  lines.push(`共 ${results.length} 项，PASS ${results.length - failed.length}，FAIL ${failed.length}`);
  lines.push("");
  const report = lines.join("\n");
  try {
    fs.writeFileSync(path.join(__dirname, "..", ".workbuddy", "_smoke.txt"), report, "utf8");
  } catch (_) { /* 报告写盘失败不影响退出码 */ }
  process.stdout.write(report + "\n");
  process.exit(failed.length === 0 ? 0 : 1);
}

run();
