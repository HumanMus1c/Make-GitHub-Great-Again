# 2026-09-21 dock 概览文件条目点击不能立即定位 / 未触发 AJAX

## 用户反馈

> 为什么点击了 README 项之后无法立即定位到 README 那里？默认情况下 README 不是
> 在页面默认展示的吗？不只 README，我要那些支持 AJAX 的项都支持立即定位到目标
> 位置并触发 AJAX。

两句提问分别指向两个不同缺陷：**README 点不动（跑到页首）**、**概览 tab 不触发
客户端路由**。

## 事实核查（真实抓取，非推测）

证据文件：`.workbuddy/probe/iina.html`、`microsoft_vscode.html`、
`kubernetes_kubernetes.html`（真实 SSR 全文），以及 `tools/probe-iina-desktop.json`
（结构化解剖）。探针：`.workbuddy/probe/diag-locate.js`（按名抽取主脚本真实函数，
跑在真实页面上）。

### 1. 文件区"概览文件"栏的三个 tab 全是 React 客户端路由占位

```html
<nav aria-label="Repository files" data-variant="inset" data-overflow-mode="wrap">
  <ul role="list">
    <li role="presentation" aria-hidden="true" class="...WrapSpacer--aLgz"></li>
    <li><a href="#" aria-current="page" class="...UnderlineItem-7fP-n">
          <span data-component="text" data-content="README">README</span></a></li>
    <li><a href="#" class="...UnderlineItem-7fP-n">…Contributing</a></li>
    <li><a href="#" class="...UnderlineItem-7fP-n">…License</a></li>
  </ul>
</nav>
```

三个 tab 都是 `href="#"` —— 真实路由由 React 拦截点击完成（这就是用户说的
**AJAX**）。README 带 `aria-current="page"`，即**默认选中**的那个。

### 2. 取数链把 README 落成"当前页路径"，点击 = 重载当前页

`collectRepoHomeNavItems` 的 `pushItem`：

```js
if (href === "#" && selectedAnchor) { href = location.pathname; }   // ← README 走这里
if (href === "#" && !selectedAnchor) { /* 白名单 tab → 解析成 blob 路径 */ }
```

真实页面上跑 `diag-locate.js` 的结果（三个仓库一致）：

```
"README"  selected=true  → 面板 href=/iina/iina     【=当前页 ⇒ 点击即重载】
"Contributing" selected=false → 面板 href=(解析成 /iina/iina/blob/HEAD/contributing.md)
```

⇒ 点 README = 浏览器导航到**当前 URL**（无 fragment）→ 整页重载 → 滚动位置清零、
回到页首。**既不是"定位"，也不是"立即"，且页面本来就展示着 README，重载纯属浪费。**
这正是"点击了 README 项之后无法立即定位到 README"的机制。

### 3. 面板克隆对 React 不可见 —— AJAX 能力丢失的根因

`collectNavDockOriginalAnchor` 深克隆源锚点并**剔除框架接管属性**
（`data-action`/`data-turbo-frame`/`data-pjax`/`data-hotkey`…）。关键在于：
React 把 `__reactProps$…` / `__reactFiber$…` 挂成 DOM 节点的**自有属性**，而
`cloneNode` **不复制自有属性** —— 克隆节点在 React 眼里根本不存在，点它只会走
原生 `href`。所以 `href="#"` 的概览 tab 在面板里彻底失去客户端路由能力。

（对比：真实 URL 的条目如 Issues / Pull requests，克隆的普通 href 仍能被 GitHub
自己的 Turbo 全局拦截器接管 —— `data-turbo-frame="repo-content-turbo-frame"`
实证其存在，所以那类条目本来就是 AJAX，本轮不动它们。）

### 4. GitHub 自己有页内锚点族，可直接复用

右侧 About→Resources 区：

```html
<h3 class="sr-only"><span>Resources</span></h3>
<div class="mt-2"><a href="#readme-ov-file"><span>Readme</span></a></div>
...
<a href="#License-1-ov-file">License</a>        <!-- iina -->
<a href="#MIT-1-ov-file">MIT license</a>        <!-- vscode -->
<a href="#Apache-2.0-1-ov-file">Apache-2.0 license</a>   <!-- kubernetes -->
```

⇒ GitHub 用 `#…-ov-file`（ov = overview）跳概览文件区块。但**SSR 里只有 href、
没有对应 id 元素**（`目标元素存在=false`，三仓库一致）—— id 由客户端补。这一点
决定了定位策略必须"优先认领已存在的元素"，否则会把点击判成"等渲染"，等不到就
变成空操作。

文件区正文容器的稳定标识：

- `#repos-split-pane-content`（`data-selector="repos-split-pane-content"`，文件区内容）
- `article.markdown-body.entry-content`（GitHub 渲染 markdown 的固定组合类）

## 修改方案

快照检查点 `f76cc9e`。版本 2026.10.20 → **2026.10.21**；面板结构版本 `12` → `13`
（点击行为变更，旧面板强制重建一次）。

