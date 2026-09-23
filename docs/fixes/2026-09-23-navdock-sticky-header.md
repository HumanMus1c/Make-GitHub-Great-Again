# 2026-09-23 · nav dock：标题栏钉住，不再随面板滚动被裁掉

- **版本**：v2026.10.29
- **快照（回滚点）**：`b261c00770a44f800d39e537583d764604a64a2b`
  （`git reset --hard b261c00` 可精确回退到改动前）
- **需求原话**：「导航栏的标题栏（#mgga-nav-dock > div.mgga-nav-dock-header）
  应该固定不参与滚动，不再因为滚动而导致导航栏的标题超出容器被截断隐藏。」

## 一、根因

面板 `#mgga-nav-dock` **自己就是滚动容器**（`overflow-y: auto !important` +
`max-height: calc(100dvh - 1em)`，见 `2026-09-23-navdock-immersive-scrollbar.md`），
而标题栏是面板的**第一个普通流子节点** —— 所以它跟所有条目一样参与滚动：
滚一段就被推出滚动口，被容器裁掉（连关闭按钮一起消失）。

面板高度锁在 `calc(100dvh - 1em)`，在长仓库页 / 小视口下必然溢出，
这个现象就是必然而非偶发。

## 二、修复：`position: sticky` + 三处配套

```css
#mgga-nav-dock .mgga-nav-dock-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 2 !important;
  background: var(--bgColor-default, var(--color-canvas-default, #ffffff)) !important;
  box-shadow: 0 2px 0 0 var(--bgColor-default, var(--color-canvas-default, #ffffff)) !important;
  /* 原有：display:flex / align / justify / padding / margin-bottom / border-bottom 不动 */
}
```

**sticky 一条不够**，下面三处缺一个都会露馅：

| 配套 | 缺了会怎样 |
| --- | --- |
| `background` 不透明 | 滚上来的条目从标题底下**透出来**，字叠字 |
| `z-index` | 条目/分割线是普通流元素，会被压到标题之上（显式压住更保险）|
| 同色 `box-shadow` 补边 | 标题下沿 `margin-bottom: 2px` 那道缝会漏出滚动内容 |

背景色**取与面板同色**（`var(--bgColor-default, …)`）是刻意的：标题在钉住时会被面板的
`border-radius: 12px` 圆角裁切，同色 ⇒ 裁切看不出来，不会出现"标题背景缺一个角"。
`box-shadow` 用的是同色 0 模糊值，它不是阴影、是背景的向下延伸（把 2px 缝填平）。

## 三、实测关键事实：钉在**内容盒顶边**，不是边框盒顶边

真机测量（`tools/verify-live-navdock.js` 场景 7.5，面板 `padding: 6px` + `border: 1px`）：

| | 标题相对面板顶边（静止） | 标题相对面板顶边（scrollTop=160） | 首条目 |
| --- | --- | --- | --- |
| 改后 | **7px** | **7px** | 39 → **-121px** |
| 改前 | 7px | **-153px** | 39 → -121px |

- 7px = `1px 边框 + 6px 面板内边距` ⇒ Chromium 把 sticky 钉在**内容盒顶边**，
  也就是说**面板的 6px 内边距被完整保留**，标题在"静止 → 滚动"之间是**零位移**
  （不是"先滑 6px 再钉住"）。
- 改前 `7 → -153px`：位移恰好 `-160px` = 滚动距离 ⇒ 标题完全跟着内容走，
  正是用户报的"超出容器被截断隐藏"。
- 首条目两版都是 `39 → -121px`（差 160 = scrollTop）⇒ 面板确实滚了，
  证明"标题没动"不是因为面板没滚动。

> **判据踩坑（记下来，下次别再犯）**：这条断言第一版写成 `deltaTop ≈ 0`
> （想当然认为会钉在面板顶边），实测拿到 7px ⇒ **误报 FAIL**。
> 正确判据是「**标题相对面板顶边前后一致**」，而不是钉到某个绝对值。
> 又一次印证：写推断时必须同时写下能证伪它的观测点。

## 四、验证

### 4.1 离线回归 `tools/smoke-load.js`：72 → **73/73 PASS**

| 断言 | 内容 |
| --- | --- |
| 新增（源码级闸门） | `.mgga-nav-dock-header` 规则体内必须有 `position: sticky`、`top: 0`、`z-index`、`background: var(--bgColor-default…)`、`box-shadow: 0 2px 0 0 var(--bgColor-default…)` 五条，缺任一即 FAIL |
| 新增（DOM 级） | 标题栏必须是 `panel.firstElementChild` —— 它才是被 sticky 钉住的那个，排首才能保证钉住的是标题（同时 `div:nth-child(N)` 的分割线编号也依赖这个位置）|

