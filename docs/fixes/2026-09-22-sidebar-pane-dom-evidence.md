# 取证记录：仓库侧栏区块是否位于 PaneWrapper 容器内（桌面 / 移动）

- 日期：2026-09-22
- 快照：06f868e（本记录写入前的检查点）
- 探针：`tools/probe-sidebar-pane.js` → `tools/probe-sidebar-pane.json`
- 触发问题：`Releases (53)`、`Sponsor this project`、`Deployments`、
  `Contributors (180)`、`Languages` 等在**移动端**是否位于容器
  `#repos-split-pane-content > div > div > div > div.prc-PageLayout-PaneWrapper-pHPop.pr-2`
  内部？

## 结论

**是。** 这些区块全部在该容器内部，**移动端与桌面端完全一致**——容器本身就是
那个 `div.prc-PageLayout-PaneWrapper-pHPop.pr-2`，它是 GitHub 新版 React 仓库页
`PageLayout.Pane`（`position:"end"`、`className:"pr-2"`）的产物，内部唯一子结构
是 `CodeViewSidebarLayout`（`div.CodeViewSidebar-module__borderGrid__Lpx5q`），
所有侧栏区块都挂在这个 borderGrid 下。

移动端**唯一的真实差异**只有一条：`About` 区块带 `hide-sm hide-md`，在 <lg 视口
被 CSS 隐藏（其信息被移到仓库头部）。其余区块照旧留在同一容器、同一层级。

## 证据一：四份 DOM 的选择器命中（SSR / 注水 × 桌面 / 移动）

| DOM 来源 | 精确选择器命中 | content→PaneWrapper 深度 | 容器内 SidebarSection |
| --- | --- | --- | --- |
| SSR 未注水（logged-out） | 1 | 4 | 6（About/Releases/Sponsor/**Used by**/Contributors/Languages） |
| 注水 · 移动 390×844 | 1 | 4 | 5 |
| 注水 · 桌面 1440×900 | 1 | 4 | 5 |
| 真实 Chrome · 移动 400 | 1 | 4 | 5 |
| 真实 Chrome · 桌面 1280 | 1 | 4 | 5 |

命中链（内→外，四种场景逐字相同）：

```
div.prc-PageLayout-PaneWrapper-pHPop.pr-2
  < div.prc-PageLayout-PageLayoutContent-BneH9
  < div.prc-PageLayout-PageLayoutWrapper-2BhU2
  < div.prc-PageLayout-PageLayoutRoot--KH-d.container-xl
  < div#repos-split-pane-content.SharedPageLayout-module__content__IwGAp
```

即 `#repos-split-pane-content > div > div > div > div.prc-PageLayout-PaneWrapper-pHPop.pr-2`
**层数恰好 4、逐层 div、无中间包裹**，用户给的这条选择器是精确的。

> 踩坑提醒：不能在 `#repos-split-pane-content` 这个元素身上
> `el.querySelector(选择器)` —— 选择器以该元素自身的 id 开头，`querySelector`
> 只匹配后代，必然返回 0 命中，会被误判成"注水后结构变了"。用
> `document.querySelector` 或在 content 内改用相对选择器（`[class*="PageLayout-PaneWrapper"]`）。

## 证据二：UA 不改变 DOM（"移动端页面"不是另一套 SSR）

同一 URL 分别用桌面 UA 与 iPhone UA 抓取：

| 项 | 桌面 UA | 移动 UA |
| --- | --- | --- |
| 响应体大小 | 383329 B | 383638 B |
| 首个字节差异 | @26007 —— 仅 `<meta name="fetch-nonce">` 的随机 UUID |
| PaneWrapper 命中 | 1（`pHPop`） | 1（`pHPop`） |
| SidebarSection 数 | 5 | 5 |

响应式行为全部由 **CSS 媒体查询**承担，服务端不派发移动专用标记。因此
"移动端会不会在别的容器里"这一假设不成立：位置由 CSS 决定，结构不变。

## 证据三：GitHub 自己 bundle 的装配源码

`/assets/code-view-*.js`（587 KB，含 `suggestedWorkflows`）里：

```js
// 侧栏装配组件（PageLayout.Pane position:"end" —— .PaneWrapper.pr-2 的来源）
jsx(l8.O7.Pane, { position:"end", sticky:false, divider:"none", width:"large",
                  className:"pr-2", children: jsx(h7, {overview, sidebarPayload}) })
```

`h7` 按**固定顺序**渲染 11 个边界，全部塞进 `hW`：

```js
jsxs(hW /* = <div class="CodeViewSidebar-module__borderGrid__Lpx5q"> */,
     { children: [cta, about, releases, sponsors, deployments,
                  packages, usedBy, contributors, languages,
                  templateRepository, suggestedWorkflows] })
```

| # | boundaryName | 开关 | 备注 |
| --- | --- | --- | --- |
| 1 | sidebar-cta | `sections.cta` | |
| 2 | sidebar-about | 恒渲染 | 带 `hide-sm hide-md` |
| 3 | **sidebar-releases** | `sections.releases` | 传 `releaseCount`/`tagCount` |
| 4 | **sidebar-sponsors** | `sections.sponsors` | 标题 `Sponsor this project` |
| 5 | **sidebar-deployments** | `sections.deployments` | 值为环境名数组，`maxToShow:3` |
| 6 | sidebar-packages | `sections.packages` | |
| 7 | sidebar-used-by | `sections.usedBy` | |
| 8 | **sidebar-contributors** | `sections.contributors` | |
| 9 | **sidebar-languages** | `sections.languages` | |
| 10 | sidebar-template-repository | payload | |
| 11 | sidebar-suggested-workflows | `sections.suggestedWorkflows` | |

