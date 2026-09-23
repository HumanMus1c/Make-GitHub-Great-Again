# 实现记录：把仓库侧栏区块接进 nav dock（新增独立来源）

- 日期：2026-09-22
- 快照：`6094098`（`[snapshot]` 改动前检查点，回滚点）
- 前置取证：`docs/fixes/2026-09-22-sidebar-pane-dom-evidence.md`
  （结论「侧栏区块不是 `<nav>`，`findRepoHomeNavBars()` 永远收不到，
  要进 dock 必须新增一条独立来源」——本文是它的实现）
- 探针：`.workbuddy/probe/sidebar-sections.js` → `sections-{iina,vscode,k8s}.json`
- 结构版本：`NAV_DOCK_STRUCT_VER` 14 → **15**

## 需求（三条，来自用户确认）

| # | 决定 | 落地 |
| --- | --- | --- |
| 1 | 侧栏范围：**每个区块一条主链接** | `repoHomeSidebarSectionEntries()` |
| 2 | 面板位置：**文件区 tab 之后**，带分割线 + "侧栏"标题 | `barKey="repo-sidebar"` |
| 3 | 顺手修掉 `?tab=` 残留 | `navDockHasFileTabParam()` 例外分支 |

区块清单按真实 DOM 走：`Releases` / `Sponsor this project` / `Contributors` /
`Languages`；`About` 无任何链接（纯文本 h2，正文是描述文本），三级兜底全落空 ⇒
**按设计跳过**，不伪造锚点。`Deployments` / `Packages` / `Used by` 在抽样仓库里
`section` 开关多为 false，有则自然进来。

## 一、取数：为什么必须新写一套（而不是复用既有函数）

侧栏区块在 DOM 上**不是 `<nav>`**。四个视口场景实测 `nav` 恒为 4 个
（Global / Repository / Repository files / Footer），**PaneWrapper 内 nav 数 = 0**。
`findRepoHomeNavBars()` 只扫 `<nav>`，因此侧栏区块永远不会被当成"栏"收录 ——
这是设计内的结构空缺，不是可以靠放宽选择器绕过的。

三个新函数，全部挂在 `navDockViewportBucket` 之后：

```js
repoHomeSidebarGrid()                 // 定位 PaneWrapper 内的 [class*="borderGrid"]
repoHomeSidebarHeadingLabel(h2)       // 剥离 CounterLabel + VisuallyHidden，得纯名
repoHomeSidebarSectionEntries()       // 一个区块一条主链接 → [{href,label,counter}]
```

### 选择器只用稳定标记

```js
const scope = document.getElementById("repos-split-pane-content") || document;
// 只用 [class*=] 前缀 + data-component（GitHub 设计系统标记）
// 不用带构建哈希的完整模块类名（SidebarSection-module__sectionHeading__TG36m）—— 哈希一变即失效
```

### 主链接的三级兜底

区块标题结构本身分两类，所以取 href 要分三级：

| 级 | 选择器 | 命中谁 |
| --- | --- | --- |
| ① | `h2 a[href]` | 标题就是链接：Releases / Contributors / Languages |
| ② | `section a[href^="/sponsors/"]` | "Sponsor this project" 无标题链接，但必有出资页链接 |
| ③ | `section a[href*="/search?l="]` | Languages 的备选（语言筛选链接） |
| — | 全落空 | `About` → `href=""` → 跳过 |

②的 `^="/sponsors/"` **必须带尾斜杠**：否则会把页脚那条"了解更多"的 `/sponsors`
也吸进来（无尾斜杠时 `/sponsors` 前缀也匹配 `/sponsors/xxx`，但自身也会被误收）。

### 两条硬过滤

```js
if (!href || href.startsWith("#")) return;                       // #...-ov-file 是 React 路由键
if (new URL(href, location.origin).origin !== location.origin) return;  // 同源校验
```

- `#` 开头：`#contributing-ov-file` 这类是 React 路由键（**不是元素 id**，
  见 `2026-09-21-nav-dock-filetabs-pin-and-same-page-top.md`），侧栏不该把它
  当独立目的地重复提供。
- 同源：仓库官网（homepage）、ko-fi / liberapay 这类**站外**链接不进面板 ——
  进了就要接管点击，接管外站导航没有意义且会丢上下文。

### 标签与计数

`h2.textContent` 是拼接串（`"Releases53 (53)"`），括号来自 visually-hidden
读屏副本。所以：

