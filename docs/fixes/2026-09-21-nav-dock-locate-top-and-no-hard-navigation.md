# 修复记录：dock 概览条目定位不置顶 + 点 LICENSE 整页重载

- 日期：2026-09-21
- 版本：`2026.10.21` → `2026.10.22`
- 快照检查点：`b1b204a`（修复前，可 `git reset --hard b1b204a` 精确回滚）
- 提交：见本轮 commit

## 一、用户反馈

> 点击导航的 LICENSE 会导致页面跳转至 `https://github.com/iina/iina/blob/develop/LICENSE`，
> 并且 Repositories 的三个导航每次定位都会发生下移而不是置顶。

两句分别指向两个**独立**缺陷：一个是导航行为（整页重载），一个是滚动落点（没置顶）。

## 二、缺陷 A：点 LICENSE 触发整页重载

### 根因

上一版（v2026.10.21）的分诊里有这么一段"兜底"：

```js
const fallback = () => {
  if (location.href !== hrefAtClick) return;
  const dest = item.href || "";
  if (!dest || dest === location.pathname) return;
  location.assign(dest);          // ← 这就是整页重载
};
```

`handleNavDockItemClick` 在"页内目标未渲染"时一律 `preventDefault()` + 等 1500ms
目标出现，等不到就 `location.assign(item.href)`。而 `item.href` 对文件区主题 tab 是
由 `resolveFileAreaTabHref` **解析出来的真实路径** —— iina 仓库的 License tab
命中"证据 1（页面已有指向 `/blob/.../{license,license.md,…}` 的锚点）"，即左侧文件区
那条 `/iina/iina/blob/develop/LICENSE`。于是：

- 面板 href = `/iina/iina/blob/develop/LICENSE`
- 点击 → 拦截 → 交还原锚点（React 软路由，无 URL 变化）→ 等不到 `#License-1-ov-file`
  （见缺陷 B 取证：该 id 在 SSR 里**不存在**）→ 1500ms 后 `location.assign`
  → **整页文档重载**，用户看到的正是那个 URL。

`location.assign` 是**绕过 Turbo 的文档级导航**，它既不是 GitHub 的客户端路由，
也不是 Turbo 的软访问 —— 等于把 SPA 上下文整个丢掉。

### 修复

1. **删掉 `location.assign` 兜底**，改为三级策略：
   - 页内目标已在 DOM → 接管 + 立即定位（不导航）；
   - 源锚点是 `href="#"` 占位 tab → 接管 + 交还 React 原锚点（原生客户端路由 = AJAX）；
     仅当 React **未接管**（尚未注水，没人接得住这次点击）才回放一次面板锚点自身
     （带真实 href，交给 Turbo 软导航）。React 已接管却还在等路由数据时不回放，
     避免与其撞车形成双重导航；
   - 其余（真实 URL 的社区文件链接）→ **不接管**，面板锚点自身的 href 由 Turbo
     全局拦截器处理，比我们替换更保真。
2. **静态回归闸**：`tools/smoke-load.js` 断言 `handleNavDockItemClick` 函数体内
   不得出现 `location.assign(` / `location.replace(` —— 同类"整页重载"改法再也进不来。

### 真实页面取证（`.workbuddy/probe/diag-locate.js`，三仓库一致）

```
--- 左侧文件区社区文件链接（禁止整页重载的修复对象）---
  "LICENSE, (File)"  href=/iina/iina/blob/develop/LICENSE
      命中文件区白名单=false  分诊=pass-through（不接管，交还 Turbo 软导航）
```

## 三、缺陷 B：三个导航定位后"下移"而非"置顶"

### 根因

`navDockScrollToTarget` 用的是 `el.scrollIntoView({block:"start"})`。它的语义是
**逐级滚动每一层可滚动祖先**，而各层偏移量按**同一份初始几何**一次性算完：

1. 新版仓库页里内容区自己就是滚动容器（`#repos-split-pane-content` 带
   `tabindex="0"`，`data-selector` 同名 —— 典型的"键盘可滚区域"标记）；
2. 于是存在"内层容器 + 窗口"两层（还可能叠加粘性子导航）；
3. 内层按初始 rect 滚 Δ1，窗口又按**同一份初始 rect**滚 Δ2，两层结果互相抵消
   —— 目标既不在容器顶、也不在视口顶，而是停在中间偏下，即用户说的"下移"。

另外两点放大问题：`behavior:"auto"` 会跟随站点 CSS 的 `scroll-behavior: smooth`，
动画中途被别的滚动打断就停在半路；定位完成后没有"锚定"，注水、焦点还原、粘性重排
都能把刚定位好的滚动再挪走。