### 分诊点击（新）

`handleNavDockItemClick(event, anchor, item)` —— 挂在面板每个条目上
（克隆节点与手工回退节点共用 `attachNavDockItemClick`）：

1. 修饰键 / 非主键 / `target=_blank` → 交还浏览器原生（新标签页等）；
2. 目标**已在页面上** → `preventDefault()` + 瞬时定位（`behavior:"auto"`，用户要
   的是"立即"）；
3. 目标未渲染且原锚点**已被 React 接管** → `preventDefault()` + 把点击交还原锚点
   （`navDockAnchorIsReactManaged` 探测 `Object.keys(el)` 里的 `__react*`），由
   React 客户端路由原地换出内容（= AJAX），再等目标出现后定位；
4. 未接管（注水前）或无可交还锚点 → 只等目标出现；始终没出现则退回条目自身的
   `href`，保持与改动前一致的可达性（`href === location.pathname` 时**不重载**）。

**作用域刻意收窄到概览文件类条目**（`isFileAreaTabLabel` 命中，或已确认存在
`-ov-file` 目标 id）。其余条目本来就是真实 URL、克隆 href 已被 Turbo 接管
（已是 AJAX），不碰它们以免无谓扩大改动面。

### 页内目标求解（新）

`navDockInPageTarget(item)`，**优先取已存在的元素**：

- A) `navDockOvFileAnchorIdFor(key)`：扫描页面上 `a[href="#xxx-ov-file"]`，文本
  归一后与面板标签同名（`navDockLabelKey` 只留字母数字，故 `Readme` ↔ `README`、
  `MIT license` ↔ `MIT license` 均命中）→ 拿 id，再 `getElementById`；
- B) 该条目是文件区**当前选中**的概览 tab（`aria-current`/`data-selected`）时，
  认领文件区已渲染的正文块 `navDockOverviewArticleEl()`。
  **这一条覆盖 README**：README 正文就在页面上，无需渲染也无需导航。

真实页面实测（`diag-locate.js`）：

| tab | 面板 href（改前） | 定位结果 |
|---|---|---|
| README | `/iina/iina`（=当前页） | id=`readme-ov-file`，el=正文块 ✅ |
| Contributing | blob 路径 | id=`contributing-ov-file`，el=null → 走交还原锚点 |
| License / MIT license / Apache-2.0 license | blob 路径 | id 分别为 `License-1-ov-file` / `MIT-1-ov-file` / `Apache-2.0-1-ov-file` ✅ |
| Code of conduct / Security | blob 路径 | id=null → 交还原锚点后按前缀等待 `#…-ov-file` |

### 滚动回弹抑制（配套）

`unlockPageScrollForHarvest` 的 1.5s 宽限期回弹只认 `snapY`，会把用户刚触发的
定位拉回原处（表现为"点了 README 刚滚过去就被拉回"）。新增
`navDockScrollRebounceSuppressUntil`，`navDockScrollToTarget` 置为
`now+1200ms`，回弹窗口内直接 return。

## 验证

- `node --check` 语法通过。
- `tools/smoke-load.js`：新增场景 3d（5 项断言）+ 夹具 `overviewFilesHTML()`。
  **46/46 PASS**。
- **红绿对照**：同一套断言喂给修复前版本（`.workbuddy/probe/prev-before-locate-fix.js`，
  取自快照 `f76cc9e`）⇒ **3 项 FAIL**（README 点击未拦截 ×2 场景、未选中 tab
  未交还原锚点），修复后全 PASS。
- `tools/verify-harvest-sim.js`：**10/10 PASS**（未回归）。
- 真实页面探针 `diag-locate.js`：iina / vscode / kubernetes 三仓库，
  README 面板 href 恒等于当前页路径（根因实证），定位恒命中正文块。
- 测试细节：jsdom 不实现导航，点真实链接会往 stderr 打 `Not implemented:
  navigation`，新增 `quietNavigation` 选项（仅本场景用独立 VirtualConsole 屏蔽，
  不影响 `window.onerror` 收集）。

## 未验证 / 待确认

- 真机（登录态仓库页）未能验证：本机网络到 github.com 不通（curl SSL error 35、
  node fetch failed），仅能对**已保存的真实 SSR** 做验证。
- 待确认：`#…-ov-file` 目标元素在客户端渲染后是否真的挂上 id。若挂上，
  未选中的概览 tab（Contributing/License…）点击后会交给 React 路由换出内容
  并滚到该区块；若没挂上，则退回条目 href（= 改动前行为，无回归）。
  真机点击后看控制台 `[MGGA] nav dock: locate "…" via=…` 一行即可判断走了哪条路。
- 定位动画目前是**瞬时**（`behavior:"auto"`，对应"立即"）；若要平滑滚动，
  改 `navDockScrollToTarget` 一处即可。

## 回滚

```bash
git reset --hard f76cc9e
```
