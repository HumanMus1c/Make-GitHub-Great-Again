---
topics: [fix, nav-dock, harvest, feasibility]
doc_kind: note
created: 2026-09-21
version: 2026.10.18
---

> **状态：已落地（2026-09-21，v2026.10.19）。** 落地记录见
> [`2026-09-21-nav-dock-clickless-harvest.md`](./2026-09-21-nav-dock-clickless-harvest.md)。
> 落地时的补充实测把结论进一步推强：**现有直扫早已覆盖全部溢出项**
> （`hidden` 挂在 `li` 上、不在 `a` 上），因此连"新增预渲染读取"都只是补足
> 边角；点击路径净收益为零。本文中的实现方案部分（新增取数函数、按
> `data-tab-item` 配对）已按下述方式落地，但"保留点击兜底"的闸门比本文更严。

# 免点击获取 More 折叠项：可行性论证（2026-09-21）

## 结论先行

**可行，且比现方案更稳。** 三类导航栏的「折叠项」在现行 GitHub 上都**已经存在于
服务端返回的初始 HTML 里**，不需要模拟点击、不需要等 React 注水、不需要
portal 兜底：

| 栏 | 折叠项所在 | 免点击取法 | 现网实测 |
| --- | --- | --- | --- |
| 仓库标签栏 `nav[aria-label="Repository"]` | `li[data-menu-item]`（与可见项 `a[data-tab-item]` **一一对应**） | `nav.querySelectorAll("[data-menu-item] a[href]")` | 5 个仓库全部命中，7~8 项 |
| 文件区栏 `nav[aria-label="Repository files"]` | 无需折叠：`data-overflow-mode="wrap"`，全部项外显 | 直接 `nav.querySelectorAll("a[href]")` | 5 个仓库全部 `wrap` |
| 全局头部 `nav[aria-label="Global"]` | 各下拉容器 `[aria-controls]` 指向的节点（SSR 已带 id） | `getElementById(btn.aria-controls)` 后取 `a[href]` | 匿名态已验证；登录态待补 |

## 证据链

### 1. 真实页面抓取（匿名，curl + jsdom 解析）

样本：`iina/iina`、`torvalds/linux`、`microsoft/vscode`、`facebook/react`、
`nodejs/node`、`kubernetes/kubernetes`（含 iPhone UA 对照，SSR 与 UA 无关）。

`nodejs/node` 的仓库栏结构（节选，均为**初始 HTML 存在**）：

```
nav[aria-label="Repository"] .js-repo-nav
├── ul.UnderlineNav-body
│   └── a.UnderlineNav-item.js-responsive-underlinenav-item[data-tab-item=i0code-tab][href=/nodejs/node]
│       …… 共 7 个（Code/Issues/Pull requests/Actions/Projects/Security and quality/Insights）
└── div.UnderlineNav-actions.js-responsive-underlinenav-overflow[style=visibility:hidden]
    └── action-menu
        ├── button[aria-haspopup=true][aria-controls=action-menu-xxxx-list]
        └── anchored-position#action-menu-xxxx-overlay
            └── .Overlay > .Overlay-body > action-list
                └── li.ActionListItem[data-menu-item=i0code-tab][hidden] > a.ActionListContent[href=/nodejs/node]
                    …… 共 7 个
```

- `data-tab-item` 与 `data-menu-item` 集合**完全一致**（7 = 7，双向覆盖）。
- 所有 `li[data-menu-item]` 初始 `hidden=true` —— 说明 SSR 只负责把「全集」渲染出来，
  「哪些显示在菜单里」由运行时按测量结果解除 `hidden`。
- 溢出容器初始 `visibility:hidden`；`visibility` 与 `hidden` 都只是**表现层**，
  与「节点是否存在」无关 —— 这正是免点击可读的根据。

### 2. GitHub 官方行为源码（决定性证据）

`github.githubassets.com/assets/behaviors-101ff92e267921e4.js`（模块 `G7`，未压缩片段）：

```js
function o(e) {
  let t = e.querySelectorAll(".js-responsive-underlinenav-item"),
      r = e.querySelector(".js-responsive-underlinenav-overflow"),
      n = l(r, e);
  if (!n) return;
  let i = [];
  for (let r of t) { let t = l(r, e); t && i.push({ item: r, rightEdge: t.left + r.offsetWidth }); }
  let a = false;
  for (let { item: e, rightEdge: t } of i) {
    let r = t >= n.left;                       // 该项右边缘越过溢出按钮左边缘 ⇒ 溢出
    e.style.visibility = r ? "hidden" : "";
    let k = e.getAttribute("data-tab-item");
    if (k) {
      let m = document.querySelector(`[data-menu-item=${k}]`);
      m instanceof HTMLElement && (m.hidden = !r);   // ← 只切 hidden，从不插入节点
    }
    a = a || r;
  }
  r.style.visibility = a ? "" : "hidden";
}
```

三点结论：

1. 行为**只做可见性切换**（`style.visibility` / `hidden`），**从不创建菜单项节点**
   → 菜单内容必然来自 SSR，点击 More **不产生任何新信息**。
2. `.js-responsive-underlinenav` 是全站唯一的此类纵向溢出行为（`data-menu-item` /
   `data-tab-item` 在全站 bundle 中各只出现 1 次），行为可穷举、无隐藏分支。
3. 触发器在**加载时与 resize 时**各算一次（`await i.K, o(e)` + `on(window,"resize")`），
   故不存在「注水晚了就没机会收割」的时序问题 —— 现方案里
   `NAV_DOCK_MAX_REBUILD_STREAK`、20s 窗口、2.5s 唯一重试、滚动锁定与回弹，
   全部是为绕开点击副作用而付出的复杂度。