**为什么要用源码级闸门**：jsdom 没有排版层、也不实现 sticky 定位，
运行期根本验不了"钉住"这件事 —— 只能在源码上锁死那几条声明，
再由真机场景 7.5 验它们真的生效（见 4.3）。两者缺一不可。

### 4.2 红绿对照（离线）

```bash
git show b261c00:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-sticky-header.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-sticky-header.js node tools/smoke-load.js
```

⇒ **共 73 项，PASS 72，FAIL 1**，失败项恰为本次新增那条，其余 72 项不变：

```
FAIL  导航面板标题栏：sticky 钉住 + 不透明背景 + z-index（源码级闸门）
      标题栏不是 position:sticky ⇒ 会跟着内容滚出容器被裁掉
```

### 4.3 真机验证（本轮**做到了**，不是"推给用户"）

`tools/verify-live-navdock.js` 新增**场景 7.5**：用内联
`max-height: 220px !important` 把面板压到必然溢出（只改约束，不碰被测样式），
设置 `panel.scrollTop` 前后各测一次标题与首条目相对面板顶边的位置。

```bash
node tools/verify-live-navdock.js --json .workbuddy/probe/live-sticky-new.json
MGGA_SCRIPT=.workbuddy/probe/prev-before-sticky-header.js \
  node tools/verify-live-navdock.js --json .workbuddy/probe/live-sticky-prev.json
```

| 被测脚本 | 总结果 | 7.5 | position | 标题 7px → | 首条目 39px → |
| --- | --- | --- | --- | --- | --- |
| 改后 | **30/30 PASS** | PASS | `sticky` | **7px**（不动）| -121px |
| 改前 | 29/30（1 FAIL）| **FAIL** | `static` | **-153px** | -121px |

同一次运行里其余 29 条（外露探测、四个文件区 tab 吸顶、`?tab=` 清理、跨页软导航等）
**两版表现一致**，说明本次改动没有波及既有行为。

### 4.4 实拍对比（滚到底，面板压到 220px）

取证脚本 `.workbuddy/probe/shot-sticky.js`（真机注入 + 裁面板区域截图）：

```bash
node .workbuddy/probe/shot-sticky.js .workbuddy/probe/sticky-after.png
MGGA_SCRIPT=.workbuddy/probe/prev-before-sticky-header.js \
  node .workbuddy/probe/shot-sticky.js .workbuddy/probe/sticky-before.png
```

| 图 | position | scrollTop | 标题距面板顶边 |
| --- | --- | --- | --- |
| `sticky-after.png` | `sticky` | 326（到底）| **7px** —— 标题「MGGA / ✕」稳稳钉在顶上，`License` 从它下面滚过去 |
| `sticky-before.png` | `static` | 326（到底）| **-319px** —— 标题（连关闭按钮）整条滚出容器、被裁得**一点不剩**，面板顶边只剩半行被切掉的文字 |

也可以顺带在图上确认上一版的沉浸式滚动条：轨道完全透明、滑块只剩 4px 一道淡影，
两侧没有步进箭头。

### 4.5 未验证项（如实记录）

- 真机只跑了**默认浅色主题**。深色主题下 `var(--bgColor-default)` / `var(--color-canvas-default)`
  是否都命中 GitHub 的深色变量、以及标题背景与面板背景是否仍然一致（圆角裁切是否露馅），
  **未实测**。判据可加：`getComputedStyle(header).backgroundColor === getComputedStyle(panel).backgroundColor`。
- 面板**不溢出**时 sticky 无视觉作用（没有可滚内容），属正常，不是没生效。
- 面板顶部的 `6px` 内边距在钉住时被保留（实测 7px 位置）——这是 Chromium 的行为，
  **其它浏览器（Firefox / Safari）未实测**，理论上一致但没验。

## 复现

```bash
# 离线回归（无需网络）
node tools/smoke-load.js                       # → 共 73 项，PASS 73，FAIL 0

# 离线红绿对照
git show b261c00:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-sticky-header.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-sticky-header.js node tools/smoke-load.js
                                               # → 共 73 项，PASS 72，FAIL 1

# 真机（需要本机 Chrome；本机证书吊销检查失败，工具已内置 --ignore-certificate-errors）
node tools/verify-live-navdock.js --json .workbuddy/probe/live-sticky-new.json
MGGA_SCRIPT=.workbuddy/probe/prev-before-sticky-header.js \
  node tools/verify-live-navdock.js --json .workbuddy/probe/live-sticky-prev.json
```

## 回滚

```bash
git reset --hard b261c00770a44f800d39e537583d764604a64a2b
```
