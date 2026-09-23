# 2026-09-23 · 标题栏统一（导航面板 ↔ Release 设置面板）+ 版本号 2026.9.23

> **追加修正（同日，未改版本号）**：本篇只把两处 `.header` 元素本身修到 29.8px，但**标题栏
> 上方那段空隙没修** —— 设置对话框自身的 `padding: 1.25em` 让"面板顶边 → 分割线"仍是
> 49.3px（导航栏 37.8px），用户因此反馈"仍然不一致、没有垂直居中"。
> 续篇见 [`2026-09-23-titlebar-band-unified.md`](./2026-09-23-titlebar-band-unified.md)
>（回滚点 `snapshot-titlebar-vcenter-20260923` / commit `b5e4689`）。
> **教训：面板类 UI 的"高度"要连父容器的 border + padding 一起量。**

- **版本**：v2026.9.23（`@version` 由 `2026.10.30` 改为 `2026.9.23`）
- **快照（回滚点）**：tag `snapshot-titlebar-unified-20260923` → commit
  `32dd2cb4ae912930382bba9eb3086e5cc5fac2a4`
  （`git reset --hard 32dd2cb` 可精确回退到改动前）
- **需求原话**：「将导航栏和 release 页的设置面板的标题栏统一一下，将高度改为导航栏的
  标准，标题文本自适应缩小，在导航栏的标题栏基础上再补上 Release 页设置面板的
  Github SVG icon 图标。」

需求拆成三条可观测的判据：

| # | 需求 | 判据 |
| --- | --- | --- |
| ① | 高度改为**导航栏的标准** | 两处标题栏真实渲染高度一致（改前 29.8px vs **52.09px**，差 22.29px）|
| ② | 标题文本**自适应缩小** | 标题栏变窄时标题字号下降、且不出现省略号截断；图标同步缩 |
| ③ | 导航栏标题栏**补上 GitHub 印记** | 导航面板标题里出现与设置面板同源的 16px 印记 |

## 一、两处标题栏改前差在哪（真机实测，不是猜的）

真机（本地 Chrome，iina/iina，`1280×900`）：

| | 导航面板 `.mgga-nav-dock-header` | 设置面板 `.color-picker-header` |
| --- | --- | --- |
| 实测高度 | **29.8px** | **52.09px** |
| padding | `2px 4px 6px 4px` | `0px 0px 7px 0px` |
| margin-bottom | `2px` | `14px` |
| 标题字号 / 字重 | 13px / 600 | 17.5px / **700**（`1.25em` + `bold`）|
| 标题颜色 | muted `rgb(89,99,110)` | default `rgb(36,41,47)` |
| 关闭按钮 | 14px / `line-height:1.2` / `padding:2px 6px` | **`1.5em` + `padding:.3em .6em`（≈43px 高）** |

**高度差的真正来源不是 padding，而是最"高"的那个子项**：标题栏高度 =
`max(子项高) + 上下 padding + 下边框`。设置面板的关闭按钮是 `1.5em`（24px）+ `.3em`
上下 padding ⇒ ≈43px，比标题文本高出一大截，于是标题栏被它顶到 52.09px。
**只拉平 padding、放着关闭按钮不管，真机上仍然差 23px。**

## 二、修复

### 2.1 统一到导航栏那套标准（两处逐项对齐）

| 项 | 标准值 | 说明 |
| --- | --- | --- |
| `padding` | `2px 4px 6px` | 导航栏原值，作为"高度标准"的定义处 |
| `margin-bottom` | `2px` | 取代设置面板原来的 `1em` |
| `border-bottom` | `1px solid` | 设置面板原为 `#d8dee4`/`#21262d`（媒体查询），上提到基座规则 |
| 标题字号 | `13px` 兜底 + `clamp(11px, 6.5cqi, 13px)` | 见 §2.2 |
| 标题字重 | `600` | 取代设置面板原来的 `bold`(700) |
| 标题颜色 | muted | 导航栏 `--fgColor-muted`；设置面板同色 `#57606a`/`#8b949e` |
| 关闭按钮 | `14px` / `line-height:1.2` / `padding:2px 6px` | **标题栏高度的实际决定项** |
| 图标 | `1.1em` 内联 + `vertical-align:-0.15em` | 两处同一份 |

