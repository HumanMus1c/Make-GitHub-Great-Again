// 仿真验证:findMoreMenu / harvestMoreItems 对 GitHub Primer 新版 ActionMenu portal 的收割
// 复刻 userscript 中的关键函数(与 Make-GitHub-Great-Again.js 保持一致),用 jsdom 模拟 DOM
"use strict";
const fs = require("fs");
const path = require("path");
let JSDOM;
try {
  JSDOM = require("jsdom").JSDOM;
} catch (_) {
  console.log("SKIP: jsdom not installed");
  process.exit(0);
}

const html = `<!doctype html><html><body>
<nav id="repoTabBar" aria-label="Repository">
  <ul>
    <li><a href="/owner/repo" aria-current="page">Code</a></li>
    <li><a href="/owner/repo/issues">Issues</a></li>
    <li><button id="moreBtn" aria-haspopup="true" aria-expanded="false" aria-controls="am-overlay-1">More</button></li>
  </ul>
</nav>
<nav id="filesNav" aria-label="Repository files">
  <ul>
    <li><a href="#" aria-current="page">README</a></li>
  </ul>
  <div class="prc-UnderlineNav-MoreButtonContainer">
    <button id="filesMoreBtn" data-component="overflow-menu-button" aria-haspopup="true" aria-expanded="false" class="prc-UnderlineNav-MoreButton"><span>More<span class="sr-only"> items</span></span></button>
  </div>
</nav>
<!-- 已关闭残留的旧菜单 portal(隐藏):幽灵菜单 -->
<div class="ActionMenu-Overlay" id="ghostMenu" hidden>
  <ul role="menu"><li><a href="/owner/repo/pulse">Insights</a></li></ul>
</div>
</body></html>`;

const dom = new JSDOM(html, { pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

// 从 userscript 提取源码里这几个函数的原文,在 jsdom 环境执行
const src = fs.readFileSync(
  path.join(__dirname, "..", "Make-GitHub-Great-Again.js"),
  "utf8"
);

function grabFn(name) {
  const re = new RegExp("  (?:async )?function " + name + "\\(");
  const m = src.search(re);
  if (m < 0) throw new Error("fn not found: " + name);
  // 括号配对截取
  let i = src.indexOf("{", m), depth = 0, j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) break; }
  }
  return src.slice(m, j + 1);
}

const code = [
  // harvestMoreItems 的滚动锁定是一个引用计数的模块级状态机，
  // 逐函数抽取拿不到它的状态变量，需显式补一段（2026-09-21 补）
  `const NAV_DOCK_SCROLL_LOCK_STYLE_ID = "mgga-nav-dock-scroll-lock-style";
   let navDockScrollLockCount = 0;
   let navDockScrollSnapY = 0;
   let navDockScrollSnapHandler = null;
   // unlockPageScrollForHarvest 的回弹要读"回弹抑制截止时刻"（用户主动定位时置位）；
   // 漏声明会让 50ms 后的回弹回调抛 ReferenceError（2026-09-21 补）
   let navDockScrollRebounceSuppressUntil = 0;`,
  grabFn("normalizedText"),
  // extractMenuItems 内部用 navDockAnchorLabel 剥离计数器后取文本，
  // 漏抓会让仿真实例抛 ReferenceError（2026-09-21 补）
  grabFn("navDockAnchorLabel"),
  grabFn("isMoreLabel"),
  grabFn("isVisibleMenu"),
  grabFn("findMoreTrigger"),
  grabFn("findMoreMenu"),
  grabFn("extractMenuItems"),
  grabFn("lockPageScrollForHarvest"),
  grabFn("unlockPageScrollForHarvest"),
  // harvestMoreItems/Locked 的诊断分支会调用 navDockDescribeNode；
  // 按名抽取的沙箱里若缺它，带 diag 的调用路径会 ReferenceError（2026-09-21 补）
  grabFn("navDockDescribeNode"),
  grabFn("harvestMoreItemsLocked"),
  grabFn("harvestMoreItems"),
].join("\n");

