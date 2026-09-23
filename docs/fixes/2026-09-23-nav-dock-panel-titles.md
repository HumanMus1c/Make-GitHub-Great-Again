# 2026-09-23 · nav dock：面板标题改品牌名「MGGA」+ 去掉各分区小标题

- **版本**：v2026.10.27
- **快照（回滚点）**：`8f3da60872a3293bb12b0670045c0f0c06188af8`
  （`git reset --hard 8f3da60` 可精确回退到改动前）
- **需求原话**：「将导航栏标题（#mgga-nav-dock > div.mgga-nav-dock-header >
  span.mgga-nav-dock-header-title）改为"MGGA"，再去除导航栏三个分区的每个分区的
  小标题（#mgga-nav-dock > div:nth-child(11)）（#mgga-nav-dock > div:nth-child(15)）」

## 一、先确认用户给的选择器指向谁（不猜）

用户只给了两个 `div:nth-child(...)`，却说是"三个分区"。**动手前先数清楚**——
用留档的**真实注水后 DOM**（`.workbuddy/probe/hydrated-desktop.html`）就地跑主脚本，
打印 `#mgga-nav-dock` 的每一个直接子节点（探针：
`.workbuddy/probe/diag-panel-children.js`，本次新增）：

```
file = hydrated-desktop.html | 直接子节点数 = 18
  1  DIV  .mgga-nav-dock-header     |      Floating nav dock v0.0.0 ✕
  2  A    ...UnderlineNav-item...   | Code
  ...
  9  A    ...UnderlineNav-item...   | Insights
 10  DIV  .mgga-nav-dock-divider    |      Repository files
 11  A    .prc-components-UnderlineItem-7fP-n | README
 12  A    ...                      | Contributing
 13  A    ...                      | License
 14  DIV  .mgga-nav-dock-divider    |      Sidebar
 15  A    .mgga-nav-dock-fallback   | Releases53
 16  A    ...                      | Sponsor this project
 17  A    ...                      | Contributors180
 18  A    ...                      | Languages
```

结论链条：

1. `#mgga-nav-dock` 的直接子节点里，除首个子节点 `.mgga-nav-dock-header` 外，
   **只有 `.mgga-nav-dock-divider` 是 `div`** —— 所有条目都是 `<a>`
   （克隆条目 `<a>`、手工回退条目 `a.mgga-nav-dock-fallback`）。
   ⇒ 用户给的两个 `div` 必然都是**分割线**，其"小标题"是分割线**内部**的
   `span.mgga-nav-dock-divider-caption`。
2. iina 注水页的分割线落在 **10 / 14**，用户页上是 **11 / 15** —— 整体 +1，
   即他的仓库标签栏比 iina 多一项（很正常：Projects / Wiki / Discussions 等
   开关不同的仓库项数不同）。结构形态一致。
3. **2 条分割线 ⇒ 3 个分区**，与用户说的"三个分区"吻合：仓库标签栏 /
   文件区 tab / 侧栏区块。第 1 个分区在面板里本来就没有 caption
   （`buildNavDockPanel` 的分割线条件是 `!isFirst`），所以他列出的是承载
   分区名的两条分割线。

> 这一步值得单独写下来：**如果按"用户给了 3 个分区却只给 2 个选择器"去推理，
> 很容易误判成"还有第三条分割线"或"header 也是分区标题"**。数一遍 DOM 就没了歧义。

## 二、改动一：标题文案 → 品牌名

```js
// 新增常量（与 NAV_DOCK_ID 同处）
const NAV_DOCK_BRAND = "MGGA";

// buildNavDockPanel 内
title.textContent = NAV_DOCK_BRAND;
```

- **不走 i18n**：品牌名在两种语言下都写作 `MGGA`，与同一 header 里
  `verSpan.title = "Make-GitHub-Great-Again"` 同理 —— 品牌不是可本地化文案。
- **面板无障碍名不变**：`panel.setAttribute("aria-label", i18n.t("navDock"))`
  （`左侧悬浮导航` / `Floating nav dock`）原地保留。标题改成品牌后，它不再承担
  "这个面板是什么"的说明职责，`aria-label` 就必须继续承担 —— 冒烟测试里
  为此加了一条断言（把 `aria-label` 误删当成回归）。

## 三、改动二：不再渲染分区小标题，**但保留分割线**

```js
if (!isFirst && lastBarKey !== null && barKey && barKey !== lastBarKey) {
  const divider = document.createElement("div");
  divider.className = "mgga-nav-dock-divider";
  divider.setAttribute("data-mgga-mutation-guard", "1");
  frag.appendChild(divider);          // 只留线
}
```

- 用户说的是"**去除…小标题**"，不是"去掉分组"。分割线本身是既有分组的视觉线索
  （见 `2026-09-19-nav-dock-grouping-and-retry.md`），因此**只删 caption**。
  面板现在的形态：`README / Contributing / License` …细线… `Releases …`。