> **颜色为什么不用同一个来源**：导航面板的配色跟随 **GitHub 主题变量**
> （`--fgColor-muted` 等），而设置对话框的配色走 **`prefers-color-scheme` 媒体查询**
> （老一套，与 GitHub 自己的主题设置无关）。两套机制混用会出现
> 「浅色对话框 + 深色变量」的错配，所以设置面板按其自身机制取同一档 muted 色
> （`#57606a` / `#8b949e`，与它自己的关闭按钮同色），视觉上一致但不互相打脸。
> 下边框同理：设置面板用**主题无关**的中性灰 `rgba(125,125,125,.25)`，
> 正好等于导航栏那条 `var(--borderColor-muted, …, rgba(125,125,125,.25))` 的兜底值。

### 2.2 自适应缩小：容器查询 + `clamp`，不靠 JS 量文本

```css
/* 标题栏成为尺寸容器（1cqi = 标题栏内容宽的 1%）*/
.mgga-nav-dock-header, .color-picker-header { container-type: inline-size; }

.color-picker-title, .mgga-nav-dock-header-title {
  font-size: 13px;                       /* 兜底：不认 cqi 的浏览器按 13px 静态渲染 */
  font-size: clamp(11px, 6.5cqi, 13px);  /* 内容宽 ≥200px 封顶 13px，再窄才缩，11px 下限 */
}
```

- **为什么不上 JS 量文本**：`scrollWidth` 逐档试探要挂 resize/重建钩子，还要处理
  面板重建、字体加载、主题切换三种重排时机；纯 CSS 版本零钩子、零状态。
- **为什么是 `6.5cqi` 而不是更小的系数**：系数决定"什么时候开始缩"。`6.5%` 让
  **内容宽 ≥200px 时都停在 13px**（两处标题栏正好都在这条线以上 ⇒ 常态下**真统一**），
  只有挤到 200px 以下才逐档下降 —— 那正是"放不下"的时候。
- **兜底必须写在 `clamp` 之前**：`cqi` 在旧浏览器里是非法单位，整条声明会被丢弃，
  这时前一条 `font-size: 13px` 才是最终值。写反了就没有兜底。
- **图标宽高用 `em`**（`width="1.1em"`）⇒ 标题缩了图标跟着缩，不会出现
  「字变小了、图标还杵着原来的大小」。真机实测：14.16px → 12.7px。
- 省略号兜底保留（`overflow:hidden; text-overflow:ellipsis; white-space:nowrap` +
  `min-width:0`）：缩到 11px 仍放不下时退到截断，**绝不把关闭按钮挤出去**。

### 2.3 GitHub 印记收敛为单一来源

同一枚 16px octicon 原先在设置面板里**内联了两份**（`buildSettingsDialogHTML` 初始模板
+ `updateDialogColors` 重绘），本次导航栏又要接同一枚 —— 三处各存一份必然改漏。收敛为：

```js
const GITHUB_MARK_PATH = "M8 0c4.42 …8-8Z";
function githubMarkSvg(em) { /* 返回 <svg viewBox="0 0 16 16" …><path d=GITHUB_MARK_PATH/></svg> */ }
```

三处调用：设置面板初始模板 / 设置面板重绘 / 导航面板标题栏。

导航面板用 `title.insertAdjacentHTML("afterbegin", …)` 插在文字**之前**，
所以 `title.textContent` 仍是纯 `"MGGA"` —— 静态闸门（`NAV_DOCK_BRAND`）与
无障碍名都不受影响。印记补了 `aria-hidden="true" focusable="false"`
（改前设置面板那枚没有，真机实测 `ariaHidden: null`），装饰性图标不进无障碍树。

## 三、真机实测（红绿对照）

探针：`.workbuddy/probe/diag-titlebar-live.js`（不入库；比 `tools/verify-live-navdock.js`
多了 GM_info 打桩与菜单命令捕获，才能在同一跑里量到设置面板）。

```bash
node .workbuddy/probe/diag-titlebar-live.js                                  # 改后
MGGA_SCRIPT=.workbuddy/probe/prev-before-titlebar.js node .workbuddy/probe/diag-titlebar-live.js  # 改前
```

### 3.1 高度：29.8px vs 52.09px → **29.8px vs 29.8px**

| 视口 | 导航面板（改前 → 改后）| 设置面板（改前 → 改后）|
| --- | --- | --- |
| 1280px | 29.8 → **29.8px** | **52.09 → 29.8px** |
| 320px | 29.8 → **29.8px** | 52.09 → **29.8px** |
| 200px | 29.8 → **29.8px** | 52.09 → **29.8px** |

两处高度逐字相同，且**三个视口下都不变**（高度标准由关闭按钮 + padding 决定，
与标题字号解耦 ⇒ 字号自适应不会把标题栏高度带跑）。

### 3.2 字号自适应：13px → 11.56px → 11px（下限）

