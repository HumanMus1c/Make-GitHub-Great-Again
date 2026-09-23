# MGGA 工作日志

## 2026-09-22 侧栏来源接入 dock + `?tab=` 残留修复（v2026.10.24）

快照/回滚点：`6094098`。提交：`f523361`（主脚本 + 冒烟）、`3469fd9`（真机工具）、
`c79c71d`（文档）。

### 用户确认的三条需求

1. 侧栏**每个区块只出一条主链接**（不是把区块内的子链接都铺开）；
2. 面板位置放在**文件区 tab 之后**，带分割线 + "侧栏"标题；
3. 顺手修掉"在 License 视图下点 Code，正文还停在 License"（即 `?tab=` 残留）。

### 实现要点（主脚本）

- 新增 `repoHomeSidebarGrid()` / `repoHomeSidebarHeadingLabel(h2)` /
  `repoHomeSidebarSectionEntries()`：读 PaneWrapper 内的 `[class*="borderGrid"]`。
  选择器**只用 `[class*=]` 前缀与 `data-component`**，不用带构建哈希的模块类名。
- 主链接三级兜底：`h2 a[href]` → `section a[href^="/sponsors/"]`（**尾斜杠必带**，
  否则页脚"了解更多"的 `/sponsors` 会被误收）→ `section a[href*="/search?l="]`；
  三级全落空 = `About` ⇒ **按设计跳过**，不伪造锚点。两条硬过滤：`#` 开头的
  React 路由键丢弃、非同源（仓库官网 / ko-fi / liberapay）丢弃。
- 标签取标题链接纯文本，计数取 `[data-component='CounterLabel']` 存进
  `item.counterText`；徽章在标题链接**之外**（兄弟节点），`cloneNode` 带不出来 ⇒
  新增 `appendNavDockCounterText()` 补 `.Counter` 胶囊（克隆路径与回退路径都调）。
- `barKey="repo-sidebar"` ⇒ 与仓库 tab 之间自然形成分割线；`i18n` 新增
  `navDockSidebar`（侧栏 / Sidebar）；图标取 `@primer/octicons` 官方 16px 路径
  （release→tag、contributor→people、language→globe、sponsor→heart）。
- **签名必须补侧栏**（`navDockCheapSignature`）：侧栏不属于任何 `<nav>`，而签名只比
  navBars；SSR 阶段侧栏是骨架（锚点数 0），注水后条目才出现 ⇒ 不补签名会被早短路
  卡死，侧栏条目**永远补不进来**。
- `NAV_DOCK_STRUCT_VER` 14 → 15。

### `?tab=` 例外：谁在做导航（重要，别重复踩）

`handleNavDockItemClick` 路径 4 加例外：`navDockHasFileTabParam()`（`/-ov-file$/`）
为真时**不接管**（`via=same-page-cleartab`），放行这次点击让真实导航走完。

真机点击取证（`MGGA_DIAG=1`）三条观测：

1. 面板 Code 锚点确实被真实鼠标点中（`inPanel=true`、`trusted=true`）；
2. **我们没 `preventDefault`，记录里 `defaultPrevented` 却是 true** ⇒ 页面侧另有一层
   文档级拦截器接住了它；
3. 随后一条**页面锚点**被合成点击，URL 一步直达规范路径、`docId` 不变
   （`["/iina/iina?tab=License-1-ov-file","/iina/iina"]`，`hardNav=false`）。

⇒ 导航**由页面完成**（软导航），我们唯一正确的动作是**别跟它抢**。
**但"是哪一层接的"没定位到**：我推断"React Router 靠 `data-discover` 认领克隆锚点"，
为此加了两个观测点，实测**推翻** —— 面板锚点
`{"raw":"/iina/iina","hasTab":false,"dataDiscover":null,"hasReactKey":false}`。

### 试过又被回退的一版（死代码）

曾改成 `preventDefault` + 把导航**委派给 `item.source`**（复用路径 3 的 `canDelegate`）。
真机实测 `canDelegate` **恒为 false**（面板条目的 `item.source` 不带 `__react*` 自有键）
⇒ 该分支从未执行（真机日志里只有 `same-page-cleartab`），既无收益又多带一次合成导航，
且那一版出现过一次 `Execution context was destroyed`（整页导航）。已全部回退。

教训：当初那条 jsdom 场景是**为了迁就实现而手工造条件**（手盖 `__reactFiber$`）才变绿
—— 先写测试、但别让测试跟着实现跑。

### 验证

- `tools/smoke-load.js`：55 → **62/62 PASS**（3i 侧栏来源 5 项、3j 骨架→注水重建、
  3k `?tab=` 例外）。红绿对照：旧版（`6094098`）**56/62，6 项 FAIL**
  （1 项 `?tab=` + 5 项侧栏）。
- `tools/verify-live-navdock.js`：22 → **28 项，四组组合（iina/vscode × 桌面/移动）全绿**。
- `?tab=` 例外的**下游效果（参数是否真被清掉）是页面侧行为**：17 次真机观测 10 次成功
  （移动 8/11、桌面 2/6）。因此断言只压**脚本自己的决策**，下游只作 INFO 观测。
  要 100% 可靠得能调 React Router 的 `navigate`，超出用户脚本可控范围。

### 工具侧新踩的坑

- **硬导航会把工具打死**：`Execution context was destroyed` ⇒ 以前 `EXIT=2` 整个挂掉。
  现在把点击后的测量包进 try/catch，把"上下文被销毁"记成证据（`INFO 6.0n`）并判 6.1 FAIL。
- **只看最终 URL 分不清因果**（"页面没出手" vs "导航了又被回滚"）⇒ 加 80ms
  **URL 采样序列**（`INFO 6.0s`）。
- 新增 `MGGA_DIAG=1` 点击取证通道（默认关闭）：在 `window` 冒泡阶段记录每次点击的
  目标 / 锚点 href / 是否在面板内 / **最终 `defaultPrevented`** / 是否可信事件 / 所属 nav，
  并对点击坐标做 `elementFromPoint`。
