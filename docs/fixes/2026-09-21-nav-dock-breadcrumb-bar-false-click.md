---
topics: [fix, nav-dock, breadcrumbs, click-gate, harvest]
doc_kind: record
created: 2026-09-21
version: 2026.10.20
snapshot: a93d092
---

# 面包屑栏被点击闸门永久放行：多余点击的真实根因（2026-09-21）

## 现象

免点击版（v2026.10.19）上线后，用户在登录态仓库页复测，控制台仍出现：

```
[MGGA] nav dock: harvest click #1 ok on "?"
```

用户提问：为什么还有 click 事件？哪里触发了兜底？

## 取证链

### 1. 版本锁定：跑的确实是新代码

日志行号 `:5967`。v2026.10.19 工作副本中该 `console.info` 恰在第 5967 行；
改前快照 `8772c63` 的同一条在 5837 行。⇒ 不是旧脚本残留。

### 2. `"?"` 的含义：无名纯图标弹出按钮

`recordClick` 的标签回退链是
`normalizedText(trigger) || trigger.getAttribute("aria-label") || "?"`，
所以 `"?"` 表示触发器**既无文本、也无 aria-label** —— 一个纯图标按钮。

对真实页面（SSR 存档 + 注入探针）扫描"无文本 + 无 aria-label 的
`[aria-haspopup]` 元素"，全页只有 4 个：

| # | 所属容器 | 在 nav 内 | 说明 |
| --- | --- | --- | --- |
| 1 | `MarketingHeader-module__mobileActions` | 否 | 未登录营销头部 CTA |
| 2 | `MarketingHeader-module__ctaContainer` | 否 | 同上 |
| 3 | `div.UnderlineNav-actions.js-responsive-underlinenav-overflow` | **是**（`nav[aria-label=Repository]`） | 旧版仓库标签栏 More（带 `aria-controls`） |
| 4 | `OverviewContent-module__Box_10` | 否 | 仓库概览区 kebab |

只有 #3 在 nav 内，而该栏 `zeroClick=23`（直扫 15 + 预渲染 8）会被闸门拦住。
⇒ 被点的必然是**匿名页面上不存在**的那一栏 —— 登录态专有结构。

### 3. 铁证：仓库内的历史控制台存档给出了因果顺序

`.opensquilla/attachments/83d35e15-…/f52056d01b27-webchat-paste-20260920-133220.txt`
（2026-09-20 用户贴过的完整日志）第 87/91/92 行：

```
:5679 [MGGA] scan "Breadcrumbs" vis=2 trig=icon-btn      ← 该栏被扫到，触发器=纯图标
:5658 [MGGA] nav dock: harvest click #1 ok on "?"        ← 紧接着就点了它
:5679 [MGGA] scan "Repository" vis=9 trig=More items     ← 下一栏才轮到扫
```

`[MGGA] scan` 就在该栏闸门判定之前打印，点击日志出现在下一栏的 scan 之前
⇒ **被点的是 `nav[aria-label="Breadcrumbs"]`**（登录态 AppHeader 的面包屑栏），
其触发器正是"无名纯图标按钮"，与 `"?"` 完全吻合。

### 4. 根因：该栏的 zeroClick 恒为 0

Breadcrumbs 栏只有两个锚点：`/owner` 与 `/owner/repo`。

* `/owner` → 命中 `repoHomeRe` ⇒ `isBreadcrumbish` 判为面包屑 → 剔除；
* `/owner/repo` → `href === location.pathname` ⇒ 同样剔除。

于是该栏 `kept=0`、无 `[data-menu-item]` 副本、无栏外 `aria-controls` 目标
⇒ **zeroClick 恒为 0** ⇒ 只认 `zeroClick > 0` 的闸门对它**永远放行**。

后果：每个会话必然点开它的无名图标按钮（仓库选择器 picker），picker 里的
链接经 `pushItem` 直接入面板（`pushItem` 不过面包屑过滤）——
这正是 2026-09-20 起反复出现的重复/垃圾项来源。
`docs/fix-2026-09-20-dock-duplicate-tabs.md` 记录的"Breadcrumbs 栏 kebab
收割成功入面板"当时只按去重压制（同名/目的地归一），**没有堵住点击入口**。

需要说清一点：这一栏在免点击改造**前后都会被点** —— 改造前是"有触发器就点"，
改造后是"zeroClick=0 就点"。区别只在于原因：改造前它和别的栏一样被"点一次
收割"逻辑顺带覆盖，改造后 `zeroClick` 成了唯一闸门，而这一栏的零点击可得项
**恒为 0**，于是从"顺带被点"变成"必然被点"，且永远不会随其他栏一起退出点击
流程。所以它不是免点击改造引入的新回归，但改造让这个入口的漏洞显性化了 ——
也因此值得单独修掉。

### 5. 附带发现：日志措辞不实

`harvest click #N` 是**收割结论**，不是"确实点过"：
`harvestMoreItemsLocked` 在触发器自报 `aria-expanded="true"`（或 `<details open>`）
时会**跳过 click** 直接等菜单出现；命中预检菜单或全局兜底同样不点击。
首轮排查因此被误导（"到底点没点？"无法从日志判断）。

## 修复（v2026.10.20）

### A. 点击路径唯一判定入口