导航面板：

| 视口 | 面板宽 | 标题栏宽 | 标题栏内容宽 | 标题字号 | 印记尺寸 | 标题溢出 |
| --- | --- | --- | --- | --- | --- | --- |
| 1280px | 220px | 206px | 198px | **12.87px** | 14.16px | 0px |
| 320px | 199.8px | 185.8px | 177.8px | **11.56px** | 12.7px | 0px |
| 200px | 160px | 146px | 138px | **11px（下限封顶）** | 12.09px | 0px |

设置面板：

| 视口 | 对话框宽 | 标题栏宽 | 标题字号 | 印记尺寸 | 标题溢出 |
| --- | --- | --- | --- | --- | --- |
| 1280px | 280px | 243px | **13px** | 14.3px | 0px |
| 320px | 280px | 243px | **13px** | 14.3px | 0px |
| 200px | 172px | 135px | **11px（下限封顶）** | 12.09px | 0px |

- 导航栏 1280px 的 12.87px 正是 `6.5% × 198px` —— 说明 `cqi` 参照的是**内容盒**，
  不是 padding 盒（标题栏盒宽 206px，内容宽 198px）。文案里的"内容宽 ≥200px 封顶"即由此而来。
- 设置面板在 1280/320px 下**都是 13px**：对话框宽度由 `min(20em, 100% - 2em)` 决定，
  320px 视口下仍有 243px 标题栏宽，余量充足 ⇒ **不该缩就不缩**（这正是选 `6.5cqi`
  而不是更小系数的目的）；到 200px 极窄视口才落到 11px 下限。两处的下限与上限完全对齐。
- 三个视口下**标题溢出量都是 0** ⇒ 没有任何一处退化成省略号。
- 改前导航栏标题字号在 320px 下**仍是 13px**（无容器查询、写死）⇒ 本条为有效红绿。

### 3.3 `container-type` 没有把面板宽度带跑（推断被实测排除）

加 `container-type: inline-size` 会给标题栏引入**尺寸包含**，而面板是
`width: fit-content` —— 理论上标题栏对面板宽度**不再有贡献**，有塌到 `min-width` 的风险。
实测两版面板宽**逐字相同**：

| 视口 | 改前面板宽 | 改后面板宽 |
| --- | --- | --- |
| 1280px | 220px | **220px** |
| 320px | 199.8px | **199.8px** |

即面板宽度始终由条目区（`.mgga-nav-dock-body` 的长标签）决定，与标题栏无关 ⇒ 无回退。

### 3.4 图标与版本号

| | 改前 | 改后 |
| --- | --- | --- |
| 导航面板印记 | `null`（没有）| `viewBox=0 0 16 16`、`aria-hidden=true`、`firstChild=true`、路径 571 字符 |
| 设置面板印记 | 19.25px、`aria-hidden=null` | 14.3px、`aria-hidden=true`、路径 571 字符（与导航栏同源）|
| 设置面板标题文本 | `MGGA v2026.10.30` | **`MGGA v2026.9.23`** |
| 导航面板角标 | `v2026.10.30` | **`v2026.9.23`** |

两处版本号都来自 `GM_info.script.version`（= `@version`）单一来源，
没有第二处硬编码 ⇒ 改版本号只需改脚本头一行。

## 四、验证

### 4.1 离线回归 `tools/smoke-load.js`：**76/76 PASS**

新增/改写的断言（源码级闸门，因为 jsdom 无排版层）：

| 断言 | 内容 |
| --- | --- |
| 导航面板标题栏（DOM）| 标题里有 `svg`、它是标题**首个子节点**、`viewBox=0 0 16 16`、`aria-hidden=true`，且 `path.d` 与源码里那份 `GITHUB_MARK_PATH` **逐字符相同**；标题文本仍是 `MGGA` |
| 版本号（DOM）| 导航面板角标 === `"v" + @version`；设置面板标题含 `"v" + @version`（在"打开设置面板"场景里断言，那时对话框还在 DOM 中）|
| 两处标题栏（源码闸门）| 两处标题栏都必须有 `padding: 2px 4px 6px` + `margin-bottom: 2px` + `border-bottom: 1px solid`；都必须 `container-type: inline-size`；标题都必须「`font-size: 13px` 兜底**在** `clamp(11px, *cqi, 13px)` 之前」+ `font-weight: 600` + `text-overflow: ellipsis`；两处关闭按钮都必须 `font-size: 14px` + `line-height: 1.2` + `padding: 2px 6px`；印记路径全仓只 1 份、调用点恰好 3 处 |