- 样式表同步收敛：
  - 删除 `#mgga-nav-dock .mgga-nav-dock-divider-caption { … }`（已无人渲染）；
  - `.mgga-nav-dock-divider` 去掉 `display:flex` / `align-items` / `gap` /
    `padding-top` —— 这些只为承载文字而存在，现在是空元素，只留
    `margin` + `border-top`。
- `item.barLabel` **继续采集**，不再渲染：它同时被 `statsOut.barBuckets`
  用作点击决策日志的证据链（`barBuckets.set(nav, { …, barLabel })`），
  不是死字段。已在代码注释里写明，防止后来者"清理死代码"时删掉。

## 四、`NAV_DOCK_STRUCT_VER` 15 → 16

DOM 结构变了（少一个 `span`），沿用既有机制让旧面板强制重建一次。

## 五、验证

### 5.1 离线回归 `tools/smoke-load.js`：69 → **71/71 PASS**

| 类型 | 断言 |
| --- | --- |
| 新增 | **面板标题栏**：标题 `textContent.trim() === "MGGA"`；版本角标仍以 `v` 开头；关闭按钮仍在；`aria-label` 仍是可本地化的 navDock 文案（jsdom 的 `navigator.language` 是 `en-US` ⇒ 英文，两种都接受） |
| 新增 | **源码级闸门**：源码里 `mgga-nav-dock-divider-caption` 出现 0 次（渲染代码与样式表都不可能复活它）；`NAV_DOCK_BRAND = "MGGA"` 存在；`buildNavDockPanel` 内 `title.textContent = NAV_DOCK_BRAND`；`panel.setAttribute("aria-label", i18n.t("navDock"))` 仍在 |
| 改写 | 侧栏分组断言：由"有分割**标题**（侧栏/Sidebar）"改为"**没有 caption** + 分割线是空元素 + 分割线确实落在 README 与 Releases 之间" |

> 源码级闸门这条踩了一次坑：第一版写成"`buildNavDockPanel` 函数体内不得出现
> `i18n.t("navDock")`"，结果被同函数里的 `panel.setAttribute("aria-label", …)`
> 判成 FAIL。**守卫必须针对具体那一行（`title.textContent = …`），不能针对整个函数体**。

### 5.2 红绿对照

```bash
git show 8f3da60:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-panel-titles.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-panel-titles.js node tools/smoke-load.js
```

⇒ **71 项中 3 项 FAIL**，恰好是本次新增/改写的三条，其余 68 项不变：

```
FAIL  面板标题栏：标题为品牌名 MGGA…        标题应为 MGGA，实际 = "Floating nav dock"
FAIL  分区小标题已取消 + 面板标题为品牌名…   源码里仍残留 caption（渲染或样式）
FAIL  侧栏来源：…（只留分割线，不留栏名小标题）  分区小标题应已取消，实际仍有: ["Repository files","Sidebar"]
```

断言在检验本次改动，不是恒真。

### 5.3 留档真实 DOM 就地复验

同一探针跑新脚本（`hydrated-desktop.html` / `hydrated-mobile.html` 两份）：

| 观测 | 改前 | 改后 |
| --- | --- | --- |
| header title | `Floating nav dock` | **`MGGA`** |
| `divider` 数 | 2 | 2（不变） |
| caption 文本 | `["Repository files","Sidebar"]` | **`[]`** |
| 面板锚点总数 | 15 | 15（条目未受影响） |

面板 header 的 `textContent` 由 `Floating nav dockv0.0.0✕` 变为 `MGGAv0.0.0✕`。

### 5.4 未验证项（如实记录）

- **真机（真实 github.com）未跑**：本次是纯 DOM 文案/结构改动，判定不依赖排版层，
  离线 + 留档注水 DOM 已能覆盖；`tools/verify-live-navdock.js` 里的场景不涉及
  标题文案与分区小标题，无对应真机断言可加。
- **分割线的取舍是推断的**：用户给的是 `div` 选择器（含分割线本身），
  我只删了内部 caption、留下线。若用户本意是连细线一起去掉，改法是
  `buildNavDockPanel` 里不再 append `divider`（一处），或把
  `.mgga-nav-dock-divider` 的 `border-top` 去掉。

## 复现

```bash
# 离线回归（无需网络）
node tools/smoke-load.js                      # → 共 71 项，PASS 71，FAIL 0

# 红绿对照
git show 8f3da60:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-panel-titles.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-panel-titles.js node tools/smoke-load.js
                                              # → 共 71 项，PASS 68，FAIL 3

# 留档真实（注水后）DOM 就地复验：打印面板全部直接子节点 + 两个用户选择器的命中
node .workbuddy/probe/diag-panel-children.js hydrated-desktop.html
node .workbuddy/probe/diag-panel-children.js hydrated-mobile.html
```

## 回滚

```bash
git reset --hard 8f3da60872a3293bb12b0670045c0f0c06188af8
```