### 3. 文件区栏已迁移为 wrap 模式

5 个仓库 + 移动 UA 对照，`nav[aria-label="Repository files"]` 恒为
`data-overflow-mode="wrap"`，`prc-UnderlineNav-MoreButton` 常驻 `display:none`，
全部项（README/Code of conduct/Contributing/License/Security）**外显**。

对比 `docs/fixes/2026-09-19-files-more-portal-harvest-and-left-align.md`：
当时 GitHub 把 Contributing/License 放在 React 注水后才填充的 body portal 里；
现已改为换行直排。**该栏的 portal 收割链路在现网已是死代码。**

## 推荐实现（增量、可回滚、保留点击兜底）

不动 `collectRepoHomeNavItems()` 的入面板逻辑（去重/白名单/克隆保真照旧），
只改「取数」这一步：

1. **新增 `readPrerenderedBarItems(nav)`（零副作用）**
   - `nav.querySelectorAll("[data-menu-item] a[href]")` → 仓库栏全集；
   - `nav.querySelectorAll("[aria-controls]")` → `getElementById()` 取下拉锚点 → 头部栏全集；
   - `nav.querySelectorAll("a[href]")` → 本栏外显项。
   - 按 `data-tab-item` / `data-menu-item` 的**键**优先与可见项配对：同一 tab 用
     可见项克隆（带计数胶囊），菜单副本仅用于补全集，避免「Issues 5k+」在面板里
     退化成「Issues」。
2. **`harvestMoreItems()` 降级为兜底**：仅当 `readPrerenderedBarItems()` 对某栏
   返回空、且该栏**存在可见 More 触发器**时才走现有点击链路（登录态头部若结构不同，
   自动落到这条路径，行为与现状一致）。
3. **状态机大幅简化**：`data-menu-item` 来自 SSR ⇒ 不需要「等待注水」，
   `navDockHasPendingTrigger` / `navDockEarliestRetryAt` / 滚动锁定 / 回弹可在
   主路径上退役（兜底路径仍需要）。`NAV_DOCK_STRUCT_VER` 递增一次强制重建。
4. **去重启发式可收窄**：现有 `normLabel`（剥计数后缀）与 `destOf`（目的地归一）
   双保险，本质是在猜「More 菜单副本与可见项是同一 tab」；有了
   `data-tab-item` 键，同一 tab 的判定变成精确匹配，启发式只服务兜底路径。

### 预期收益

- 零点击、零滚动副作用、零焦点抢夺 → 首屏即可定稿，不需要多轮重扫。
- 面板内容**与视口宽度解耦**：窄视口不再比宽视口多出头部溢出项
  （`verify-mobile-e2e.js` 里「移动 ≥ 桌面」的语义可以收紧为「两者一致」）。
- 强杀 `NAV_DOCK_MAX_REBUILD_STREAK` / 重试窗口 / 滚动锁定带来的复杂度。

## 风险与兜底

| 风险 | 处置 |
| --- | --- |
| 登录态全局头部结构未取证 | 下方探针一次性确认；结构不同则自动回落点击路径 |
| GitHub 改版去掉 `data-menu-item` | feature detect：读不到就走原点击链路；两套并存 |
| 菜单副本缺计数胶囊 | 按 data 键优先配对可见项克隆（见实现第 1 点） |
| `hidden=true` 被误当「该项在菜单里」 | 只读**全集**，不把 `hidden` 当判据 |

## 待补验证（登录态）

在登录态仓库页控制台执行，确认头部栏是否同样预渲染（贴回输出即可）：

```js
document.querySelectorAll("nav").forEach((nav) => {
  const label = nav.getAttribute("aria-label");
  const ov = nav.querySelector(".js-responsive-underlinenav-overflow");
  const ctrl = [...nav.querySelectorAll("[aria-controls]")].flatMap((b) => {
    const id = b.getAttribute("aria-controls");
    const t = id && document.getElementById(id);
    return t ? [...t.querySelectorAll("a[href]")] : [];
  });
  console.log(label, {
    可见项: nav.querySelectorAll(".js-responsive-underlinenav-item").length,
    dataMenu: nav.querySelectorAll("[data-menu-item]").length,
    溢出容器锚点: ov ? ov.querySelectorAll("a[href]").length : 0,
    ariaControls锚点: ctrl.length,
    More按钮: [...nav.querySelectorAll("button")].filter((b) => b.hasAttribute("aria-haspopup")).length,
  });
});
```

## 复现方法（本机）

```bash
# 1) 抓取样本页（curl 走系统代理；Chrome headless 在本沙箱内访问 github.com 超时，改用 curl）
curl -sS -L --ssl-no-revoke -A "<桌面 UA>" -o nodejs_node.html https://github.com/nodejs/node
# 2) jsdom 解析：核对 data-tab-item / data-menu-item 配对与 overflow-mode
node .workbuddy/probe/analyze-nav.js nodejs_node.html
node .workbuddy/probe/cmp-navs.js nodejs_node.html
# 3) GitHub 行为源码
curl -sS -L --ssl-no-revoke -o behaviors.js \
  https://github.githubassets.com/assets/behaviors-101ff92e267921e4.js
```

## 遗留

- 本沙箱内 headless Chrome 无法直连 `github.com`（代理仅对 curl 生效），
  `.workbuddy/probe/probe-clickless.js` 未能在真机跑通，需在本机（可直连）复跑，
  用于端到端比对「免点击集合」与「点击收割集合」是否等价。
