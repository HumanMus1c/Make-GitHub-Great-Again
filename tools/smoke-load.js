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

/**
 * Primer UnderlineNav（@primer/react 38.40）在窄视口下的真实形态。
 *
 * 事实依据：`UnderlineNavItem` 源码 ——
 *   const isOverflowing = useIsClipped(ref);      // IntersectionObserver
 *   <li aria-hidden={isOverflowing || undefined}>
 *     <a href={href} tabIndex={isOverflowing ? -1 : undefined}>
 * 剪裁项本体**仍在 DOM 里、href 完整**，只有所在 <li> 被标 aria-hidden；
 * More 菜单（ActionMenu.Overlay，运行时 id 形如 `_R_1afl_`）只在展开时才渲染，
 * 里面那几份是副本。类名与本地留档 SSR 逐字一致（含构建哈希后缀），
 * 用来证明修复**不依赖类名**。
 *
 * Pull requests / Actions / Wiki / Security and quality / Insights 五项只以
 * 剪裁项形态存在（aria-hidden 的 li 内）—— 它们是"移动端首帧就在窄视口
 * 初始化时，收纳进 More 的项会不会丢"的判定样本。
 */
function repoHomeHTMLPrimerOverflow() {
  const item = (href, text, counter, clipped, current) =>
    '<li class="prc-UnderlineNav-UnderlineNavItem-syRjR"' +
    (clipped ? ' aria-hidden="true"' : "") +
    ">" +
    '<a href="' +
    href +
    '" class="prc-components-UnderlineItem-7fP-n"' +
    (current ? ' aria-current="page"' : "") +
    (clipped ? ' tabindex="-1"' : "") +
    ">" +
    '<span data-component="text">' +
    text +
    "</span>" +
    (counter
      ? '<span data-component="counter"><span class="Counter">' + counter + "</span></span>"
      : "") +
    "</a></li>";

  return (
    '<nav class="prc-components-UnderlineWrapper-eT-Yj prc-UnderlineNav-UnderlineWrapper-GWONT" ' +
    'aria-label="Repository" data-variant="inset" data-overflow-mode="wrap" data-has-overflow="true">' +
    '<ul role="list" class="prc-UnderlineNav-ItemsList-oj8gN">' +
    '<li role="presentation" aria-hidden="true" class="prc-UnderlineNav-WrapSpacer--aLgz"></li>' +
    item(REPO_SLUG, "Code", "", false, true) +
    item(REPO_SLUG + "/issues", "Issues", "12", false, false) +
    item(REPO_SLUG + "/pulls", "Pull requests", "", true, false) +
    item(REPO_SLUG + "/actions", "Actions", "", true, false) +
    item(REPO_SLUG + "/wiki", "Wiki", "", true, false) +
    item(REPO_SLUG + "/security", "Security and quality", "", true, false) +
    item(REPO_SLUG + "/pulse", "Insights", "", true, false) +
    "</ul>" +
    '<div class="prc-UnderlineNav-MoreButtonContainer-Dnrq6">' +
    '<div class="prc-UnderlineNav-MoreButtonDivider-dN0a-"></div>' +
    '<button id="primerMore" type="button" data-component="overflow-menu-button" ' +
    'aria-haspopup="true" aria-expanded="false" class="prc-UnderlineNav-MoreButton-Y8soj">' +
    '<span>More<span class="prc-src-InternalVisuallyHidden-2YaI6"> items</span></span>' +
    "</button></div></nav>"
  );
}

/**
 * 反向样本：**装饰/重复**的 aria-hidden 包装层必须继续被剔除。
 *   ① 容器内有多个锚点（重复导航副本）；
 *   ② 容器不是 `<li>`（包装 div）。
 * 两者都不满足"单个导航项容器"判据，照旧按 ariaHidden 拒收。
 */