由此可判定：**用户列出的顺序（Releases → Sponsor → Deployments → … → Contributors →
Languages）就是源码顺序**；而 `Deployments`/`Packages` 是否出现，取决于
`sections.*` 开关。

## 证据四：什么决定哪些区块出现（`sections` 开关实测）

开关来自 SSR 内嵌 payload 的 `codeViewRepoRoute.sections`，实测：

| 仓库 | releases | sponsors | deployments | packages | usedBy | contributors | languages |
| --- | --- | --- | --- | --- | --- | --- | --- |
| iina/iina | `{releaseCount:53, tagCount:73}` | true | **false** | false | true | true | true |
| microsoft/vscode | 240/391 | false | false | false | true | true | true |
| home-assistant/core | 1645/1646 | true | false | **true** | true | true | true |
| sveltejs/svelte | 638/1033 | true | false | true | true | true | true |
| mdn/content | — | false | false | false | true | true | true |

≈30 个仓库抽样中 `deployments` **全是 false**（该区块需要默认分支上存在
deployment/环境才会渲染），`packages` 也只在确有包发布时为 true。

## 证据五：`(53)` / `(180)` 这两个括号从哪来

注水后标题的真实 DOM：

```html
<h2 class="SidebarSection-module__sectionHeading__TG36m ...">
  <span class="SidebarSection-module__headingLinkWrapper__cXAex">
    <a class="...headingLink...">Releases</a>
    <span class="ml-1 prc-CounterLabel-CounterLabel-X-kRU">53</span>      <!-- 可见计数徽章 -->
    <span class="prc-VisuallyHidden-VisuallyHidden-Q0qSB">(53)</span>    <!-- 视觉隐藏，给读屏 -->
  </span>
</h2>
```

- 视觉可见：`Releases` + 计数徽章 `53`（**没有括号**）
- `textContent`：`"Releases53 (53)"`（括号来自 visually-hidden 的读屏副本）

所以用户看到的 "(53)" 是**读屏文本**。对 nav-dock 的直接影响：任何基于
`textContent` 的标签提取都会拿到 `Releases53 (53)` 这类拼接串，需要
①优先取 `headingLinkWrapper > a` 的纯名，②或剥离尾部 `\d+\s*\(\d+\)` 与
无空格计数（与 `navDockAnchorLabel` 的剥尾正则同源问题）。

## 证据六：SSR 是骨架，注水才有内容

SSR 里 `Releases`/`Used by`/`Contributors`/`Languages` 四个区块的 `a[href]` 数为 **0**，
结构是：

```html
<div class="SidebarSection-module__sidebarSection__e8jFN">
  <h2 ...><span>Releases</span></h2>
  <div class="prc-SkeletonText-SkeletonText--DvUT ..." data-text-skeleton-size="bodyMedium"></div>
</div>
```

内容在注水后由 XHR 补齐，bundle 内的取数函数：

```js
async () => { const n = await fetch(`/${owner}/${repo}/_sidebar`); return n.json(); }
```

实测 `GET https://github.com/{owner}/{repo}/_sidebar`：

| 请求头 | 结果 |
| --- | --- |
| 无 `Accept` | **400**（空体） |
| `Accept: application/json` | **200**，`application/json`，3572 B |
| `Accept: text/html` + `X-Turbo-Frame` | **406** |

返回字段：`releases` / `sponsors` / `contributors` / `languages` / `deployments` /
`packages` / `usedBy` / `suggestedWorkflows` / `configCallToAction`。
iina 的实测值里 `contributors.contributorCount = 180` —— 与用户看到的
`Contributors (180)` 完全对上；`usedBy` / `deployments` / `packages` 为 `null`。

**注意 SSR 6 个区块 vs 注水后 5 个区块的差异**：SSR 会给 `Used by` 渲染骨架，
但 `/_sidebar` 返回 `usedBy: null`，于是 `C.usedBy && …` 为假，注水后该区块
**直接消失**。也就是说——SSR 骨架数量**不能**当作最终区块清单。

## 对 nav-dock 的直接含义

1. **这些侧栏区块不是 `<nav>`。** 四个视口场景里 `nav` 总数恒为 4：
   `Global` / `Repository` / `Repository files` / `Footer`，且
   **PaneWrapper 内 `<nav>` 数 = 0**。`findRepoHomeNavBars()` 只扫 `<nav>`，
   因此侧栏区块永远不会被当作"栏"收录——这是设计内的，不是缺陷。
2. 若要让 `Releases` / `Contributors` / `Languages` 进 dock，需要新增一条
   侧栏来源（容器用本文这条精确选择器，或直接读 `/_sidebar` JSON，
   后者免去 DOM 时序与标签拼接问题）。
3. 时序：SSR 阶段侧栏是骨架，早期扫描必然取不到锚点；侧栏来源必须挂在
   注水完成（或 `/_sidebar` 返回）之后。
4. 移动端不会给侧栏带来结构性差异，**不需要为移动端写第二套选择器**；
   唯一需要按视口区分的是 `About` 的 `hide-sm hide-md`。

## 复现

```bash
# 双视口真实浏览器探针（本机 Chrome，需能访问 github.com）
node tools/probe-sidebar-pane.js https://github.com/iina/iina
# → tools/probe-sidebar-pane.json

# 纯 SSR 选择器核验（离线 HTML，无需网络）
node .workbuddy/probe/verify-sel.js
```

## 回滚

```bash
git reset --hard 06f868e
```