- **标签**取 `h2 > span[class*=headingLinkWrapper] > a` 的纯文本；
- **计数**取 `[data-component='CounterLabel']` 的 `textContent`（即 `"53"`，
  无括号），存进 `item.counterText`。

## 二、接进数据源：`collectRepoHomeNavItems`

在既有 `navList` 循环**之后**追加（循环收不到它）：

```js
const sidebarEntries = repoHomeSidebarSectionEntries();
if (sidebarEntries.length) {
  currentBarKey = "repo-sidebar";
  currentBarLabel = i18n.t("navDockSidebar");   // 新增键：侧栏 / Sidebar
  sidebarEntries.forEach((sec) => {
    pushItem(sec.href, sec.label, null);
    if (!sec.counter) return;
    const pushed = items.find((x) => x.href === sec.href && !x.counterText);
    if (pushed) pushed.counterText = sec.counter;
  });
}
```

- 条目走**无源锚点**路径（`pushItem(href, label, null)`），由 `buildNavDockPanel`
  手工绘制 + 内置 octicon + 计数胶囊。**刻意不克隆侧栏标题链接** —— 克隆会带上
  `data-muted` 等标题专用样式，反而与面板其它条目不一致。
- 计数徽章在标题链接**之外**（是它的兄弟节点），`cloneNode` 带不出来，所以
  必须在 `buildNavDockPanel` 里补：

```js
appendNavDockCounterText(el, item);   // 造一个 .Counter 胶囊
```

克隆路径与回退路径**都**调它。

- `barKey="repo-sidebar"` 让它与仓库 tab 之间自然形成一条分割线（无需额外标记）。
- 去重仍走 `pushItem` 原有链（按标签归一 + 目的地归一）：若仓库 tab 里已有同一
  href（例如 Releases 在头部菜单也出现过），侧栏不会产生第二条。

## 三、图标：从官方包取真实 octicon，不手写

`buildNavDockFallbackIcon` 的 `ICON_PATHS` 新增 4 条 16px 路径，取自
`@primer/octicons`（**不手写路径数据**）：

| 区块 | key 匹配 | octicon |
| --- | --- | --- |
| Releases | `includes("release")` | `tag` |
| Contributors | `includes("contributor")` | `people` |
| Languages | `includes("language")` | `globe` |
| Sponsor this project | `includes("sponsor")` | `heart` |

## 四、签名：SSR 骨架 → 注水后必须能重建

侧栏区块**不属于任何 `<nav>`**，所以必须单独进 `navDockCheapSignature()`：

```js
const sidebar = repoHomeSidebarGrid();
// 每行取 [标题文本, 标题链接 href] 拼进签名
```

不这么做的后果是**早短路卡死**：第一次构建时侧栏还是 SSR 骨架（`a[href]` 数为 0，
只有 `SkeletonText`），注水后条目才出现；而早短路只比对 navBars 的签名 ⇒
判定"没变化"直接返回 ⇒ 侧栏条目**永远补不进来**。

（这正是前置取证文档证据六描述的现象：SSR 给 Releases/Used by/Contributors/
Languages 渲染骨架但锚点数为 0，内容由 `GET /{owner}/{repo}/_sidebar`
（`Accept: application/json`）补齐。）

## 五、`?tab=` 残留：v2026.10.23 的显式取舍，本次修掉

上一版在同页条目上**不清理** URL 的 `?tab=` 参数，并在日志里写成"显式取舍，
不是遗漏"：清参数需要走 React Router 的 `navigate`，而那正是当时要避免的重载。

本次的动作很小 —— **不跟页面抢**：

```js
function navDockHasFileTabParam() {
  const tab = new URLSearchParams(location.search).get("tab");
  return !!tab && /-ov-file$/i.test(tab);      // -ov-file 是 React 路由键
}
```

`handleNavDockItemClick` 路径 4（落地路径就是当前页，原本一律 `preventDefault`
只滚回顶部）加一条例外：URL 带 `?tab=<x>-ov-file` 时**不接管**，让这次点击作为
一次真实导航走完（`via=same-page-cleartab`）。其余情况行为不变。

### 为什么"不接管"就够了：页面侧另有一层接管了这次点击

真机点击取证（`MGGA_DIAG=1`）给出三条观测：