function decorativeAriaHiddenNavHTML() {
  return (
    '<nav aria-label="Duplicate Bar"><ul role="list">' +
    '<div aria-hidden="true">' +
    '<a href="' + REPO_SLUG + '/decoy-one">Decoy One</a>' +
    '<a href="' + REPO_SLUG + '/decoy-two">Decoy Two</a>' +
    "</div>" +
    '<div aria-hidden="true"><a href="' + REPO_SLUG + '/decoy-three">Decoy Three</a></div>' +
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
  // 窄视口首帧形态：放不下的 tab 被 Primer 折进 More（本体仍在 DOM、
  // 所在 li 标 aria-hidden）。用于"页面上看不到这个 tab 时该不该定位"。
  const clipContrib = !!(opts && opts.clipContributing);
  return (
    '<nav aria-label="Repository files" data-overflow-mode="wrap"><ul role="list">' +
    '<li role="presentation" aria-hidden="true" class="wrap-spacer"></li>' +
    '<li><a id="ovReadme" href="#" aria-current="page">' +
    '<span data-component="text" data-content="README">README</span></a></li>' +
    (clipContrib
      ? '<li class="prc-UnderlineNav-UnderlineNavItem-syRjR" aria-hidden="true">' +
        '<a id="ovContributing" href="#" tabindex="-1">'
      : '<li><a id="ovContributing" href="#">') +
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
    check("打开设置面板无异常（标题栏版本号取自 @version 单一来源）", () => {
      settingsCmd.fn();
      const dlg = relDoc.querySelector(".color-picker-dialog");
      assert(dlg, ".color-picker-dialog not created");
      assert(dlg.classList.contains("visible"), "dialog not marked visible");
      const t = dlg.querySelector(".color-picker-title");
      assert(t, "设置面板标题缺失");
      assert(
        t.textContent.indexOf("v" + HEADER_VERSION) >= 0,
        "设置面板标题里的版本号不是 @version(" + HEADER_VERSION + "): " +
          JSON.stringify(t.textContent)
      );
      return "版本号渲染: v" + HEADER_VERSION;
    });

    check("面板控件齐备", () => {
      ["#oddRowColorBtn", "#evenRowColorBtn", "#hoverColorBtn", "#svgToggleBtn",
       "#highlightToggleBtn", "#customKeywordsContainer",
       "#newKeywordInput", "#addKeywordBtn", ".confirm-button", ".cancel-button",
       ".reset-button"].forEach((sel) => {
        assert(relDoc.querySelector(sel), "missing " + sel);
      });
      return "11 个控件全部存在";
    });

    check("设置面板关闭控件：<button> 装 SVG 叉号 + 无障碍名（与导航面板成对，见源码闸门）", () => {
      const c = relDoc.querySelector(".color-picker-dialog .color-picker-close");
      assert(c, "关闭控件缺失");
      assert(
        c.tagName === "BUTTON",
        "关闭控件应是 <button>（与导航面板一致），实际 " + c.tagName
      );
      assert(
        c.getAttribute("type") === "button",
        "缺 type=button ⇒ 位于 form 内会被当成提交按钮"
      );
      // 图标已从 unicode 字形换成 SVG（审计 §2.3）：这里要同时证明
      // ① 确实有 SVG ② 它确实是**叉号**而不是对勾/撤销箭头。
      const svg = c.querySelector("svg");
      assert(svg, "关闭控件里没有 svg ⇒ 又退回 unicode 字形了");
      assert(
        svg.getAttribute("viewBox") === "0 0 16 16",
        "图标不是 16px octicon 网格，实际 viewBox=" + JSON.stringify(svg.getAttribute("viewBox"))
      );
      const path = svg.querySelector("path");
      assert(path, "图标缺 path 数据");
      const src = fs.readFileSync(SCRIPT, "utf8");
      const xPath = /const UI_ICON_X_PATH\s*=\s*"([^"]+)"/.exec(src);
      assert(xPath, "源码里找不到 UI_ICON_X_PATH ⇒ 图标单一来源被拆了");
      assert(
        path.getAttribute("d") === xPath[1],
        "关闭控件里的图标不是叉号（与 UI_ICON_X_PATH 不符）"
      );
      assert(
        c.textContent.trim() === "",
        "关闭控件里还残留文字字形，实际 " + JSON.stringify(c.textContent)
      );
      assert(
        (c.getAttribute("aria-label") || "").length > 0,
        "关闭控件缺 aria-label"
      );
      return "button + svg(octicon x-16) + aria-label";
    });

    check("设置面板悬浮球：图标改为 SVG（不再是 unicode），并挂上入场动画类", () => {
      const fab = relDoc.getElementById("mgga-float-btn");
      assert(fab, "#mgga-float-btn missing");
      const svg = fab.querySelector(":scope > svg");
      assert(svg, "悬浮球里没有 svg ⇒ 还在用 unicode 字形");
      assert(
        fab.textContent.trim() === "",
        "悬浮球里仍有文字节点: " + JSON.stringify(fab.textContent)
      );
      assert(
        fab.children.length === 1,
        "悬浮球应只有图标一个子元素，实际 " + fab.children.length
      );
      assert(
        svg.getAttribute("viewBox") === "0 0 16 16",
        "图标 viewBox 不对: " + svg.getAttribute("viewBox")
      );
      const d = svg.querySelector("path") && svg.querySelector("path").getAttribute("d");
      assert(d && d.length > 100, "齿轮 path 缺失或过短");
      assert(
        !svg.getAttribute("width") && !svg.getAttribute("height"),
        "图标不该写死 width/height 属性 ⇒ 尺寸必须交给 CSS 的 --mgga-fab-icon"
      );
      assert(
        fab.classList.contains("mgga-fab-pop"),
        "新建的悬浮球没有挂入场动画类（页面刷新时应当各触发一次）"
      );
      return "svg viewBox 16 + path " + d.length + " 字符 + mgga-fab-pop";
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

    // ---------- 静态回归闸：取色器容器宽度必须是定值 ----------
    // 用户反馈：「色值类型切到 RGB / HSL 时取色器面板右侧瞬间多出一倍空白」。
    // 根因（真机取证 docs/discussions/2026-09-23-picker-width-max-content.md）：
    //   祖先 `.custom-color-picker-panel` 是 `width: max-content`，
    //   在固有尺寸计算那一遍包含块宽度**不定** ⇒ 百分比按 auto 处理 ⇒ 容器原写法
    //   `width: min(250px, 100%)` 拿不出 250px，退化成"取内容固有尺寸"；
    //   而 `<input type="text">` 不带 size 时固有宽按**默认 20 字符**计，
    //   切到 RGB/HSL 多出的三个数字框各贡献 ≈165px ⇒ 面板 281.17 → 605.67，
    //   容器却恒 250、输入行实际布局逐字不动（227.63）⇒ 多出的 331.28px 全成空白。
    // jsdom 无排版层 ⇒ 这条只锁源码声明（宽度必须写成定值），几何交给真机探针
    // `.workbuddy/probe/diag-picker-format-width.js`（三种格式各量一次面板/容器/留白）。
    check("取色器容器宽度是定值（不给 max-content 祖先留漏）", () => {
      const src = fs.readFileSync(SCRIPT, "utf8"); // 本区块作用域里没有 raw，就地读（同 940/1494 等处）
      const ruleM = /\.builtin-color-picker-container\s*\{([^}]*)\}/.exec(src);
      assert(ruleM, "找不到 .builtin-color-picker-container 规则");
      const body = ruleM[1].replace(/\/\*[\s\S]*?\*\//g, ""); // 去掉注释再断言，免得注释自伤
      assert(/width:\s*250px\s*;/.test(body), "容器宽度不是定值 250px");
      assert(/max-width:\s*100%\s*;/.test(body), "容器缺少窄屏收缩用的 max-width:100%");
      assert(
        !/\bmin\s*\(\s*250px/.test(body),
        "容器宽度又回到 min(250px, 100%) 这种不定值写法 ⇒ 面板会被内部输入框的固有宽度撑开"
      );
      return "容器宽度 = 250px + max-width:100%（窄屏仍可收缩）";
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

    check("两个功能开关各自持久化并生效", () => {
      const cases = [
        ["#svgToggleBtn", "svgEnabled"],
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

  check("导航悬浮球：蓝色数量气泡已移除，图标 svg 与入场动画类都在", () => {
    const fab = homeDoc.getElementById("mgga-nav-dock-toggle");
    assert(fab, "#mgga-nav-dock-toggle missing");
    assert(
      !fab.querySelector(".mgga-nav-dock-badge"),
      "导航项数量蓝色气泡还在（用户已要求移除）"
    );
    assert(
      fab.children.length === 1,
      "悬浮球应只剩图标一个子元素（气泡移除后），实际 " + fab.children.length
    );
    const svg = fab.querySelector(":scope > svg");
    assert(svg, "导航球图标 svg 缺失");
    assert(
      svg.getAttribute("viewBox") === "0 0 16 16",
      "导航球图标 viewBox 不对: " + svg.getAttribute("viewBox")
    );
    assert(
      fab.classList.contains("mgga-fab-pop"),
      "新建的导航球没有挂入场动画类（页面刷新时应当各触发一次）"
    );
    return "无气泡 + svg viewBox 16 + mgga-fab-pop";
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

  check("面板标题栏：标题为品牌名 MGGA，版本角标与关闭按钮仍在", () => {
    const panel = homeDoc.getElementById("mgga-nav-dock");
    const title = panel.querySelector(
      ":scope > .mgga-nav-dock-header > .mgga-nav-dock-header-title"
    );
    assert(title, "header title missing");
    assert(
      title.textContent.trim() === "MGGA",
      "标题应为 MGGA，实际 = " + JSON.stringify(title.textContent)
    );
    assert(
      /^v\d/.test(
        (panel.querySelector(".mgga-nav-dock-header-version") || {}).textContent || ""
      ),
      "版本角标缺失"
    );
    assert(panel.querySelector(".mgga-nav-dock-close"), "关闭按钮缺失");
    // 标题栏必须是面板的**第一个元素子节点**，且**不得落在滚动区里**：
    // ① 面板是 flex 列，标题栏排第一段、滚动区（.mgga-nav-dock-body）排第二段，
    //    滚动条只画在 body 上 —— 标题栏那一行因此永远不会出现滚动条（用户诉求）；
    // ② 用户给的 div:nth-child(N) 编号（分割线）现在以下沉一层的 body 为参照系。
    const firstChild = panel.firstElementChild;
    assert(
      firstChild && firstChild.classList.contains("mgga-nav-dock-header"),
      "标题栏不再是面板首个子节点 ⇒ 被挤压或跑到滚动口下方"
    );
    const scroller = panel.querySelector(":scope > .mgga-nav-dock-body");
    assert(scroller, "面板缺少滚动区 .mgga-nav-dock-body ⇒ 滚动条无处安放");
    assert(
      scroller.previousElementSibling === firstChild,
      "滚动区必须紧跟标题栏（否则标题栏会被挤到滚动口下面）"
    );
    assert(
      !scroller.contains(firstChild) && !firstChild.closest(".mgga-nav-dock-body"),
      "标题栏落进了滚动区 ⇒ 滚动条又会盖住它"
    );
    assert(scroller.querySelector("a"), "滚动区里没有条目（条目没下沉到 body）");
    // 标题改了品牌名，但面板的无障碍名仍应是可本地化的 navDock 文案
    // （jsdom 的 navigator.language 是 en-US ⇒ 这里取到英文，两种都接受）
    const ariaLabel = panel.getAttribute("aria-label") || "";
    assert(
      ariaLabel === "左侧悬浮导航" || ariaLabel === "Floating nav dock",
      "aria-label 应保持可本地化文案，实际 = " + ariaLabel
    );
    return "标题 MGGA + 版本角标 + 关闭按钮 + aria-label 未受影响";
  });

  // ---------- 场景 3a-2: 导航面板标题栏补上 Release 设置面板的 GitHub 印记 ----------
  // 用户诉求：「将导航栏和 release 页的设置面板的标题栏统一一下，将高度改为导航栏的
  // 标准，标题文本自适应缩小，在导航栏的标题栏基础上再补上 Release 页设置面板的
  // Github SVG icon 图标」。
  // 这里只压得住「图标」与「标题文本没被污染」两部分；高度与字号标准是声明层面的，
  // jsdom 量不出像素 ⇒ 交给下面的源码级闸门（两处声明逐项对齐），真机几何另算。
  check("导航面板标题栏：补上设置面板的 GitHub 印记，标题文本仍为 MGGA", () => {
    const panel = homeDoc.getElementById("mgga-nav-dock");
    const title = panel.querySelector(
      ":scope > .mgga-nav-dock-header > .mgga-nav-dock-header-title"
    );
    assert(title, "header title missing");
    const svg = title.querySelector(":scope > svg");
    assert(svg, "标题栏缺少 GitHub 印记 svg（本次新增）");
    assert(
      title.firstElementChild === svg,
      "印记不是标题栏首个子节点 ⇒ 图标跑到文字后面去了"
    );
    assert(
      svg.getAttribute("viewBox") === "0 0 16 16",
      "印记 viewBox 不对: " + svg.getAttribute("viewBox")
    );
    assert(
      svg.getAttribute("aria-hidden") === "true",
      "装饰性印记必须 aria-hidden，否则读屏会把它念成内容"
    );
    const path = svg.querySelector("path");
    assert(path && path.getAttribute("d"), "印记缺少 path");

    // 单一来源：面板里的 d 必须与源码里那份 GITHUB_MARK_PATH 逐字符相同
    const raw = fs.readFileSync(SCRIPT, "utf8");
    const m = raw.match(/const GITHUB_MARK_PATH\s*=\s*\r?\n?\s*"([^"]+)"/);
    assert(m, "源码里找不到 GITHUB_MARK_PATH 单一来源");
    assert(
      path.getAttribute("d") === m[1],
      "导航栏印记与 GITHUB_MARK_PATH 不是同一份路径 ⇒ 又出现两份各改各的"
    );
    assert(
      title.textContent.trim() === "MGGA",
      "加了图标后标题文本被污染: " + JSON.stringify(title.textContent)
    );
    return "印记 viewBox 16 + aria-hidden + 与 GITHUB_MARK_PATH 同源，标题文本仍为 MGGA";
  });

  // 版本号单一来源（本次把 @version 改成 2026.9.23）：导航面板与设置面板都得从
  // @version（GM_info）取值，两处都不许写死 —— 写死的地方会在下次改版本号时静默过期。
  // 设置面板那一半在「打开设置面板」场景里断言（对话框那时还在 DOM 里，随后就被关了）。
  check("版本号：导航面板角标取自 @version 单一来源", () => {
    assert(
      /^\d{4}\.\d{1,2}\.\d{1,2}$/.test(HEADER_VERSION),
      "@version 不是日期式版本号: " + HEADER_VERSION
    );
    const panel = homeDoc.getElementById("mgga-nav-dock");
    const ver = panel.querySelector(".mgga-nav-dock-header-version");
    assert(ver, "导航面板缺少版本角标");
    assert(
      ver.textContent === "v" + HEADER_VERSION,
      "导航面板版本角标 = " + JSON.stringify(ver.textContent) +
        "，应为 v" + HEADER_VERSION
    );
    return "导航面板版本角标 = v" + HEADER_VERSION;
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

  // ---------- 场景 3e: Primer UnderlineNav 剪裁溢出项（移动端首帧窄视口） ----------
  // 窄视口下放不下的 tab 被 Primer 剪裁：项本体**仍在 DOM 里、href 完整**，
  // 只有所在 li 被标 aria-hidden="true"、锚点 tabIndex=-1（38.40
  // UnderlineNavItem 源码；More 菜单里的副本只在展开时才渲染）。
  // 旧规则"aria-hidden 祖先一律不索引"把这批项整批误杀 ⇒ 面板只剩外显的
  // Code/Issues（用户实测：脚本首帧就在移动端初始化时，收纳进 More 的项
  // 丢失）。修复只放行"li 内唯一锚点"的剪裁项容器，零点击设计不变。
  const primer = buildDOM("https://github.com/" + REPO, {
    dockFixture: () => repoHomeHTMLPrimerOverflow() + decorativeAriaHiddenNavHTML(),
  });
  const primerMore = primer.win.document.getElementById("primerMore");
  let primerMoreClicks = 0;
  primerMore.addEventListener("click", () => {
    primerMoreClicks++;
  });
  // 打尺寸桩：jsdom 无布局，不打桩时"clicks=0"是零尺寸早退凑出来的，
  // 验不到闸门本身（同场景 3b 的坑）
  primerMore.getBoundingClientRect = () => ({
    width: 80, height: 32, top: 0, left: 0, right: 80, bottom: 32,
  });
  try {
    primer.win.eval(body);
  } catch (err) {
    errors.push("eval(primer): " + err.message);
  }
  await wait(1500);

  const primerPanel = primer.win.document.getElementById("mgga-nav-dock");
  const primerLabels = primerPanel
    ? Array.from(primerPanel.querySelectorAll("a")).map((a) =>
        a.textContent.replace(/\s+/g, " ").replace(/\d+$/, "").trim()
      )
    : [];

  check("Primer 剪裁项：加载无异常且面板非空", () => {
    assert(primer.errors.length === 0, "window error: " + primer.errors.join(" | "));
    assert(primerPanel, "nav dock panel missing");
    assert(primerLabels.length > 0, "panel empty");
    return primerLabels.join(" / ");
  });

  check("Primer 剪裁项：剪裁溢出项全部进入面板", () => {
    for (const want of [
      "Pull requests",
      "Actions",
      "Wiki",
      "Security and quality",
      "Insights",
    ]) {
      assert(
        primerLabels.includes(want),
        want + " missing; got " + primerLabels.join(" / ")
      );
    }
    return primerLabels.join(" / ");
  });

  check("Primer 剪裁项：条数与去重正确（7 项，无重复）", () => {
    // 2 个外显 tab + 5 个剪裁项 = 7
    assert(
      primerLabels.length === 7,
      "expected 7 items, got " + primerLabels.length + ": " + primerLabels.join(" / ")
    );
    const dupes = primerLabels.filter((l, i) => primerLabels.indexOf(l) !== i);
    assert(dupes.length === 0, "duplicate labels: " + dupes.join(","));
    return primerLabels.length + " 项，无重复";
  });

  check("Primer 剪裁项：免点击取数（More 一次都未被点击）", () => {
    assert(primerMoreClicks === 0, "More clicked " + primerMoreClicks + " time(s)");
    return "clicks=0";
  });

  check("Primer 剪裁项：装饰性 aria-hidden 包装层仍被剔除", () => {
    const junk = primerLabels.filter((l) => /^Decoy /.test(l));
    assert(
      junk.length === 0,
      "decorative aria-hidden anchors leaked into panel: " + junk.join(" / ")
    );
    return "无 Decoy 泄漏";
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

  // ---------- 静态回归闸：分区小标题不得复活 ----------
  // 小标题有三个可能复活的地方：① 渲染代码建 caption 节点 ② 样式表留 caption 规则
  // ③ 面板标题写回 i18n.t("navDock")（用户要求显示品牌名 MGGA）。
  // 三处都在源码字符串上直接断言 —— 比 DOM 断言更难被"恰好没走到这条分支"骗过。
  check("分区小标题已取消 + 面板标题为品牌名（源码级闸门）", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    assert(
      raw.indexOf("mgga-nav-dock-divider-caption") < 0,
      "源码里仍残留 caption（渲染或样式）"
    );
    assert(
      /const\s+NAV_DOCK_BRAND\s*=\s*"MGGA"/.test(raw),
      "缺少 NAV_DOCK_BRAND 常量"
    );
    const i = raw.indexOf("function buildNavDockPanel(");
    assert(i > 0, "buildNavDockPanel not found");
    const head = raw.slice(i, raw.indexOf("const frag =", i));
    assert(
      /title\.textContent\s*=\s*NAV_DOCK_BRAND/.test(head),
      "面板标题未使用 NAV_DOCK_BRAND"
    );
    assert(
      !/title\.textContent\s*=\s*i18n\.t\(/.test(head),
      "面板标题又写回了 i18n.t(...)"
    );
    // 无障碍名仍走 i18n：把它删了才是真回归
    assert(
      /panel\.setAttribute\("aria-label",\s*i18n\.t\("navDock"\)\)/.test(raw),
      "面板 aria-label 被误删或不再可本地化"
    );
    return "caption 0 处，标题 = NAV_DOCK_BRAND，aria-label 保留";
  });

  // ---------- 静态回归闸：沉浸式滚动条（公共段）+ 只覆盖条目区 ----------
  // 三条诉求是演进关系：
  //   ① 「滚动条再沉浸一些，起码不再显示上下顶端的步进箭头」；
  //   ② 「滚动条应该排除标题栏区域，不再涵盖标题栏」；
  //   ③ 本轮（审计 §2.2）：设置面板的滚动条与导航面板风格不一致 ⇒ 两处同源。
  // ① 箭头是 Windows 经典滚动条里 `::-webkit-scrollbar-button` 渲染出来的伪元素，
  //    必须显式 display:none。附带锁死一个**极易踩的坑**：Chromium 121+ 里只要
  //    基座规则出现 `scrollbar-width`（非 auto），整组 `::-webkit-scrollbar` 规则
  //    会被浏览器直接忽略 —— 箭头原封不动回来、不报错。标准属性只能关在 Firefox
  //    专属 `@supports (-moz-appearance: none)` 块里。
  // ② 滚动条要「止于标题栏下沿」，只能靠**结构**：滚动条由滚动容器绘制，必然覆盖
  //    容器全高，而 webkit 伪元素没有「从第 N px 开始」的能力。于是把标题栏移出
  //    滚动容器：面板只做 flex 列布局 + overflow:hidden，滚动口下沉为
  //    `.mgga-nav-dock-body`。
  // ③ 规则改为**运行时由 immersiveScrollbarCss() 生成**，两个面板共用一份 ⇒ 断言从
  //    "源码里有没有这段 CSS"改成"生成器里有没有 + 调用点传对宿主没有"。
  //    ⚠️ 这正是本轮最容易漏的地方：规则一搬进生成器，旧断言会在切片里找不到那段
  //    文本、直接假红 —— 搬规则必须同步搬断言。
  // jsdom 无排版层 ⇒ 只锁声明，真实几何交给真机场景 7.5。
  check("导航面板滚动条：只覆盖条目区（规则全部来自公共段，切片内零手写）", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    const i = raw.indexOf("function injectNavDockStyle(");
    assert(i > 0, "injectNavDockStyle not found");
    const css = raw.slice(i, raw.indexOf("function removeNavDock("));

    // ① 规则已整体搬进公共段生成器（immersiveScrollbarCss），本切片里应当**一条都不剩**。
    //    这条同时是"单一来源"的守卫：谁再往导航面板样式里补一条手写滚动条规则，这里就红。
    //    （生成器本身的断言、以及两处调用点的断言，见后面那个 check。）
    assert(
      !/::-webkit-scrollbar/.test(css),
      "导航面板样式里又出现手写的 ::-webkit-scrollbar 规则 ⇒ 应改用公共段 immersiveScrollbarCss"
    );

    const baseStart = css.search(/#mgga-nav-dock\s*\{/);
    assert(baseStart > 0, "找不到 #mgga-nav-dock 基座规则");
    const baseBody = css.slice(baseStart, css.indexOf("}", baseStart));
    assert(
      !/scrollbar-width/.test(baseBody),
      "基座规则出现 scrollbar-width ⇒ Chromium 会忽略整组 ::-webkit-scrollbar（箭头复活）"
    );
    assert(
      /overflow:\s*hidden\s*!important/.test(baseBody),
      "面板自身仍可滚动（应为 overflow:hidden）⇒ 滚动条会盖过标题栏"
    );
    assert(
      /display:\s*flex\s*!important/.test(baseBody) &&
        /flex-direction:\s*column\s*!important/.test(baseBody),
      "面板不是 flex 纵向列 ⇒ 标题栏与滚动区无法分段"
    );

    // ② 滚动区：唯一滚动容器，且必须能自我约束高度
    const bs = css.indexOf("#mgga-nav-dock > .mgga-nav-dock-body {");
    assert(bs > 0, "找不到 #mgga-nav-dock > .mgga-nav-dock-body 规则");
    const scrollBody = css.slice(bs, css.indexOf("}", bs));
    assert(
      /overflow-y:\s*auto\s*!important/.test(scrollBody),
      "滚动区不再是滚动容器（overflow-y:auto 丢失）"
    );
    assert(
      /overscroll-behavior:\s*contain\s*!important/.test(scrollBody),
      "滚动区两端未隔离滚动接力（overscroll-behavior:contain 丢失）"
    );
    assert(
      /min-height:\s*0\s*!important/.test(scrollBody),
      "滚动区缺 min-height:0 ⇒ flex 子项被内容撑破，溢出面板而不是内部滚动"
    );

    // ③ 标题栏不许被压缩 —— 面板压短时收缩的只能是滚动区
    const hsr = css.indexOf("#mgga-nav-dock .mgga-nav-dock-header {");
    assert(hsr > 0, "找不到 #mgga-nav-dock .mgga-nav-dock-header 规则");
    const headerRule = css.slice(hsr, css.indexOf("}", hsr));
    assert(
      /flex:\s*0\s+0\s+auto\s*!important/.test(headerRule),
      "标题栏缺 flex-shrink:0 ⇒ 面板压短时它会被压缩、滚动条又爬上来"
    );

    // @supports 的 Firefox 兜底块随规则一起进了公共段 ⇒ 它的断言移到了"公共段"那个
    // check 里；留在这里会假红（切片里已经没有那段文本了）。
    return "面板 overflow:hidden + 滚动区唯一且能自约束 + 标题栏不可压缩；滚动条规则零手写";
  });

  // ---------- 静态回归闸：滚动条规则单一来源（审计 §2.2）----------
  // 改前只有导航面板配了滚动条样式（10 来条手写规则），设置面板一条都没有 ⇒ 在
  // "系统/浏览器始终显示滚动条"的环境（或 Firefox）里，一个细淡条、一个带上下
  // 箭头的经典粗条，两处观感打架。现在规则抽进 immersiveScrollbarCss()，两处只是
  // 换宿主选择器 —— 这里的断言就是"单一来源"的守卫：生成器只有一份、调用点传对宿主。
  check("沉浸式滚动条：单一来源的公共段，两个面板共用（含设置面板两个宿主）", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    const gi = raw.indexOf("function immersiveScrollbarCss(");
    assert(gi > 0, "找不到公共段生成器 immersiveScrollbarCss");
    const gen = raw.slice(gi, raw.indexOf("// 添加CSS样式 - 对话框样式（固定不变）"));
    assert(
      gen.length > 300 && gen.indexOf("@supports (-moz-appearance: none)") > 0,
      "生成器切片异常（取不到完整规则）"
    );

    // ① 步进箭头必须显式干掉（否则 Windows 经典滚动条那对箭头会回来）
    assert(
      /::-webkit-scrollbar-button[\s\S]*?\{\s*display:\s*none\s*!important/.test(gen),
      "公共段没有关掉滚动条步进箭头"
    );

    // ② 基座不得出现 scrollbar-width 声明：Chromium 121+ 里只要它非 auto，该元素上
    //    整组 ::-webkit-scrollbar 规则会被直接忽略（箭头复活、不报错）。
    //    用**带冒号的声明**计数，避免被注释里提到的同名标识符带偏。
    const swHits = gen.match(/scrollbar-width\s*:/g) || [];
    assert(
      swHits.length === 1,
      "公共段里 scrollbar-width 声明应恰好 1 条（只许在 @supports 内），实际 " + swHits.length
    );
    assert(
      gen.indexOf("scrollbar-width:") > gen.indexOf("@supports (-moz-appearance: none)"),
      "scrollbar-width 跑到了 @supports 之外 ⇒ Chromium 会忽略整组 webkit 规则、箭头复活"
    );
    assert(/scrollbar-color\s*:/.test(gen), "Firefox 兜底块里缺 scrollbar-color");

    // ③ 两处面板都要接上公共段；设置面板有**两个**滚动宿主（内容区 + 关键词列表）
    assert(
      /immersiveScrollbarCss\(\[\s*"#mgga-nav-dock \.mgga-nav-dock-body"\s*\]/.test(raw),
      "导航面板没有接公共段（或宿主选择器不再是条目区）"
    );
    assert(
      raw.indexOf('".color-picker-dialog .color-picker-content"') > 0 &&
        raw.indexOf('".color-picker-dialog #customKeywordsContainer"') > 0,
      "设置面板的滚动宿主没接全（内容区 / 关键词列表 至少缺一个）⇒ 两处观感又会打架"
    );

    // ④ 生成器只许一份 —— 谁想"只给设置面板调一调"而复制一份，这里立刻红
    assert(
      (raw.match(/function immersiveScrollbarCss\(/g) || []).length === 1,
      "immersiveScrollbarCss 被定义了多份 ⇒ 公共段不再是单一来源"
    );
    return "1 份生成器 / 导航 1 宿主 + 设置面板 2 宿主；箭头已禁、基座无 scrollbar-width";
  });

  // ---------- 静态回归闸：设置面板审计清单落地 ----------
  // 清单来源 docs/discussions/2026-09-23-settings-panel-audit.md（§1 低风险六项 +
  // §2.1/2.2）。这些改动**全是声明层面的**（jsdom 没有排版层，量不出行高/宽度/观感），
  // 所以逐条锁源码；每条注明清单编号，便于回溯到审计文档。
  // 注意：断言用"取规则体"而不是"全文 contains" —— 对话框的 prefers-color-scheme
  // 覆盖块里会出现同名选择器，取规则体一律用 lastIndexOf（基座规则在后）。
  check("设置面板 §1.1/§1.6：关键词容器的尺寸在样式表里，且不把滚动接力给页面", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");

    // §1.6：模板里不得再有内联尺寸（内联优先级高于 CSS ⇒ 改了没反应的陷阱会复发）
    assert(
      !/id="customKeywordsContainer"\s+style=/.test(raw),
      "关键词容器又写回内联样式 ⇒ 尺寸/主题/滚动条调整会被内联覆盖（§1.6 复发）"
    );

    const i = raw.lastIndexOf("#customKeywordsContainer {");
    assert(i > 0, "找不到 #customKeywordsContainer 规则");
    const body = raw.slice(i, raw.indexOf("}", i));
    assert(
      body.indexOf("max-height: min(16em, 28vh)") >= 0,
      "关键词容器的 max-height 丢失（应从模板内联下沉到这条规则里）"
    );
    assert(/overflow-y:\s*auto/.test(body), "关键词容器不再是滚动宿主（overflow-y:auto 丢失）");
    // §1.1：改前实测 overscroll-behavior 是 auto，而该容器真的溢出（456px 内容 /
    // 168–224px 视窗）⇒ 鼠标停在里面滚到底，滚动会继续传给外层内容区、再传给整页。
    assert(
      /overscroll-behavior:\s*contain/.test(body),
      "关键词容器未隔离滚动接力（§1.1：内容滚到底会把滚动传给整页）"
    );
    return "内联已清空；max-height / overflow-y / overscroll 全在样式表";
  });

  check("设置面板 §1.2/§1.5：按钮行间距单一来源 + 六行节奏统一", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");

    // §1.2：模板内联的 margin-top 必须删掉（它压在 CSS 上面，让"改 CSS 没反应"）
    assert(
      !/class="button-row"\s+style=/.test(raw),
      "按钮行又写回内联 margin-top ⇒ 改 CSS 依然没反应（§1.2 复发）"
    );
    const br = raw.lastIndexOf(".button-row {");
    assert(br > 0, "找不到 .button-row 规则");
    const brBody = raw.slice(br, raw.indexOf("}", br));
    assert(
      /margin-top:\s*1em/.test(brBody),
      ".button-row 的 margin-top 不是 1em ⇒ 与"+"删内联前的视觉不再一致（等于顺手改了间距）"
    );

    // §1.5：行高下限取颜色块那一档（0.8em 字号 × 2em = 1.6em）；
    // 不写它的话后两行 21px、前三行 22.39px，差 1.39px。
    const rw = raw.lastIndexOf(".color-picker-row {");
    assert(rw > 0, "找不到 .color-picker-row 规则");
    const rwBody = raw.slice(rw, raw.indexOf("}", rw));
    assert(
      /min-height:\s*1\.6em/.test(rwBody),
      "行节奏未统一（§1.5：缺 min-height:1.6em，后两行会比前三行矮 1.39px）"
    );
    return "按钮行间距只在 CSS（1em + padding 0.35em）；设置行同高";
  });

  check("设置面板 §1.3：三颗按钮走 Primer 语义色，深浅两档齐全", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");

    // 旧色必须绝迹（注释里也不留 —— 否则以后 grep 排查会被注释误导）
    ["#007bff", "#ffa500", "#ff6b6b", "#0069d9", "#e69500", "#ff5252"].forEach((c) => {
      assert(raw.indexOf(c) < 0, "还留着旧按钮色 " + c + "（§1.3 未清干净）");
    });

    const li = raw.indexOf("@media (prefers-color-scheme: light)");
    const di = raw.indexOf("@media (prefers-color-scheme: dark)", li);
    assert(li > 0 && di > li, "找不到对话框的浅色/深色媒体查询块");
    const light = raw.slice(li, di);
    // 深色块后面还跟着别的媒体查询，取一段足够长的切片即可（断言都是"必须包含"式）
    const dark = raw.slice(di, di + 4000);

    // 浅色档：确认 = primary 绿 / 重置 = danger 红
    assert(light.indexOf("#1f883d") > 0, "浅色档缺 primary 绿（确认按钮）");
    assert(light.indexOf("#cf222e") > 0, "浅色档缺 danger 红（重置按钮）");
    // 深色档：同一批颜色直接搬过去会刺眼，必须各换一档
    assert(dark.indexOf("#238636") > 0, "深色档缺 primary（§1.3 要的就是"+"补深色变体"+"）");
    assert(dark.indexOf("#da3633") > 0, "深色档缺 danger");
    assert(
      dark.indexOf("#21262d") > 0,
      "深色档缺 neutral 底色（取消按钮）"
    );

    // 取消按钮用 inset 描边而非 border —— 不占盒模型，三颗按钮高度不变
    const cb = raw.lastIndexOf(".cancel-button {");
    assert(cb > 0, "找不到 .cancel-button 规则");
    assert(
      /box-shadow:\s*inset 0 0 0 1px/.test(raw.slice(cb, raw.indexOf("}", cb))),
      "取消按钮的描边不再是 inset box-shadow ⇒ 会占盒模型、三颗按钮高度不再一致"
    );
    return "确认=primary / 取消=neutral / 重置=danger，深浅两档齐全且旧色绝迹";
  });

  check("设置面板 §1.4：外部取色库适配是死代码，已整段删除", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    [
      "window.Pickr",
      "window.Huebee",
      "panel._pickr",
      "panel._huebee",
      "panel._spectrum",
      ".pcr-app",
      ".huebee",
      ".sp-container",
    ].forEach((t) => {
      assert(raw.indexOf(t) < 0, "死代码残留：" + t + "（§1.4）");
    });
    assert(raw.indexOf("initializeLibraries") > 0, "内置取色器实现被误删 ⇒ 取色功能没了");
    return "三个库的同步分支与三条样式规则均无残留，内置取色器仍在";
  });

  // ---------- 静态回归闸：仓库头按钮溢出修正已整体删除（用户 2026-09-23 决定）----------
  // 该补丁靠 !important 覆盖 GitHub 私有类名（.show-whenNarrow / .tmp-mb-3 /
  // .d-flex.gap-2 / HeaderContent）+ 往 DOM 打内联样式来强制仓库头那行按钮换行。
  // 真机复测（.workbuddy/probe/diag-header-btn-fix-value.js，桌面 UA 与移动 UA 两档 ×
  // 480/760/1280 三视口）证明它**已完全失效**：三个作用点（行 → 子组 → 按钮）的选择器
  // 命中 0、开关开/关两档几何逐字相同、原始横向溢出症状不再出现 ⇒ 删除零代价。
  // 判据分两层：① 源码全文不含这套标识符（**注释里也不许留** —— 写在「已删除」注释里的
  // 标识符会让 grep 型检查继续命中，等于没删干净）；② 运行期既不注入样式表也不打标。
  // 注意**不能**拿 `.show-whenNarrow` / `HeaderContent` 当判据：悬浮导航仍在用它们做
  // 「排除 GitHub 窄屏 chrome」的反向过滤，那是正当引用。
  check("仓库头按钮溢出修正：整套实现 + 面板开关 + 菜单项已整体删除", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    [
      "applyMobileLayoutFix",
      "isMobileLayoutFixEnabled",
      "injectHeaderBtnFixStyle",
      "applyHeaderBtnRowLayout",
      "scheduleHeaderBtnFix",
      "startHeaderBtnBootstrap",
      "setupHeaderBtnObserver",
      "teardownHeaderBtnObserver",
      "mgga-header-btn-fix",
      "HEADER_BTN_FIX_STYLE_ID",
      "mggaHeaderBtnRow",
      "headerBtnObserver",
      "headerBtnDebounce",
      "headerBtnBootstrapTimer",
      "mobileFixToggleBtn",
      "mobileLayoutFix",
      "mobileFix",
      "tmp-mb-3",
    ].forEach((t) => {
      assert(raw.indexOf(t) < 0, "该功能应已整体删除，仍残留：" + t);
    });

    // 运行期：不注入样式表、不给 <html> 加类、不往按钮行打标、面板里没有那行开关
    assert(
      !relDoc.getElementById("mgga-header-btn-fix-style"),
      "仍注入了仓库头按钮修正样式表"
    );
    assert(
      !relDoc.documentElement.classList.contains("mgga-header-btn-fix"),
      "仍给 <html> 加了仓库头修正类"
    );
    assert(
      relDoc.querySelectorAll('[data-mgga-header-btn-row="1"]').length === 0,
      "仍往仓库头按钮行打了内联标记"
    );
    // 设置面板模板里的开关行剩 4 条（奇/偶/悬停 + 图标识别）；关键词块不用这个类。
    // 走源码切片而不是 jsdom 运行时：设置面板是**按需创建**的（打开菜单项才建），
    // 静态区跑不到那一步 —— 直接查 DOM 只会恒得 0（第一版就踩了这个坑）。
    const tplStart = raw.indexOf("function buildSettingsDialogHTML");
    const tplEnd = raw.indexOf("function createColorPickerPanel");
    assert(tplStart > 0 && tplEnd > tplStart, "找不到设置面板模板切片");
    const tpl = raw.slice(tplStart, tplEnd);
    const rowCount = (tpl.match(/class="color-picker-row"/g) || []).length;
    assert(
      rowCount === 4,
      "设置面板开关行应为 4 条（奇/偶/悬停 + 图标识别），实际 " + rowCount
    );
    // 油猴菜单也少了一项：6 项（导航、设置、奇/偶/悬停、重置）
    assert(rel.menu.length === 6, "菜单命令数应为 6，实际 " + rel.menu.length);
    return "源码 0 残留 / 运行期不注入不打标 / 面板 4 行开关 / 菜单 6 项";
  });

  check("设置面板 §2.1：面板基准字号随视口自适应（与悬浮球同源吃 vmin）", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    const v = /--mgga-panel-font:\s*clamp\(([^)]*\)[^)]*)\)/.exec(raw) || /--mgga-panel-font:\s*clamp\(([\s\S]*?)\);/.exec(raw);
    assert(v, "找不到 --mgga-panel-font 的 clamp 定义");
    assert(/vmin/.test(v[1]), "面板字号没用 vmin ⇒ 宽屏上不会跟着悬浮球一起长（§2.1 未解决）");

    const dlg = raw.indexOf(".color-picker-dialog {");
    assert(dlg > 0, "找不到 .color-picker-dialog 基座规则");
    const dlgBody = raw.slice(dlg, raw.indexOf("}", dlg));
    assert(
      /font-size:\s*var\(--mgga-panel-font\)/.test(dlgBody),
      "面板字号没接 --mgga-panel-font（宽度/行高/间距就不会跟着缩放）"
    );
    assert(
      raw.indexOf("var(--mgga-text-scale)") < 0,
      "旧的定值字号 --mgga-text-scale 仍在被引用 ⇒ 面板宽仍是死值 280px"
    );
    return "面板字号 = clamp(vmin) 自适应，宽度/行高/间距随之同比缩放";
  });

  // ---------- 静态回归闸：标题栏必须在滚动容器之外 ----------
  // 需求演进（v2026.10.29 → v2026.10.30）：
  //   ① 上一版：「标题栏固定不参与滚动」—— 当时面板自己就是滚动容器，修法是给它
  //      position:sticky + 不透明背景 + z-index + 同色补边（四件套）。
  //   ② 本次：「滚动条不该涵盖标题栏」—— sticky 做不到：滚动条由**滚动容器**绘制，
  //      必然覆盖容器全高（含标题栏那一行），而 webkit 伪元素也没有「从第 N px
  //      开始」这种能力。
  // 于是把「面板自己滚」这个前提直接去掉：面板 flex 列 + overflow:hidden，滚动口
  // 下沉为 .mgga-nav-dock-body。标题栏根本不在滚动容器里 —— 既不会被卷走、也不会
  // 被滚动条压住；sticky 四件套集体作废（滚动内容不再与它同层）。
  // jsdom 无排版层 ⇒ 声明级锁死，真实几何交给真机场景 7.5。
  check("导航面板标题栏：不在滚动容器内（sticky 四件套已随结构隔离作废）", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");

    // DOM：header 挂面板、条目全部挂 body —— 这正是「滚动条不含标题栏」的根据
    const bs = raw.indexOf("function buildNavDockPanel(");
    assert(bs > 0, "buildNavDockPanel not found");
    const fn = raw.slice(bs, raw.indexOf("function buildNavDockFallbackIcon("));
    assert(/panel\.appendChild\(header\)/.test(fn), "标题栏没有挂到面板上");
    assert(
      /bodyEl\.appendChild\(frag\)/.test(fn) && /panel\.appendChild\(bodyEl\)/.test(fn),
      "条目没有下沉到滚动区 body ⇒ 标题栏会重新落进滚动容器"
    );
    assert(
      !/panel\.appendChild\(frag\)/.test(fn),
      "条目仍直接挂在面板上（panel.appendChild(frag)）⇒ 与标题栏同层，滚动条必然盖过它"
    );

    // CSS：标题栏不得再靠 sticky 打补丁（那意味着它又回到了滚动容器里）
    const i = raw.indexOf("function injectNavDockStyle(");
    assert(i > 0, "injectNavDockStyle not found");
    const css = raw.slice(i, raw.indexOf("function removeNavDock("));
    const hs = css.indexOf("#mgga-nav-dock .mgga-nav-dock-header {");
    assert(hs > 0, "找不到 #mgga-nav-dock .mgga-nav-dock-header 规则");
    const headerBody = css.slice(hs, css.indexOf("}", hs));
    assert(
      !/position:\s*sticky/.test(headerBody),
      "标题栏又改回 position:sticky ⇒ 说明它重新落进了滚动容器"
    );
    return "标题栏在滚动容器外；sticky/背景/z-index/补边 已随结构隔离一并移除";
  });

  // ---------- 静态回归闸：两处标题栏共用同一套标准 ----------
  // 用户诉求：「将导航栏和 release 页的设置面板的标题栏统一一下，将高度改为导航栏的
  // 标准，标题文本自适应缩小」。三件事都落在**声明层面**，而 jsdom 没有排版层
  // （clientHeight/scrollWidth 恒 0）⇒ 量不出"高度统一了没有""字缩了没有"。
  // 因此这里在源码字符串上逐项锁死：两处标题栏的 高度标准 / 下边框 / 字重 / 字号
  // 兜底 + 容器查询 clamp 必须成对一致 —— 只要有人只改一处，闸门立刻红。
  check("两处标题栏：高度与字号标准成对一致 + 标题字号按标题栏宽度自适应缩小", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");

    // 注意取 **lastIndexOf**：对话框的主题覆盖块（prefers-color-scheme 媒体查询）
    // 在前、基座规则在后，同名选择器出现多次 —— 要锁的是最后那条基座规则。
    const dh = raw.lastIndexOf(".color-picker-header {");
    assert(dh > 0, "找不到 .color-picker-header 规则（设置面板标题栏）");
    const dialogHeader = raw.slice(dh, raw.indexOf("}", dh));
    const nh = raw.indexOf("#mgga-nav-dock .mgga-nav-dock-header {");
    assert(nh > 0, "找不到 #mgga-nav-dock .mgga-nav-dock-header 规则");
    const navHeader = raw.slice(nh, raw.indexOf("}", nh));

    // ① 高度标准：导航栏那套 padding 2px 4px 6px + margin-bottom 2px；
    //    原来的设置面板是 margin-bottom 1em + padding-bottom 0.5em，高出一大截。
    ["padding: 2px 4px 6px", "margin-bottom: 2px", "border-bottom: 1px solid"].forEach(
      (decl) => {
        assert(
          dialogHeader.indexOf(decl) >= 0,
          "设置面板标题栏缺高度标准「" + decl + "」⇒ 两处高度又不一样了"
        );
        assert(
          navHeader.indexOf(decl) >= 0,
          "导航栏标题栏缺高度标准「" + decl + "」⇒ 标准本身被改坏了"
        );
      }
    );
    assert(
      dialogHeader.indexOf("justify-content: space-between") >= 0 &&
        navHeader.indexOf("justify-content: flex-start") >= 0,
      "两处标题栏的左右排布应保持「标题靠左、关闭靠右」"
    );

    // ② 尺寸容器 + 自适应缩小：两处标题栏都必须成为 container，否则 cqi 无参照系、
    //    clamp 会整条失效退化回兜底值（浏览器不报错，只是不再自适应）。
    //    字号声明必须「先静态兜底、后 clamp」—— 顺序反了，不认 cqi 的浏览器就没了兜底。
    [
      { sel: ".color-picker-header {", name: "设置面板" },
      { sel: "#mgga-nav-dock .mgga-nav-dock-header {", name: "导航栏" },
    ].forEach((c) => {
      const i = raw.indexOf(c.sel);
      const body = raw.slice(i, raw.indexOf("}", i));
      assert(
        body.indexOf("container-type: inline-size") >= 0,
        c.name + "标题栏没有 container-type: inline-size ⇒ 标题字号无法按宽度自适应"
      );
    });
    [
      { sel: ".color-picker-title {", name: "设置面板", last: true },
      { sel: "#mgga-nav-dock .mgga-nav-dock-header-title {", name: "导航栏" },
    ].forEach((c) => {
      const i = c.last ? raw.lastIndexOf(c.sel) : raw.indexOf(c.sel);
      assert(i > 0, "找不到 " + c.sel);
      const body = raw.slice(i, raw.indexOf("}", i));
      const fb = body.indexOf("font-size: 13px");
      const cl = body.indexOf("font-size: clamp(");
      assert(
        fb >= 0 && cl > fb,
        c.name + "标题缺「13px 静态兜底 + clamp 自适应」的成对声明（兜底必须在前）"
      );
      assert(
        /font-size:\s*clamp\(\s*11px\s*,\s*[\d.]+cqi\s*,\s*13px\s*\)/.test(body),
        c.name + "标题的 clamp 形状不对（应为 11px 下限 / cqi 中值 / 13px 上限）"
      );
      assert(
        body.indexOf("font-weight: 600") >= 0,
        c.name + "标题字重不是 600 ⇒ 两处标题栏仍不一致"
      );
      assert(
        body.indexOf("text-overflow: ellipsis") >= 0,
        c.name + "标题少了 ellipsis 兜底 ⇒ 极窄时会把关闭按钮挤出去"
      );
    });

    // ④ 关闭按钮也是"标题栏高度"的一部分：标题栏高度 = 最高的子项 + padding。
    //    只拉平 padding 而放着关闭按钮不管，真机上两处仍差 23px
    //    （实测：设置面板 53.09px vs 导航栏 29.8px，罪魁就是 1.5em + .3em/.6em 的 × ）。
    [
      { sel: ".color-picker-close {", name: "设置面板", last: true },
      { sel: "#mgga-nav-dock .mgga-nav-dock-close {", name: "导航栏" },
    ].forEach((c) => {
      const i = c.last ? raw.lastIndexOf(c.sel) : raw.indexOf(c.sel);
      assert(i > 0, "找不到 " + c.sel);
      const body = raw.slice(i, raw.indexOf("}", i));
      ["font-size: 14px", "line-height: 1.2", "padding: 2px 6px"].forEach((decl) => {
        assert(
          body.indexOf(decl) >= 0,
          c.name + "关闭按钮缺「" + decl + "」⇒ 标题栏高度仍会由它决定，两处对不齐"
        );
      });
    });

    // ③ 图标单一来源：路径只能有一份（原来在设置面板里内联了两份），
    //    调用点三处 —— 设置面板初始模板 / 设置面板重绘 / 导航面板标题栏。
    const markCount = raw.split("M8 0c4.42").length - 1;
    assert(
      markCount === 1,
      "GitHub 印记路径出现 " + markCount + " 次 ⇒ 又出现多份各改各的"
    );
    const callCount = (raw.match(/githubMarkSvg\("/g) || []).length;
    assert(
      callCount === 3,
      "githubMarkSvg(...) 调用点应为 3 处（设置面板 ×2 + 导航栏 ×1），实际 " + callCount
    );
    return "两处标题栏 高度/边框/字重/clamp 逐项一致，印记路径单一来源（1 份路径 / 3 处调用）";
  });

  // ---------- 静态回归闸：两处标题栏"面板顶边 → 分割线"这段可视高度成对 ----------
  // 用户第二次反馈：「Release 页面设置面板的标题栏高度仍然和导航栏标题不一致，
  // 并且没有在标题栏内垂直居中」。真机量到的真相不是 .header —— 它的 border-box 高度
  // **上一版就已经一样了**（29.8px vs 29.8px）。差距在它**上方**：导航面板
  // border 1px + padding 6px 才到标题栏顶边，而设置对话框自己还有 padding 1.25em(17.5px)，
  // 于是「面板顶边 → 分割线」是 49.3px vs 37.8px，标题这段里还偏下 6.25px。
  // ⇒ 闸门必须连**面板自己的顶部内边距**一起锁；只锁 .header 的声明是锁不住的
  //   （上一版就是这样漏掉的：断言全绿，真机仍然不一致）。
  // 注意：断言的是"两处相等且 = 6px"，不是"某个字面量"—— 谁把两处一起改成别的值，
  // 可视标题栏高度就会一起变，这里会红，提示那是需要重新真机取证的决定。
  check("两处标题栏：面板顶边 → 标题栏顶边 同为「1px 边框 + 6px 内边距」", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    const topPadOf = (sel, mustHave) => {
      const i = raw.indexOf(sel);
      assert(i > 0, "找不到 " + sel + " 规则");
      const body = raw.slice(i, raw.indexOf("}", i));
      assert(
        body.indexOf(mustHave) >= 0,
        sel + " 取到的不是基座规则（缺「" + mustHave + "」）⇒ 断言会锁错地方"
      );
      const m = /padding:\s*([^;]+);/.exec(body);
      assert(m, sel + " 没有 padding 声明 ⇒ 面板顶边到标题栏顶边的距离不可控");
      return m[1].replace(/!important/, "").trim().split(/\s+/)[0];
    };
    const dialogTop = topPadOf(".color-picker-dialog {", "position: fixed");
    const navTop = topPadOf("#mgga-nav-dock {", "position: fixed");
    assert(
      dialogTop === navTop,
      "两处面板的顶部内边距不一致（设置面板 " +
        dialogTop +
        " vs 导航面板 " +
        navTop +
        "）⇒「面板顶边 → 分割线」这段可视标题栏仍会差一截、标题也不在中间"
    );
    assert(
      dialogTop === "6px",
      "顶部内边距应为 6px（与导航面板一致），实际 " + dialogTop
    );
    return (
      "两处面板顶部内边距同为 " + dialogTop +
      " ⇒ 可视标题栏 = border 1px + " + dialogTop + " + .header(29.8px)"
    );
  });

  // ---------- 静态回归闸：两处关闭控件共用一套 button 样式 ----------
  // 用户 2026-09-23：「Release 页的设置面板的标题栏的关闭按钮请使用仓库页的导航栏的
  // 关闭按钮样式」。改前设置面板是 <span class="color-picker-close">&times;</span>：
  // 字形是**乘号**（×，U+00D7）而非叉号（✕，U+2715），hover 还会 transform: scale(1.1)
  // 把它放大；导航面板是 <button>✕</button>，hover 只换底色。
  // 这些都在模板字符串/声明层面，jsdom 量不出观感 ⇒ 逐条锁死（含"只改一半"的检查：
  // 只把 <span> 换成 <button> 而忘了复位 background/border/font-family，真机上会
  // 露出一圈系统按钮的灰底与凹陷边框）。
  check("两处关闭控件：同一套 button 样式（字形 / 复位 / hover 不放大）", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    // 同名选择器在多个规则里出现（浅/深色主题各一条 hover）⇒ 取全部规则体逐个判
    const rules = (sel) => {
      const out = [];
      let i = -1;
      while ((i = raw.indexOf(sel, i + 1)) >= 0) {
        out.push(raw.slice(i + sel.length, raw.indexOf("}", i)));
      }
      assert(out.length > 0, "找不到规则 " + sel);
      return out;
    };
    // 注意取**最后一条**：浅/深色主题那两条（只写 color）在前面，基座规则在最后
    // —— 与上面"两处标题栏"那条闸门同一个坑（取错规则会得出相反的结论）。
    const dialog = rules(".color-picker-close {").pop();
    const nav = rules("#mgga-nav-dock .mgga-nav-dock-close {")[0];
    assert(
      dialog.indexOf("cursor: pointer") >= 0,
      "取到的不是设置面板关闭控件的基座规则（缺 cursor: pointer）⇒ 断言会锁错地方"
    );
    // ① 尺寸标准仍成对 —— 它同时是两处标题栏等高的前提
    ["font-size: 14px", "line-height: 1.2", "padding: 2px 6px", "border-radius: 6px", "cursor: pointer"].forEach(
      (decl) => {
        assert(
          dialog.indexOf(decl) >= 0,
          "设置面板关闭控件缺「" + decl + "」⇒ 与导航面板不成对（两处标题栏高度也会一起变）"
        );
        assert(
          nav.indexOf(decl) >= 0,
          "导航面板关闭控件缺「" + decl + "」⇒ 标准本身被改坏了"
        );
      }
    );
    // ② 设置面板那侧已是 <button>：必须显式复位 button 的三件套
    ["background: transparent", "border: none", "font-family: inherit"].forEach((decl) => {
      assert(
        dialog.indexOf(decl) >= 0,
        "设置面板关闭控件缺「" + decl + "」⇒ <button> 会露出系统按钮外观（灰底/凹陷边框/非页面字体）"
      );
    });
    // ③ 模板必须是 <button type="button">装 SVG 叉号</button>，且历史字形不得残留
    assert(
      /<button type="button" class="color-picker-close"[^>]*>\$\{uiIconSvg\("x"\)\}<\/button>/.test(raw),
      '设置面板关闭控件模板不是 <button type="button" …>装 uiIconSvg("x")</button>'
    );
    // 历史字形：乘号实体、叉号字形、对勾字形 —— 一个都不许留，**注释里也不行**
    // （注释里留着字面量会让「全文不含某字形」这类最强断言失去意义，等于没删干净）。
    // 注意不断言乘号字面量本身：它在尺寸注释里是合法用法（如 1280×896）。
    ["&times;", "\u2715", "\u2713"].forEach((glyph) => {
      assert(
        raw.indexOf(glyph) < 0,
        "源码里仍有旧字形残留 " + JSON.stringify(glyph) + " ⇒ 字形没统一到 SVG"
      );
    });
    // ④ hover：两处都只换底色；设置面板不得再位移/放大
    const dHovers = rules(".color-picker-close:hover {");
    assert(
      dHovers.some((b) => /background\s*:/.test(b)),
      "设置面板关闭控件的 hover 没有底色变化 ⇒ 与导航面板观感不一致"
    );
    assert(
      !dHovers.some((b) => /transform\s*:/.test(b)),
      "设置面板关闭控件 hover 仍在改 transform（导航面板 hover 不位移/不放大）"
    );
    assert(
      rules("#mgga-nav-dock .mgga-nav-dock-close:hover {").some((b) => /background/.test(b)),
      "导航面板关闭控件的 hover 底色被改掉了"
    );
    return "两处 14px/1.2/padding 2px 6px/radius 6px + button 复位三件套 + hover 只换底色";
  });

  // ---------- 静态回归闸：面板内状态字形已统一到 SVG ----------
  // 用户 2026-09-23 拍板实施审计 §2.3。改前面板里散落着 unicode 状态字形
  // （对勾 U+2713 / 叉号 U+2715；关键词操作按钮还各用了乘号与弯箭头），它们由
  // 系统字体渲染 —— 粗细、基线、字面大小都不可控，与已 SVG 化的悬浮球、导航项
  // 图标也不同源。
  // 两件事必须同时成立，缺一不可：
  //   ① 旧字形绝迹（**含注释** —— 注释里留着字面量会让「全文不含某字形」这类
  //      最强断言失去意义，等于没删干净）；
  //   ② 替代它的 SVG 尺寸**走 1em 且不得 display:block** —— 关闭控件、清除按钮、
  //      开关按钮的高度都靠 line-height 撑行盒，block 会让行盒塌成图标自身的 1em，
  //      两处标题栏会一起矮 2.8px（用户核对过两次的那条线）。
  check("面板状态字形已统一到 SVG（对勾 / 叉号 / 撤销三枚 + 尺寸 1em 不改行盒）", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    ["\u2713", "\u2715"].forEach((glyph) => {
      assert(
        raw.indexOf(glyph) < 0,
        "源码里仍有 unicode 状态字形 " + JSON.stringify(glyph) + "（含注释）⇒ 未统一到 SVG"
      );
    });
    const get = (name) => {
      const m = new RegExp("const " + name + "\\s*=\\s*\"([^\"]+)\"").exec(raw);
      assert(m, "缺常量 " + name);
      return m[1];
    };
    const three = [get("UI_ICON_CHECK_PATH"), get("UI_ICON_X_PATH"), get("UI_ICON_UNDO_PATH")];
    assert(new Set(three).size === 3, "对勾/叉号/撤销三枚 path 有重复 ⇒ 换图标只是换了个名字");
    const calls = (raw.match(/uiIconSvg\(/g) || []).length;
    assert(
      calls >= 13,
      "uiIconSvg 出现 " + calls + " 次（含定义），少于预期的 13 次 ⇒ 有位置漏改"
    );
    const rule = /\.color-toggle-btn > svg,[\s\S]*?\}/.exec(raw);
    assert(rule, "找不到状态图标的统一尺寸规则");
    assert(
      !/display:\s*block/.test(rule[0]),
      "图标被设成 display:block ⇒ 行盒塌成 1em，按钮与两处标题栏会一起矮"
    );
    assert(
      /width:\s*1em/.test(rule[0]) && /height:\s*1em/.test(rule[0]),
      "图标尺寸不是 1em ⇒ 跟随不了各处字号"
    );
    [".custom-keyword-item .keyword-action-btn > svg", "#mgga-nav-dock .mgga-nav-dock-close > svg"].forEach(
      (sel) => {
        assert(rule[0].indexOf(sel) >= 0, "统一尺寸规则漏了 " + sel);
      }
    );
    return "旧字形 0 处；check/x/undo 三枚独立；" + calls + " 处调用；尺寸 1em 且无 block";
  });

  // ---------- 静态回归闸：标题栏 → 第一行设置项 的间距 ----------
  // 用户 2026-09-23：「标题栏和第一行 body > div.color-picker-dialog.visible >
  // div.color-picker-content > div:nth-child(1) 设置项的安全距离不正常」。
  // 真机实测（.workbuddy/probe/diag-fab-gap.js，改前）：分割线 → 第一行只有 **2px**，
  // 而且那 2px 还不是内容区给的，是标题栏自己的 margin-bottom:2px —— 第一行
  // （.color-picker-row 无自身 padding）因此紧贴分割线，与它下面各行的 10.5px(0.75em)
  // 完全不是一个节奏。修法是把差额补在内容区（标题栏的 margin 属于"两处标题栏共用
  // 标准"，动它会让两个面板分叉，已有闸门锁死）。
  check("设置面板：分割线 → 第一行 = 行间节奏 0.75em（含补上的标题栏 margin 差额）", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    const body = (sel, last) => {
      const i = last ? raw.lastIndexOf(sel) : raw.indexOf(sel);
      assert(i > 0, "找不到规则 " + sel);
      return raw.slice(i + sel.length, raw.indexOf("}", i));
    };
    const content = body(".color-picker-content {");
    const header = body(".color-picker-header {", true);
    const gap = /gap:\s*([\d.]+)em/.exec(content);
    const pad = /padding:\s*calc\(\s*([\d.]+)em\s*-\s*(\d+)px\s*\)\s+([\d.]+)em\s+0/.exec(content);
    const mb = /margin-bottom:\s*(\d+)px/.exec(header);
    assert(gap, "内容区没有 em 单位的行间 gap ⇒ 第一行的目标间距没有参照系");
    assert(
      pad,
      "内容区顶部内边距不是「calc(Nem - Mpx)」形式 ⇒ 第一行仍紧贴分割线（改前就是 2px）"
    );
    assert(mb, "标题栏的 margin-bottom 不见了（第一行间距是照它补的）");
    assert(
      pad[1] === gap[1],
      "上内边距的 em 必须与行间 gap 同源（" + pad[1] + " vs " + gap[1] + "）"
    );
    assert(
      pad[2] === mb[1],
      "补的差额必须正好等于标题栏的 margin-bottom（" +
        pad[2] +
        " vs " +
        mb[1] +
        "px）⇒ 否则分割线到第一行不等于一个节奏"
    );
    assert(
      pad[3] === "0.35",
      "左右内边距被改了（滚动条贴边靠它），实际 " + pad[3] + "em"
    );
    return (
      "分割线 → 第一行 = " + gap[1] + "em（标题栏 margin-bottom " + mb[1] +
      "px + 内容区上内边距 calc(" + pad[1] + "em - " + pad[2] + "px)）"
    );
  });

  // ---------- 静态回归闸：两台悬浮球同源（尺寸 / 图标 / 入场动画）+ 气泡移除 ----------
  // 用户 2026-09-23：「设置面板的悬浮球的图标改为 SVG，不再使用 unicode，并且做到与
  // 导航栏悬浮球一样跟随屏幕分辨率和比例自适应缩放尺寸，并保持同样大小。并增加共享的
  // 悬浮球弹出动画，页面刷新时触发，动画要求要温和不剧烈。导航栏的悬浮球的图标去除
  // 导航项数量蓝色气泡」。
  // 改前（真机实测）：导航球写死 44px + 18px SVG，设置球是 unicode ⚙️ 且 2.8em×0.8em
  // 字号 = 31.36px —— 一大一小、一 SVG 一 emoji。
  check("两台悬浮球：尺寸与图标同源（vmin 自适应）+ 共用入场动画 + 气泡已移除", () => {
    const raw = fs.readFileSync(SCRIPT, "utf8");
    const rule = (sel, last) => {
      const i = last ? raw.lastIndexOf(sel) : raw.indexOf(sel);
      assert(i > 0, "找不到规则 " + sel);
      return raw.slice(i + sel.length, raw.indexOf("}", i));
    };
    // ① 共用尺寸变量：定义在 :root（脚本开头无条件注入，两页都在）
    const root = rule(":root {");
    const size = /--mgga-fab-size:\s*([^;]+);/.exec(root);
    const icon = /--mgga-fab-icon:\s*([^;]+);/.exec(root);
    assert(size, ":root 里没有 --mgga-fab-size ⇒ 两枚球又各写各的尺寸");
    assert(
      /vmin/.test(size[1]),
      "球体尺寸没用 vmin ⇒ 不随分辨率/比例自适应，实际 " + size[1]
    );
    assert(/clamp\(/.test(size[1]), "球体尺寸缺 clamp 上下限（极小/极大视口会失控）");
    assert(
      icon && /var\(--mgga-fab-size\)/.test(icon[1]),
      "图标尺寸必须由球体尺寸推导，否则球大了图标不跟"
    );
    // ② 两处 width/height 都取同一变量
    const floatRule = rule("#mgga-float-btn {");
    const navFab = rule("#mgga-nav-dock-toggle {");
    ["width", "height"].forEach((p) => {
      const re = new RegExp("(^|[\\s;])" + p + ":\\s*var\\(--mgga-fab-size");
      assert(
        re.test(floatRule),
        "设置面板悬浮球的 " + p + " 不是共用变量 ⇒ 两枚球大小可能不一致"
      );
      assert(
        re.test(navFab),
        "导航悬浮球的 " + p + " 不是共用变量 ⇒ 两枚球大小可能不一致"
      );
    });
    // ③ 图标尺寸同源
    ["#mgga-float-btn > svg {", "#mgga-nav-dock-toggle > svg {"].forEach((sel) => {
      const b = rule(sel);
      assert(
        /width:\s*var\(--mgga-fab-icon/.test(b) && /height:\s*var\(--mgga-fab-icon/.test(b),
        sel + " 的图标尺寸没用共用变量"
      );
    });
    // ④ 入场动画：keyframes 只此一份；且**绝不能碰 transform**
    //    （导航球的 translateY(-50%) 带 !important，!important 高于 CSS 动画，
    //     动画改 transform 会被整条忽略 —— 真机表现为"动画名生效、球纹丝不动"）
    const kfCount = raw.split("@keyframes mgga-fab-pop").length - 1;
    assert(kfCount === 1, "入场动画 keyframes 应只有一份（两台球共享），实际 " + kfCount);
    const kfStart = raw.indexOf("@keyframes mgga-fab-pop");
    const kf = raw.slice(kfStart, raw.indexOf("@media (prefers-reduced-motion", kfStart));
    assert(
      !/transform\s*:/.test(kf),
      "keyframes 里出现 transform ⇒ 会被导航球那条 !important 整条压掉"
    );
    assert(
      /scale\s*:/.test(kf),
      "keyframes 里没有声明 scale 属性 ⇒ 只剩淡入，谈不上「弹出」"
    );
    assert(/prefers-reduced-motion/.test(raw), "缺少 prefers-reduced-motion 兜底");
    const popCalls = (raw.match(/triggerFabPop\(/g) || []).length;
    assert(
      popCalls === 3,
      "triggerFabPop 应有 3 处（定义 1 + 两台球各 1），实际 " + popCalls
    );
    // ⑤ 蓝色数量气泡：CSS 与 JS 必须同时消失（只删一半 = 没删）
    assert(
      raw.indexOf("mgga-nav-dock-badge") < 0 && raw.indexOf("updateNavDockFabBadge") < 0,
      "导航项数量蓝色气泡还有残留（样式或 JS 只删了一半）"
    );
    // ⑥ 设置面板悬浮球改为 SVG 生成
    assert(/btn\.innerHTML = gearIconSvg\(\);/.test(raw), "悬浮球图标没换成 SVG 生成函数");
    assert(
      raw.indexOf('btn.innerHTML = "⚙️"') < 0,
      "悬浮球仍在用 unicode 齿轮字形（⚙️）"
    );
    return (
      "尺寸 " + size[1].trim() + " / 图标 " + icon[1].trim() +
      " / keyframes 1 份 / 气泡 0 处"
    );
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

  // ---------- 场景 3h: 已在本页时点本页 tab → 定位到页面上该项自身 ----------
  // 用户反馈：「当页面已经处于 code 页面时，再点击 Code 就应该 Ajax 吸顶而不重载」。
  // 根因：Code 落地路径 == location.pathname，旧版分诊把它判成"不接管"，于是
  // 交给浏览器/Turbo 做同 URL 导航 —— 重取整块内容 + 滚动归零，用户感知即"重载"。
  // 2026-09-22 增强：落点由"内容区顶部"改为**页面上该项自身** —— 探测到该项在
  // 页面上外露（没被收纳进 More）就直接定位到那个入口；被收纳进 More 时页面上
  // 没有可见落点，改为放行导航、一次定位都不做（见紧随其后的两个新场景）。
  const SAME_PANE_ABS = 300; // 内容区根的文档绝对纵坐标
  const SAME_HEADER_H = 64; // 固定顶栏
  const SAME_CODE_ABS = 220; // 页面标签栏里 "Code" 入口自身的文档绝对纵坐标

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
    // 页面上"Code"这个入口自身的坐标：面板定位应落在**它**身上（而不是内容区顶部）
    sp.codeAnchor = d.querySelector('[data-tab-item="i0code-tab"]');
    if (!sp.codeAnchor) errors.push("fixture: Code anchor missing");
    else
      sp.codeAnchor.getBoundingClientRect = () => {
        const top = SAME_CODE_ABS - w.__fakeY;
        return { top, bottom: top + 36, left: 0, right: 120, width: 120, height: 36, x: 0, y: top };
      };
    try {
      w.eval(body);
    } catch (err) {
      errors.push("eval(samePage): " + err.message);
    }
  }
  await wait(1200);
  const spCode = panelItemByLabel(sp.win.document, "Code");

  check("页面外露项：点同页 Code 定位到页面上该项自身（不导航、不重载）", () => {
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
    // 落点是**页面上 Code 这个入口自身**（外露 ⇒ 直接定位它），扣掉 64px 固定顶栏
    assert(
      Math.round(sp.codeAnchor.getBoundingClientRect().top) === SAME_HEADER_H,
      "未定位到页面上该项自身: elTop = " + sp.codeAnchor.getBoundingClientRect().top
    );
    assert(
      sp.win.__fakeY === SAME_CODE_ABS - SAME_HEADER_H,
      "窗口落点不对: __fakeY = " + sp.win.__fakeY
    );
    // 目标不在内容区里 ⇒ 不该去动内容区自己的滚动位置（旧行为会把它归零）
    assert(
      sp.pane.scrollTop === 700,
      "内容区内部滚动被动过: scrollTop = " + sp.pane.scrollTop
    );
    return (
      "窗口 900→" + (SAME_CODE_ABS - SAME_HEADER_H) + "，Code 入口 elTop=64，URL 未变"
    );
  });

  check("同页 tab：跨页条目（Code 之外的 Insights）仍不接管", () => {
    const ins = panelItemByLabel(sp.win.document, "Insights");
    assert(ins, "Insights item missing from panel");
    const ev = dispatchClick(sp.win, ins);
    assert(!ev.defaultPrevented, "跨页条目被误接管");
    return "原生 href 保留";
  });

  // ---------- 场景 3h-2: 页面上**已被收纳进 More** 的项 ⇒ 不定位、放行导航 ----------
  // 用户要求：「如果导航栏上的项在页面上依然存在没有被收纳折叠进 More 就直接定位
  // 而不是直接跳转 url；反之，如果导航栏上的项在页面被收纳折叠进了 More 则直接
  // 跳转对应 URL 不再立即定位。」本场景是"反之"那一半。
  //
  // 形态取自 Primer UnderlineNavItem 源码：放不下的 tab 本体仍在 DOM、href 完整，
  // 只有所在 `<li>` 被标 aria-hidden（`useIsClipped` 的结果）。连当前选中项也可能
  // 被裁 —— 此时页面上**没有任何可见入口**，定位过去等于滚向一个看不见的落点。
  function clippedCurrentTabHTML() {
    const clipped = (href, text, current) =>
      '<li class="prc-UnderlineNav-UnderlineNavItem-syRjR" aria-hidden="true">' +
      '<a href="' + href + '" tabindex="-1"' +
      (current ? ' aria-current="page"' : "") + ">" + text + "</a></li>";
    return (
      '<nav class="prc-components-UnderlineWrapper-eT-Yj" aria-label="Repository" ' +
      'data-overflow-mode="wrap" data-has-overflow="true">' +
      '<ul role="list" class="prc-UnderlineNav-ItemsList-oj8gN">' +
      clipped(REPO_SLUG, "Code", true) +
      clipped(REPO_SLUG + "/issues", "Issues", false) +
      "</ul>" +
      '<div class="prc-UnderlineNav-MoreButtonContainer-Dnrq6">' +
      '<button id="clippedMore" type="button" aria-haspopup="true" aria-expanded="false">' +
      '<span>More<span class="prc-src-InternalVisuallyHidden-2YaI6"> items</span></span>' +
      "</button></div></nav>" +
      '<div id="repos-split-pane-content" data-selector="repos-split-pane-content" tabindex="0">' +
      '<article class="markdown-body entry-content" id="clippedArticle"><h1>README</h1></article>' +
      "</div>"
    );
  }

  const clipSp = buildDOM(OV_URL, {
    dockFixture: clippedCurrentTabHTML,
    quietNavigation: true,
  });
  installFakeLayout(clipSp.win, {});
  try {
    clipSp.win.eval(body);
  } catch (err) {
    errors.push("eval(clippedSamePage): " + err.message);
  }
  await wait(1200);
  const clipSpCode = panelItemByLabel(clipSp.win.document, "Code");

  check("页面收纳项：同页项已折进 More ⇒ 一次定位都不做、放行导航", () => {
    assert(clipSp.errors.length === 0, "window error: " + clipSp.errors.join(" | "));
    assert(clipSpCode, "Code item missing from panel");
    clipSp.win.__scrollCalls.length = 0;
    const hrefBefore = clipSp.win.location.href;
    const ev = dispatchClick(clipSp.win, clipSpCode);
    assert(
      !ev.defaultPrevented,
      "页面上已看不到这一项，却仍被接管定位 —— 会滚向一个不可见的落点"
    );
    assert(
      clipSp.win.__scrollCalls.length === 0,
      "放行路径不该自己滚动，实际 scrollTo: " + clipSp.win.__scrollCalls.join(",")
    );
    assert(
      clipSp.win.location.href === hrefBefore,
      "URL 变了: " + clipSp.win.location.href
    );
    return "未接管（defaultPrevented=false），零定位，交还软导航";
  });

  // ---------- 场景 3h-3: 文件区概览 tab 被折进 More ⇒ **仍然**切 tab ----------
  // 为什么"收纳即放行导航"这条规则**不能**套到路径 3 上（真机取证）：
  // 这些 tab 的 href 是 React 路由占位 `#`，面板上的落地路径是
  // resolveFileAreaTabHref 从页面证据**反推**的，反推失败时用兜底猜的文件名。
  // 400px 真机实测：vscode 的 `MIT license` 被折进 More 时放行 ⇒ 落到
  // `/microsoft/vscode/blob/HEAD/license`（真实文件叫 LICENSE.txt）⇒ 301 ⇒
  // **整页重载**（docId 变化）。切 tab 走 React 客户端路由、不依赖那个 href，
  // 所以这里维持原路径，并留一条断言把"别再套用放行规则"钉住。
  const clipTab = buildDOM(OV_URL, {
    dockFixture: () =>
      repoHomeHTMLResponsive() + overviewFilesHTML({ clipContributing: true }),
    quietNavigation: true,
  });
  installFakeLayout(clipTab.win, {});
  try {
    clipTab.win.eval(body);
  } catch (err) {
    errors.push("eval(clippedFileTab): " + err.message);
  }
  await wait(1200);
  const clipTabContrib = panelItemByLabel(clipTab.win.document, "Contributing");

  check("页面收纳项：文件区 tab 折进 More 时仍走切 tab（不踩反推的落地路径）", () => {
    assert(clipTab.errors.length === 0, "window error: " + clipTab.errors.join(" | "));
    assert(clipTabContrib, "Contributing item missing from panel");
    clipTab.win.__scrollCalls.length = 0;
    const ev = dispatchClick(clipTab.win, clipTabContrib);
    assert(
      ev.defaultPrevented,
      "被折进 More 的文件区 tab 未被接管 —— 放行导航会用到 resolveFileAreaTabHref " +
        "反推的落地路径；vscode 的 `MIT license` 实测落到 /blob/HEAD/license（不存在）" +
        "并被 301 成整页重载"
    );
    assert(
      clipTab.win.__scrollCalls.length > 0,
      "接管了却没有定位：scrollCalls=" + JSON.stringify(clipTab.win.__scrollCalls)
    );
    return "仍走 file-tab（切 tab + 定位：" + clipTab.win.__scrollCalls.join(",") + "）";
  });

  // 场景 3k：URL 停在 `?tab=<x>-ov-file`（正文是 License/Contributing）时点同页 Code。
  // 「同页」只对**路径**成立：只滚回顶部会让用户"点了 Code 却还看着 License"；
  // 但直接整页重载又是老毛病。正确做法是**放行一次软导航** —— 目标 URL 与当前
  // URL 不同，Turbo 会正常访问并把 `?tab=` 清成规范路径。
  {
    const ct = buildDOM(OV_URL + "?tab=contributing-ov-file", {
      dockFixture: samePageTabHTML,
      quietNavigation: true,
    });
    try {
      ct.win.eval(body);
    } catch (err) {
      errors.push("eval(clearTab): " + err.message);
    }
    await wait(900);
    const code = panelItemByLabel(ct.win.document, "Code");
    const ev = code ? dispatchClick(ct.win, code) : null;
    await wait(200);
    check("同页 tab 例外：URL 带 `?tab=` 时放行软导航清参数（不接管、不整页重载）", () => {
      assert(ct.errors.length === 0, "window error: " + ct.errors.join(" | "));
      assert(code, "Code item missing from panel");
      assert(
        ev && !ev.defaultPrevented,
        "带 `?tab=` 时仍被接管 ⇒ 只滚回顶部，正文继续停在概览文件上"
      );
      assert(
        (ct.win.__scrollCalls || []).length === 0,
        "放行路径不该自己滚动，实际 scrollTo: " + (ct.win.__scrollCalls || []).join(",")
      );
      return "未接管（defaultPrevented=false），交还软导航清参数";
    });
  }

  // ---------- 场景 3i: 仓库侧栏区块（PaneWrapper 内的 borderGrid）进面板 ----------
  // 侧栏区块**不是 <nav>**（真实页 nav 恒 4 个，PaneWrapper 内 0 个），
  // findRepoHomeNavBars() 永远收不到它们 ⇒ 必须有一条独立来源。
  // 规则：一个区块一条主链接 —— ① 标题即链接（Releases / Contributors / …）；
  // ② "Sponsor this project" 无标题链接，落在 a[href^="/sponsors/"]；
  // ③ "Languages" 无标题链接，落在 a[href*="/search?l="]；三级都落空（About）跳过。
  // 结构与真实 DOM 逐层对齐（2026-09-22 iina/vscode/kubernetes 三仓库实测）。
  function sidebarGridInnerHTML() {
    const R = "/" + REPO;
    const owner = REPO.split("/")[0];
    const headingWithLink = (href, text, counter) =>
      '<h2 data-component="Heading"><span class="SidebarSection-module__headingLinkWrapper__x">' +
      '<a data-component="Link" data-muted="true" href="' + href + '" data-discover="true"><span>' +
      text +
      "</span></a>" +
      (counter
        ? '<span aria-hidden="true" data-variant="secondary" data-component="CounterLabel" class="ml-1 prc-CounterLabel-x">' +
          counter +
          "</span>" +
          '<span class="prc-VisuallyHidden-x">&nbsp;(' + counter + ")</span>"
        : "") +
      "</span></h2>";
    const plainHeading = (text) =>
      '<h2 data-component="Heading"><span>' + text + "</span></h2>";
    return (
      // About：无标题链接、也没有 /sponsors/ 与 /search?l= 锚点 ⇒ 应被跳过
      '<div class="SidebarSection-module__sidebarSection__a">' +
      plainHeading("About") +
      '<p>desc</p><a href="https://example.com">site</a>' +
      '<a href="#readme-ov-file">Readme</a></div>' +
      // Releases：标题即链接 + 计数徽章（徽章在 <a> 之外，cloneNode 带不出来）
      '<div class="SidebarSection-module__sidebarSection__b">' +
      headingWithLink(R + "/releases", "Releases", "53") +
      '<a href="' + R + '/releases/tag/v1.0">latest</a></div>' +
      // Sponsor this project：无标题链接 ⇒ 落到 /sponsors/<owner>
      '<div class="SidebarSection-module__sidebarSection__c">' +
      plainHeading("Sponsor this project") +
      '<a href="/' + owner + '"><img src="a.png" alt=""></a>' +
      '<a href="/sponsors/' + owner + '"></a>' +
      '<a href="https://ko-fi.com/x">ko-fi</a></div>' +
      // Contributors：标题即链接 + 计数徽章
      '<div class="SidebarSection-module__sidebarSection__d">' +
      headingWithLink(R + "/graphs/contributors", "Contributors", "180") +
      '<a href="/someuser"><img src="b.png" alt=""></a></div>' +
      // Languages：无标题链接 ⇒ 落到占比最高语言的搜索链接
      '<div class="SidebarSection-module__sidebarSection__e">' +
      plainHeading("Languages") +
      '<a href="' + R + '/search?l=swift">Swift 96.1%</a></div>'
    );
  }
  function sidebarSectionsHTML() {
    return (
      '<div class="prc-PageLayout-PaneWrapper-x pr-2">' +
      '<div class="CodeViewSidebar-module__borderGrid__abc">' +
      sidebarGridInnerHTML() +
      "</div></div>"
    );
  }
  /** 侧栏放在内容根内（走主选择器路径），并带一条文件区 tab 用于验证排序 */
  function sidebarRepoHTML() {
    return (
      repoHomeHTMLResponsive() +
      '<nav aria-label="Repository files" data-overflow-mode="wrap"><ul role="list">' +
      '<li><a id="ovReadme" href="#" aria-current="page">' +
      '<span data-component="text" data-content="README">README</span></a></li>' +
      "</ul></nav>" +
      '<div id="repos-split-pane-content" tabindex="0">' +
      '<div class="DirectoryRichtextContent-module__SharedMarkdownContent__hHXUL">' +
      '<article class="markdown-body entry-content" id="readmeArticle"><h1>README</h1></article>' +
      "</div>" +
      sidebarSectionsHTML() +
      "</div>"
    );
  }

  const sb = buildDOM(REPO_SLUG, { dockFixture: sidebarRepoHTML, quietNavigation: true });
  try {
    sb.win.eval(body);
  } catch (err) {
    errors.push("eval(sidebar): " + err.message);
  }
  await wait(1200);

  check("侧栏来源：Releases / Sponsor this project / Contributors / Languages 进面板，About 被跳过", () => {
    const d = sb.win.document;
    assert(sb.errors.length === 0, "window error: " + sb.errors.join(" | "));
    const missing = ["Releases", "Sponsor this project", "Contributors", "Languages"].filter(
      (l) => !panelItemByLabel(d, l)
    );
    assert(!missing.length, "缺少侧栏条目: " + missing.join(", "));
    assert(!panelItemByLabel(d, "About"), "About 应被跳过（无主链接）");
    return "4 个区块入面板，About 跳过";
  });

  check("侧栏来源：主链接解析正确（标题链接 / sponsors / search?l=）", () => {
    const d = sb.win.document;
    const owner = REPO.split("/")[0];
    const want = {
      Releases: "/" + REPO + "/releases",
      "Sponsor this project": "/sponsors/" + owner,
      Contributors: "/" + REPO + "/graphs/contributors",
      Languages: "/" + REPO + "/search?l=swift",
    };
    const bad = [];
    Object.keys(want).forEach((label) => {
      const el = panelItemByLabel(d, label);
      const got = el && el.getAttribute("href");
      if (got !== want[label]) bad.push(label + ": " + got + " ≠ " + want[label]);
    });
    assert(!bad.length, bad.join(" | "));
    return "4 条主链接全部命中";
  });

  check("侧栏来源：计数徽章补上（Releases 53 / Contributors 180，非标签尾文本）", () => {
    const d = sb.win.document;
    const rl = panelItemByLabel(d, "Releases");
    const ct = panelItemByLabel(d, "Contributors");
    const rlC = rl && rl.querySelector(".Counter");
    const ctC = ct && ct.querySelector(".Counter");
    assert(rlC && rlC.textContent.trim() === "53", "Releases 徽章 = " + (rlC && rlC.textContent));
    assert(ctC && ctC.textContent.trim() === "180", "Contributors 徽章 = " + (ctC && ctC.textContent));
    assert(
      (rl.getAttribute("aria-label") || "") === "Releases",
      "标签不该带计数后缀，实际 = " + rl.getAttribute("aria-label")
    );
    return "53 / 180，标签保持纯名";
  });

  check("侧栏来源：站外链接与 `#` 路由键不进面板", () => {
    const d = sb.win.document;
    const hrefs = Array.from(d.querySelectorAll("#mgga-nav-dock a")).map(
      (a) => a.getAttribute("href") || ""
    );
    const leak = hrefs.filter(
      (h) => /example\.com|ko-fi\.com/.test(h) || h.startsWith("#")
    );
    assert(!leak.length, "泄漏条目: " + leak.join(", "));
    return hrefs.length + " 条全为同源导航";
  });

  check("侧栏来源：作为独立分组排在文件区 tab 之后（只留分割线，不留栏名小标题）", () => {
    const d = sb.win.document;
    const panel = d.getElementById("mgga-nav-dock");
    // 分区小标题已取消：不得再出现任何 caption 节点
    const captions = Array.from(
      panel.querySelectorAll(".mgga-nav-dock-divider-caption")
    ).map((e) => e.textContent.trim());
    assert(
      !captions.length,
      "分区小标题应已取消，实际仍有: " + JSON.stringify(captions)
    );
    // 但分组本身保留：分割线是**空元素**（不带文字），且必须有至少一条。
    // 取的是**滚动区**的子节点：v2026.10.30 起条目与分割线都下沉一层，
    // 面板的直接子节点只剩 [header, body] 两段。
    const scroller = panel.querySelector(":scope > .mgga-nav-dock-body");
    assert(scroller, "面板缺少滚动区 .mgga-nav-dock-body");
    const kids = Array.from(scroller.children);
    assert(
      !kids.some((el) => el.classList.contains("mgga-nav-dock-header")),
      "标题栏混进了滚动区 ⇒ 滚动条会盖住它"
    );
    const divPos = [];
    kids.forEach((el, i) => {
      if (!el.classList.contains("mgga-nav-dock-divider")) return;
      assert(
        !(el.textContent || "").trim(),
        "分割线不该带文字，实际 = " + JSON.stringify(el.textContent)
      );
      divPos.push(i);
    });
    assert(divPos.length >= 1, "分割线缺失（分组线索断了）");
    const posA = (label) =>
      kids.findIndex(
        (el) => el.tagName === "A" && el.getAttribute("aria-label") === label
      );
    assert(posA("README") >= 0, "文件区 tab 缺失");
    assert(posA("Releases") > posA("README"), "侧栏条目未排在文件区 tab 之后");
    assert(
      divPos.some((p) => p > posA("README") && p < posA("Releases")),
      "README 与侧栏分组之间没有分割线: " + JSON.stringify({ divPos, readme: posA("README"), releases: posA("Releases") })
    );
    return (
      "分割线 " + divPos.length + " 条（无小标题），Releases 在 README 之后"
    );
  });

  // ---------- 场景 3j: 侧栏是 SSR 骨架、注水后才填 —— 必须触发重建 ----------
  // 早短路（existingEarly 那一段）只比对 navBars 的廉价签名。若侧栏不进签名，
  // 第一次构建时侧栏为空 ⇒ 之后永不重建 ⇒ 侧栏条目永远不出现。
  function sidebarSkeletonHTML() {
    return (
      repoHomeHTMLResponsive() +
      '<div id="repos-split-pane-content" tabindex="0">' +
      '<div class="prc-PageLayout-PaneWrapper-x pr-2">' +
      '<div class="CodeViewSidebar-module__borderGrid__abc">' +
      '<div class="skeleton"><span class="prc-SkeletonText-x">Loading…</span></div>' +
      "</div></div></div>"
    );
  }
  const sk = buildDOM(REPO_SLUG, { dockFixture: sidebarSkeletonHTML, quietNavigation: true });
  try {
    sk.win.eval(body);
  } catch (err) {
    errors.push("eval(sidebarSkeleton): " + err.message);
  }
  await wait(900);
  const skeletonCount = sk.win.document.querySelectorAll("#mgga-nav-dock a").length;
  {
    // 注水：把真实区块塞进同一个 borderGrid（模拟 React 填内容）
    const grid = sk.win.document.querySelector("[class*='borderGrid']");
    grid.innerHTML = sidebarGridInnerHTML();
  }
  await wait(1200);
  const hydratedCount = sk.win.document.querySelectorAll("#mgga-nav-dock a").length;

  check("侧栏注水：骨架态不产出侧栏条目，注水后重建并补上", () => {
    assert(sk.errors.length === 0, "window error: " + sk.errors.join(" | "));
    assert(
      !!panelItemByLabel(sk.win.document, "Releases"),
      "注水后仍未出现 Releases 条目（早短路把重建拦住了）"
    );
    assert(
      hydratedCount > skeletonCount,
      "面板条目数未增长: " + skeletonCount + " → " + hydratedCount
    );
    return "骨架 " + skeletonCount + " 条 → 注水后 " + hydratedCount + " 条";
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