> 取规则体用的是 `lastIndexOf`：设置对话框的 `prefers-color-scheme` 覆盖块在前、
> 基座规则在后，同名选择器出现多次 —— 要锁的是最后那条基座规则。
> （第一版用 `indexOf` 取到媒体查询里那条只有 `color` 的规则，断言直接自伤。）

### 4.2 红绿对照（离线）

```bash
git show 32dd2cb:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-titlebar.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-titlebar.js node tools/smoke-load.js
```

⇒ **共 76 项，PASS 74，FAIL 2**，两条正是本次新增的判别器：

```
FAIL  导航面板标题栏：补上设置面板的 GitHub 印记，标题文本仍为 MGGA   标题栏缺少 GitHub 印记 svg（本次新增）
FAIL  两处标题栏：高度与字号标准成对一致 + 标题字号按标题栏宽度自适应缩小   设置面板标题栏缺高度标准「padding: 2px 4px 6px」
```

版本号那两条在红绿两侧都是 PASS —— 它们是**一致性不变量**（"两处都取自 `@version`"），
不是对 `2026.9.23` 这个字面量的硬编码（硬编码只会在下次改版本号时变成假绿）。
版本号确实变了这件事由 4.3 的真机输出与 diff 证明。

### 4.3 真机验证（做到了）

见 §三：高度 29.8/29.8、字号 12.87→11.56（导航栏）、印记同源、版本号 v2026.9.23，
且面板宽度无变化（尺寸包含无副作用）。

## 五、未验证项（如实记录）

- **Firefox / Safari 未实测**。`cqi` + `container-type` 需要 Chrome 105+ /
  Firefox 110+ / Safari 16+；更旧的浏览器按兜底 `13px` 静态渲染（不会更差，只是不自适应）。
- **设置面板 200px 视口的缩放下限已实测**（11px，见 §3.2）；但设置面板的
  `@media (prefers-color-scheme: dark)` 覆盖块里那条标题颜色
  （`#8b949e`）**未在深色系统主题下实测**（本次真机跑的是浅色）。
- **hover 态未实测**：设置面板关闭按钮的 `transform: scale(1.1)` 保留、
  导航栏关闭按钮的 hover 背景色未改 —— 两者 hover 观感仍有差异（本次只统一静态尺寸）。
- **关闭字形未统一**：设置面板是 `&times;`(U+00D7)，导航栏是 `✕`(U+2715)。
  两者现在同字号同内边距，视觉差异极小，未动（要统一是 1 处字符改动）。
- **`@version` 改成 `2026.9.23` 有两个副作用，都是"按指令照做 + 如实标注"**：
  1. **方向是降版**（`2026.10.30` → `2026.9.23`）：Tampermonkey / GreasyFork 的自动更新
     按版本号比较，已装 `2026.10.30` 的用户**不会**收到这次更新（需手动重装或强制更新）。
  2. **这个号历史上用过**：`update_log.md` 第 1213 行已有 `v2026.9.23 [2026-09-18]`
     （该号的语义不是日期，而是"第二段累计到 31 就进位"的递增号：`…9.31 → 10.1 → … 10.30`）。
     所以日志里现在有两条同号条目，只能靠日期区分。
  若这不是本意，把 `@version` 改成 `2026.10.31` 之类的递增号即可 —— **其余改动都不依赖
  这个字面量**（两处标题栏都从 `GM_info.script.version` 取值，没有第二处硬编码）。

## 附：不受影响的关键行为（同一次真机跑的旁证）

- 仓库首页 → releases 页两次注入均正常，`GM_registerMenuCommand` 7 条命令齐备
  （含 `⚙️ 设置`），设置面板可打开。
- 导航面板条目区、滚动条、侧栏来源等既有断言在离线回归里全绿（73 → 76，
  既有 73 条一条没动）。

## 复现

```bash
# 离线回归（无需网络）
node tools/smoke-load.js                       # → 共 76 项，PASS 76，FAIL 0

# 离线红绿对照
git show 32dd2cb:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-titlebar.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-titlebar.js node tools/smoke-load.js
                                               # → 共 76 项，PASS 74，FAIL 2

# 真机几何（需要本机 Chrome；本机证书吊销检查失败，探针已内置 --ignore-certificate-errors）
node .workbuddy/probe/diag-titlebar-live.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-titlebar.js node .workbuddy/probe/diag-titlebar-live.js
```

## 回滚

```bash
git reset --hard 32dd2cb4ae912930382bba9eb3086e5cc5fac2a4   # 或 git reset --hard snapshot-titlebar-unified-20260923^{commit}
```