新增 `navDockBarClickAllowed(bar, trigger, zeroClick, barBuckets)`，
`navDockHasPendingTrigger` / `navDockEarliestRetryAt` / 初次收割循环 /
`hasUndecided` / `missedBars` **五处共用**（此前五处各写一遍同样的条件，
漏掉任一处即失守 —— 免点击版就曾在 `hasUndecided` 上踩过同一个坑）。

新增第 4 个条件：**锚点全被剔除（kept=0）且触发器无可访问名 ⇒ 不点**。
点开这类栏只能拿到语境菜单（picker / kebab）的链接，不是导航项。

### B. 面包屑/上下文档排除

`isDockEligibleBar` 增加 `NAV_DOCK_CONTEXT_BAR_LABEL_RE =
/breadcrumb|面包屑|当前位置/i`：面包屑/上下文档既不索引也不点击。
与既有 `Global` / `Footer` 排除同源，同一函数被索引与五处闸门共用。

### C. 保留的兜底活路（不因噎废食）

以下两类仍允许点击，避免真实需求被误杀：

* 栏内**一个锚点都没有**（结构未知、菜单全靠 JS 注入，如登录态头部
  `react-partial`）；
* 触发器**有可访问名**（`More` / `More items` / `Toggle navigation`）。

`tools/verify-partial-header-flow.js` 的假头部（触发器文本 `More`）走这条分支，
行为不变。

### D. 诊断增强

1. `collectRepoHomeNavItems` 的 `statsOut` 新增 `barBuckets`
   （`Map<Element, {total,kept,hidden,ariaHidden,outside,moreLabel,breadcrumb,
   prerendered,sampleRejected}>`），逐条记录锚点被哪条规则剔除。
   **按栏元素键**而非字符串键：元素身份在一轮内稳定，免疫 React 对
   `className` / `aria-label` 的改写（字符串键会因此查不到而把该栏误判成
   zeroClick=0，闸门随之误放）。
2. 每次真正决定点击时打印一行 `console.info` 决策日志（栏名、key、分桶明细、
   触发器名，以及被剔除锚点的 outerHTML 样本）。
3. `recordClick` 日志追加 `clicks=`（本轮真实点击次数）与 `menu=`（菜单容器），
   措辞由 `harvest click #N` 改为 `harvest #N`。

下一次若再出现多余点击，一行日志即可自证"哪一栏、为什么放行、到底点没点"，
不必再逐字比对历史存档。

## 验证

### 红绿对照（决定性）

`tools/smoke-load.js` 新增场景 3c：面包屑栏（两个相对路径锚点 + 无名图标按钮）
+ 点击后挂出 picker 菜单。同一套断言喂给两个版本：

| 断言 | 修复前（快照 a93d092 源码） | 修复后（v2026.10.20） |
| --- | --- | --- |
| 无名图标触发器一次都未被点击 | **FAIL** — clicked 1 time(s) | PASS — clicks=0 |
| picker 链接未进入面板 | **FAIL** — Picker Repository / Picker Branches 泄漏 | PASS |
| 仓库标签栏取数不受影响 | **FAIL** — 9 项（混入 2 个垃圾项） | PASS — 7 项 |

红测复现了用户看到的症状（点 1 次 + 垃圾项入面板），证明该用例真正覆盖根因。

> 复现红测：
> ```bash
> git show a93d092:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-breadcrumb-fix.js
> MGGA_SCRIPT=.workbuddy/probe/prev-before-breadcrumb-fix.js node tools/smoke-load.js
> ```
> 为此 `smoke-load.js` 支持 `MGGA_SCRIPT` 环境变量覆盖被测脚本路径。

### 其他

| 项目 | 结果 |
| --- | --- |
| `node --check Make-GitHub-Great-Again.js` | PASS |
| `node tools/smoke-load.js` | **41/41 PASS**（原 38 + 场景 3c 三项） |
| `node tools/verify-harvest-sim.js` | **10/10 PASS**（原 8 + 2 项诊断出参断言） |
| 真实页面探针 `.workbuddy/probe/diag-zero-click.js` | 注入的面包屑栏 `eligible=false`；旧版仓库标签栏 `zeroClick=23` 仍被闸门拦住 |

另外修正了场景 3b 的一个**假绿**：jsdom 无布局，`harvestMoreItems` 对零尺寸
触发器会早退（`skipped=trigger-zero-size`），不打桩的话 `clicks=0` 是零尺寸
凑出来的、验不到闸门本身。3b/3c 都给触发器补了尺寸桩。

## 回滚

* 快照：`a93d092`（本修复前）→ `git reset --hard a93d092`
* 上一个功能快照：`8772c63`（免点击改造前）

## 未验证 / 后续

* **登录态真机**：本地无法登录 github.com，headless Chrome 直连超时，
  `--proxy-server` 亦无效（只有 curl 通），因此登录态结构与修复效果只能在
  用户侧确认。请重启扩展后确认：
  1. 控制台不再出现 `bar="Breadcrumbs"` 的 click decision 行；
  2. `harvest #N` 行若出现，`clicks=` 字段能说明是否真的点过；
  3. 面板不含 `Picker *` 类条目。
* 若登录态仍出现多余点击，新的决策日志会直接给出栏名与分桶明细，
  据此可精确判断是"未知结构需要放行"还是"又一条语境栏需要排除"。