### 修复

把 `scrollIntoView` 换成**显式分层计算 + 有界重定位**：

| 环节 | 做法 |
|---|---|
| 内层容器 | `navDockScrollableAncestors()` 从目标向上找 `overflow-y: auto/scroll/overlay` 且 `scrollHeight > clientHeight` 的祖先，逐个 `scrollTop += (目标rect.top - 容器rect.top - 容器内让位)` |
| 容器内让位 | `navDockStickyOffsetWithin()` 只扣"当前已贴在该容器顶部"的粘性子导航（文件区 tabs），未贴顶或位于目标下方的不扣 |
| 窗口对齐 | `navDockTargetScrollTop()` 统一算 `rect.top + scrollY - 顶栏让位`，并夹在可滚范围内 |
| 顶栏让位 | `navDockStickyTopOffset()` 实测 `position: fixed/sticky` 且贴顶的顶栏高度，与站点自身 `scroll-padding-top` 取大者 |
| 瞬时性 | `navDockSetWindowScrollTop()` 显式 `behavior:"instant"`（`"auto"` 会被 CSS smooth 吃掉），并在 `scrollTo` 被覆写时用 `scrollTop` 兜底 |
| 锚定 | `navDockStartLocateReassert()` 定位后 ~1.2s 内有界重定位；探测到用户自己在滚（轮子/触摸/按键，capture+passive）立即收手，绝不抢滚动条 |
| 与收割回弹的关系 | 抑制窗口从 1200ms 放宽到 2000ms（覆盖重定位窗口），避免解锁回弹把定位拉回 snapY |

### 日志可判读

`locate` 行补上实测值，下次真机复现不必再猜：

```
[MGGA] nav dock: locate "License" via=in-page top=2436 y=2436 off=64 elTop=64 inner=1 href="…"
[MGGA] nav dock: locate re-asserted 3x (top=2436 y=1800 off=64) — 定位后被别的滚动挪走过
```

`via` 取值为 `in-page` / `delegate-ajax` / `await-render` / `pass-through`；
若出现第二行 `re-asserted`，说明确有别的滚动源在赛后抢滚动条，日志里能直接看到。

## 四、验证

| 项 | 结果 |
|---|---|
| `node --check` | PASS（纯用户脚本，无 release/debug 构建配置，用语法 + 逻辑 + diff 三层验证替代双构建） |
| `tools/smoke-load.js` | **50/50 PASS**（新增场景 3e 三层滚动置顶 + 3f 禁止整页重载 + 静态回归闸） |
| 红绿对照 | 同一套断言喂给修复前版本（快照 `b1b204a`，`.workbuddy/probe/prev-before-locate-top-fix.js`）⇒ **6 项 FAIL**，逐条对应本次两类缺陷 |
| `tools/verify-harvest-sim.js` | **10/10 PASS**（顺带补上仿真沙箱缺失的 `navDockScrollRebounceSuppressUntil` 声明） |
| 真实页面探针 | iina / vscode / kubernetes：三个 tab 分诊分别为 in-page（README）与 delegate-ajax（其余）；左侧文件区链接一律 pass-through ✅ |

红测失败项与缺陷的对应关系：

```
FAIL 概览条目：README 点击就地定位到正文并置顶      located wrong target: scrollTo top = undefined
FAIL 概览条目：目标 id 已渲染时认领 GitHub 自己的锚点  located wrong target: scrollTo top = undefined
FAIL 置顶修复：三层滚动下正文精确停在顶栏下沿          pane.scrollTop = 0
FAIL 置顶修复：定位后不被二次滚动挪走（下移回归闸）      window drifted to 0
FAIL 禁止整页重载：真实 URL 的 LICENSE 条目不接管      click was intercepted
FAIL 禁止整页重载：函数体内无 location.assign/replace   整页重载回归: location.assign(
```

前两条 + 中间两条 = 缺陷 B（旧版根本不滚内层容器、也没有窗口精确对齐）；
后两条 = 缺陷 A。

## 五、未验证与后续

- **真机未验证**（本机网络到 github.com 不通：`curl` SSL error 35 / node fetch failed），
  只对已保存的真实 SSR 做了端到端验证。
- 真机复现时的判读方法：点一次 License 看控制台那行 `locate` 的 `via=` 是什么；
  若仍是"下移"，看是否出现 `re-asserted` 行 —— 那说明还有第三方滚动源。
- 定位动画是**瞬时**（对应"立即"）；要平滑只改 `navDockSetWindowScrollTop` 一处。
- 回滚点：`b1b204a`。