| 证据 | 观测 |
| --- | --- |
| 面板 Code 锚点被真实鼠标点中 | `{"target":"a.UnderlineNav-item[al=Code]","anchorHref":"/iina/iina","inPanel":true,"trusted":true}` |
| **我们没 preventDefault，`defaultPrevented` 却是 true** | 同上记录的 `prevented:true` —— 说明另有一层（文档级）拦截器接住了它 |
| 随后有**页面锚点**被合成点击，且 URL 一步直达规范路径 | `{"target":"a","anchorHref":"https://github.com/iina/iina","inPanel":false,"trusted":false}`；`URL 采样：["/iina/iina?tab=License-1-ov-file","/iina/iina"] hardNav=false`，同次 `docId` 不变 |

结论：这次导航**由页面自己完成**（软导航、非整页重载），我们唯一正确的动作就是
别跟它抢。**但"是哪一层接的"没有定位到**——我最初的推断是"React Router 靠
`data-discover` 属性认领克隆锚点"，为此在 `6.0` 里加了两个观测点，结果**推翻**了它：

```
6.0 面板 Code 条目锚点: {"raw":"/iina/iina","hasTab":false,"dataDiscover":null,"hasReactKey":false}
```

面板锚点既没有 `data-discover`，也没有 `__react*` 自有键（克隆只复制属性）。
那条 `trusted:false` 的页面锚点点击也**不是脚本发的**（脚本里的 `.click()` 只有
四处：路径 3 的两处回放 + 点击闸门的两处 trigger）。究竟是谁、按什么条件接管，
**仍是未解**，只留下"存在这样一层"的实证。

> 这个未解点直接决定了判据取在哪：既然无法从脚本侧保证它一定发生，就不能把
> "参数被清掉"写成断言。

### 试过又被回退的一版：自己 preventDefault + 委派给源锚点

曾按路径 3 的做法改过一版：`preventDefault` + 把导航**委派给页面自己的锚点**
（`item.source`），复用同一个 `canDelegate` 守卫（源锚点存在 + 已连接 +
`navDockAnchorIsReactManaged`）。**已回退**，理由是真机实测：

- 面板 Code 条目的 `item.source` **不带** `__react*` 自有键 ⇒ `canDelegate` 恒为
  false ⇒ 该分支**从未在真机上执行过**（日志里区分出的 `via=same-page-cleartab-pass`
  就是它在真机上的唯一归宿）。它只在 jsdom 夹具里"手工盖章"时才跑得动。
- 既无收益，又多带一次合成导航，且那一版观测里出现过一次 `Execution context was
  destroyed, most likely because of a navigation`（整页导航）。

结论：留 v1（放行），删掉这条死代码。这也是"先写测试再改"的反面教材 ——
当初那条 jsdom 场景是**为了迁就实现而手工造出条件**才变绿的。

### 可靠性与判据

"参数最终被清掉"是**页面侧**行为。真机 17 次观测里 10 次成功（约 3/5），失败表现为
URL 与 docId 都不动（既没软导航、也没整页导航）。分视口看差异明显：

| 视口 | 观测 | 成功 | 说明 |
| --- | --- | --- | --- |
| 移动端 | 11 | 8 | 约 3/4 |
| 桌面端 | 6 | 2 | 约 1/3 |

因此：

- 断言只压**脚本自己的决策**（`via=same-page-cleartab`）—— 这一层确定、可红绿对照；
- "参数被清掉"只作 INFO 观测（`6.0` / `6.0s` / `6.0d` / `6.2`），并在 `6.2` 里
  给出 URL 采样序列，方便下次一眼看出是"页面没出手"还是"导航被回滚"。

> 给用户的诚实结论：这条修复把"点了 Code 却还看着 License"的**错误行为**去掉了
> （不再只滚回顶部），并且把清参数这一步交还给页面 —— 但这一步本身**不是每次都
> 会发生**（桌面端尤其明显）。要 100% 可靠，得能调用 React Router 的 navigate，
> 那超出用户脚本可控范围。

## 六、验证

### 6.1 离线回归 `tools/smoke-load.js`：55 → **62/62 PASS**

新增三个场景 + 对应夹具：

| 场景 | 断言 | 夹具 |
| --- | --- | --- |
| 3i | 侧栏来源进面板（5 项：条目存在、顺序、标签纯净、计数胶囊、About 缺席） | `sidebarGridInnerHTML` |
| 3j | 侧栏骨架 → 注水后重建（签名必须变） | `sidebarSkeletonHTML` |
| 3k | `?tab=` 例外：带参数时**不接管**（`defaultPrevented=false`、不自滚），不带参数时仍接管 | `sidebarRepoHTML` |