const runner = new window.Function(
  "document", "window", "HTMLElement", "HTMLDetailsElement", "HTMLAnchorElement", "KeyboardEvent",
  code + "\nreturn { findMoreTrigger, findMoreMenu, isVisibleMenu, extractMenuItems, harvestMoreItems };"
);
const api = runner(
  document, window, window.HTMLElement, window.HTMLDetailsElement, window.HTMLAnchorElement, window.KeyboardEvent
);

// isVisibleMenu 需要真实布局:jsdom 无布局,getBoundingClientRect 恒为 0
// 手动给尺寸探针打补丁,模拟"已渲染"状态
const origRect = window.Element.prototype.getBoundingClientRect;
function patchRect(el, w, h) {
  el.getBoundingClientRect = () => ({ width: w, height: h, top: 0, left: 0, right: w, bottom: h });
}
// jsdom 未实现 scrollTo，滚动锁定/解锁会刷 "Not implemented" 噪音，直接打桩
window.scrollTo = () => {};

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("PASS " + name); }
  else { fail++; console.log("FAIL " + name); }
}

(async () => {
  // 场景1:未点击时预检(allowGlobalFallback=false)不得抓到别的可见菜单
  // 注:幽灵菜单 hidden,先验证预检返回 null
  const filesMore = document.getElementById("filesMoreBtn");
  patchRect(filesMore, 60, 32);
  const preMenu = api.findMoreMenu(filesMore, false);
  check("precheck returns null when no owned menu", preMenu === null);

  // 场景2:点击后 portal 出现在 body 下(不在按钮容器内)
  const portal = document.createElement("div");
  portal.setAttribute("data-target", "action-menu.overlay");
  portal.className = "Overlay";
  const ul = document.createElement("ul");
  ul.setAttribute("role", "menu");
  ul.className = "ActionListWrap";
  const mk = (href, label) => {
    const li = document.createElement("li");
    li.className = "ActionListItem";
    const a = document.createElement("a");
    a.setAttribute("href", href);
    a.className = "ActionListContent";
    a.textContent = label;
    li.appendChild(a);
    ul.appendChild(li);
  };
  mk("/owner/repo/blob/main/CONTRIBUTING.md", "Contributing");
  mk("/owner/repo/blob/main/LICENSE", "License");
  portal.appendChild(ul);
  document.body.appendChild(portal);
  patchRect(portal, 220, 96);

  const postMenu = api.findMoreMenu(filesMore, true);
  check("post-click global fallback finds body portal", postMenu === portal);

  const items = api.extractMenuItems(postMenu);
  check("portal yields 2 items", items.length === 2);
  check("item1 Contributing", items[0] && items[0].label === "Contributing");
  check("item2 License", items[1] && items[1].label === "License");

  // 场景3:隐藏的幽灵菜单永不被收割
  const ghost = document.getElementById("ghostMenu");
  check("hidden ghost menu rejected by isVisibleMenu", !api.isVisibleMenu(ghost));

  // 场景4:harvestMoreItems 全流程(按钮未展开 → 点击 → 等 portal)
  filesMore.setAttribute("aria-expanded", "false");
  const harvestDiag = {};
  const harvested = await api.harvestMoreItems(filesMore, harvestDiag);
  check("harvestMoreItems returns 2 items", harvested.length === 2);
  // 诊断出参：必须如实记录"确实点过"（此场景按钮未展开 ⇒ clicked=true）
  check("harvest diag records clicked=true", harvestDiag.clicked === true);
  check(
    "harvest diag records menu container",
    typeof harvestDiag.menu === "string" && harvestDiag.menu.length > 0
  );

  // 场景5:aria-controls 指向隐藏 portal 时,预检允许所有权菜单但收割时只收可见
  const tabMore = document.getElementById("moreBtn");
  const owned = document.createElement("div");
  owned.id = "am-overlay-1";
  owned.hidden = true;
  document.body.appendChild(owned);
  const ownedMenu = api.findMoreMenu(tabMore, false);
  check("aria-controls owned menu returned even if hidden (ownership)", ownedMenu === owned);

  console.log("\\nRESULT: pass=" + pass + " fail=" + fail);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