### 6.2 真机验证 `tools/verify-live-navdock.js`：22 → **28/28**

新增场景（含侧栏来源与 `?tab=` 修复后的复测）：

| 场景 | 内容 | 类型 |
| --- | --- | --- |
| 0.5 | 按模式取真实标签（各仓库许可 tab 命名不同：iina=`License` / vscode=`MIT license`） | PASS 断言 |
| 0.7–0.11 | 侧栏来源：Releases / Sponsor / Contributors / Languages 进面板，计数正确，About 缺席，无站外条目 | PASS 断言 |
| 6.1 | **放行软导航而非接管**（`via=same-page-cleartab`） | PASS 断言 |
| 6.0 / 6.0s / 6.0d / 6.2 | 面板 Code 锚点的 href 与认领属性、URL 采样序列、点击命中谁、谁拦了默认、选中 tab 前后值 | INFO 诊断 |
| 8 | 跨页条目软导航 pass-through（带 2 次重试 + 把 click 方式与 via 记入证据） | PASS 断言 |

四组组合（iina / vscode × desktop / mobile）**全部 28/28 通过**，
`docId` 全程不变（零整页重载）。

真机通道的两个关键坑（详见 `2026-09-22-live-navdock-verification.md`）：
CSP `script-src github.githubassets.com 'sha256-…'` 会拦 `addScriptTag({content})`，
必须走 `page.evaluate(脚本字符串)`（CDP `Runtime.evaluate`，与 DevTools 控制台同级）；
`page.on('load')` **不能**判整页重载，必须用 `window.__mggaDocId` 文档标识。

`MGGA_DIAG=1` 可开启点击诊断（受环境变量控制，默认关闭，不影响正常跑）。
诊断会在 `window` 冒泡阶段（最后一个看到事件的监听器）记录每次点击的
目标 / 锚点 href / 是否在面板内 / 最终 `defaultPrevented` / 是否可信事件 /
所属 `nav`，并在点击坐标上做一次 `elementFromPoint` —— 用于回答"这条锚点被点到了吗"
与"默认行为是谁拦的"。另有两项**默认开启**的稳健性改进，都是本次被整页导航
（`Execution context was destroyed`，此前会让工具 EXIT=2 整个挂掉）逼出来的：
`6.0s` URL 采样序列、以及把点击后的测量包在 try/catch 里并把硬导航记成 FAIL。

### 6.3 红绿对照

同一套断言喂给改动前版本（`MGGA_SCRIPT=.workbuddy/probe/prev-before-sidebar.js`，
取自 `git show 6094098:Make-GitHub-Great-Again.js`）⇒ **62 项中 6 项 FAIL**：

- 1 项 `?tab=` 例外：`带 ?tab= 时仍被接管 ⇒ 只滚回顶部，正文继续停在概览文件上`
- 5 项侧栏来源：条目缺失 / 主链接解析 / 计数徽章 / 分割标题 / 骨架→注水重建

（"About 不进面板"在旧版上会**空过** —— 旧版根本没有侧栏来源，本来就没有 About，
这条断言本身不构成对本次改动的检验，真正起作用的是上面 6 项。）

新版本 **62/62**。断言在检验本次改动，不是恒真。

## 复现

```bash
# 离线回归（无需网络）
node tools/smoke-load.js                      # → 共 62 项，PASS 62，FAIL 0

# 红绿对照：把改动前的脚本喂给同一套断言
git show 6094098:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-sidebar.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-sidebar.js node tools/smoke-load.js
                                              # → 共 62 项，PASS 56，FAIL 6

# 真机验证（需能访问 github.com；四个组合）
node tools/verify-live-navdock.js --url https://github.com/iina/iina       --mode desktop
node tools/verify-live-navdock.js --url https://github.com/iina/iina       --mode mobile
node tools/verify-live-navdock.js --url https://github.com/microsoft/vscode --mode desktop
node tools/verify-live-navdock.js --url https://github.com/microsoft/vscode --mode mobile

# 真机 + 点击诊断（额外输出 6.0d：命中谁 / 谁拦了默认）
MGGA_DIAG=1 node tools/verify-live-navdock.js --url https://github.com/iina/iina --mode mobile
```

## 回滚

```bash
git reset --hard 6094098
```
