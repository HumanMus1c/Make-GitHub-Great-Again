# 设置面板：关闭按钮改用导航栏那套 / 第一行间距 / 悬浮球 SVG·自适应·入场动画 / 移除蓝气泡

- **日期**：2026-09-23
- **版本**：v2026.9.23（**未改动版本号** —— 用户已明确要求后续改进不再变更版本号）
- **回滚点**：`snapshot-fab-and-close-20260923`（commit `16f8e69`）
  ⇒ `git reset --hard 16f8e69` 可精确回到本次改动之前
- **改动面**：`Make-GitHub-Great-Again.js`（CSS + 模板 + 两处悬浮球构建 + 删除徽标函数）
  + `tools/smoke-load.js`（6 条新闸门：3 条行为 + 3 条源码级）

## 1. 用户要求（原话）

> Release页的设置面板的标题栏的关闭按钮请使用仓库页的导航栏的关闭按钮样式；
> 标题栏和第一行 `body > div.color-picker-dialog.visible > div.color-picker-content > div:nth-child(1)`
> 设置项安全距离不正常。
> 并将设置面板的悬浮球的图标改为SVG，不再使用unicode，并且做到与导航栏悬浮球一样跟随屏幕分辨率
> 和比例自适应缩放尺寸，并保持同样大小。并增加共享的悬浮球弹出动画，页面刷新时触发，
> 动画要求要温和不剧烈。
> 导航栏的悬浮球的图标去除导航项数量蓝色气泡。

## 2. 真机取证（改前 → 改后，iina/iina，同一跑内两页对照）

新探针 `.workbuddy/probe/diag-fab-gap.js`（几何 + 动画挂钩）、
`.workbuddy/probe/diag-fab-pop.js`（只看动画）、
`.workbuddy/probe/diag-settings-audit.js`（面板体检）。原始数据 `fab-gap.json` / `fab-pop.json`。

| 指标 | 改前 | 改后 |
| --- | --- | --- |
| 关闭控件 | `<span>×</span>`（乘号 U+00D7） | `<button type="button">✕</button>`（叉号 U+2715） |
| 关闭控件盒子 | 21.58 × 20.8，`background` 透明（span 本来就透明） | 23.44 × 20.8，`background: rgba(0,0,0,0)` + `border: 0 none` + 字体继承 Mona Sans VF |
| 关闭控件 hover | `transform: scale(1.1)` 放大 | 只换底色 `rgba(125,125,125,.18)` |
| 分割线 → 第一行 | **2px** | **10.5px**（= 行间节奏 0.75em） |
| 内容区行间 gap | 10.5px | 10.5px（未动，作为第一行的对齐目标） |
| 内容区上内边距 | 0px | 8.5px = `calc(0.75em - 2px)` |
| 标题栏可视区 | 37.8px（`6px 内边距 + 1px 边框 + 29.8px`） | 37.8px **未变**（关闭控件高度 20.8 未变 ⇒ 标题栏高度不受影响） |
| 设置面板悬浮球 | 31.36 × 31.36，图标 = unicode `⚙️` | 39.42 × 39.42（1280×896）/ 47.52（1920×1080），图标 = SVG 16.16 / 19.47 |
| 导航悬浮球 | 44 × 44 写死，图标 SVG 18px | 39.42 / 47.52（与设置球**逐位相同**），图标 16.16 / 19.47 |
| 蓝色数量气泡 | 有（"15"） | 无（`children.length` 由 2 → 1） |
| 入场动画 | 无 | 两球各播一次：480ms，`0%{scale:.9,opacity:0} → 60%{scale:1.015,opacity:1} → 100%{scale:1}` |

动画证据（挂钩在 class 出现那一刻采样，`fab-pop.json`；**页面刷新后重跑仍是同一条曲线**）：

| 采样点 | 设置球 scale / opacity | 导航球 scale / opacity |
| --- | --- | --- |
| class + 0ms | 0.9 / 0 | 0.9 / 0 |
| 中途 | 0.988 / 0.767 | 0.981 / 0.706 |
| class + 700ms | `none` / 1（动画结束，class 已被摘掉） | `none` / 1 |

## 3. 根因与修法（逐条）

### 3.1 关闭按钮：不是"改 CSS"而是"换成同一种控件"

导航面板那个是 `<button>✕</button>` + `--fgColor-muted` 配色 + hover 换底；
设置面板这个是 `<span>×</span>` + hover `scale(1.1)`。**只把 CSS 抄过去是不够的**：
`<button>` 不继承页面字体、自带灰底与 2px 凹陷边框，所以除了尺寸四件套
（`14px` / `line-height 1.2` / `padding 2px 6px` / `radius 6px`），还必须补三条复位：
`background: transparent`、`border: none`、`font-family: inherit`。
真机上这四条一写，两处观感才一致（字体实测为 Mona Sans VF，即页面字体，而非系统按钮字体）。

**刻意不动**：`padding` 仍是 `2px 6px`。它是"两处标题栏共用标准"的一部分，
上一版刚把两处 `.header` 拉到 29.8px 等高，改它会连带把两个标题栏的高度拉开。

### 3.2 第一行间距：补在内容区，不补在标题栏

真机量到"分割线 → 第一行"= **2px**，而那 2px 是标题栏自己的 `margin-bottom`；
第一行 `.color-picker-row` 没有自身 padding（实测 `padding: 0px/0px`），
于是它紧贴分割线，而它下面各行之间都是 **10.5px（0.75em）** —— 第一行落单了。

```css
.color-picker-content {
  gap: 0.75em;
  padding: calc(0.75em - 2px) 0.35em 0;   /* 原来：padding: 0 0.35em */
}
```

为什么用 `calc(0.75em - 2px)` 而不是直接把标题栏的 `margin-bottom` 调大：
那个 margin 属于"两处标题栏共用标准"（smoke 里成对锁死），动它会让设置面板与导航面板
的标题栏标准分叉；间距是**内容区自己的节奏**，就该在内容区解决 —— 而且用 calc 表达
"补足差额"比写 8.5px 更抗改（谁动了那个 margin，这里自动跟着补）。

### 3.3 悬浮球：尺寸/图标同源 + 自适应

改前是两套完全独立的写法：导航球 `width/height: 44px` + `svg 18px`，
设置球 `width/height: 2.8em`（字号 `0.8em` ⇒ 31.36px）+ unicode `⚙️`。

```css
:root {
  --mgga-fab-size: clamp(38px, 4.4vmin, 56px);      /* vmin 同时吃宽高 ⇒ 分辨率/比例都跟 */
  --mgga-fab-icon: calc(var(--mgga-fab-size) * 0.41); /* 0.41 = 原来的 18/44 */
}
```

两处 `width/height` 一律写 `var(--mgga-fab-size)`，两处 `> svg` 一律写
`var(--mgga-fab-icon)`；再加 `box-sizing: border-box`（设置球是 `div`，
导航球是 `button` —— UA 对 button 默认 border-box，不写这句两球会差 2px 边框）。
真机复测两球逐位相同：1280×896 → 39.42、1920×1080 → 47.52。

图标：设置球改用 `gearIconSvg()`（octicon gear-16）。这枚齿轮路径原本只存在于
`buildNavDockFallbackIcon` 的 `ICON_PATHS.gear` 里，现在**上提为模块级常量
`FAB_GEAR_PATH`，`ICON_PATHS.gear` 改为引用它** —— 与 `GITHUB_MARK_PATH` 同一套
"路径只存一份"的做法（路径 2323 字符，出现次数已断言为 1）。

### 3.4 入场动画：为什么只敢动 `opacity` 和 `scale`

```css
@keyframes mgga-fab-pop {
  0%   { opacity: 0; scale: 0.9; }
  60%  { opacity: 1; scale: 1.015; }
  100% { opacity: 1; scale: 1; }
}
.mgga-fab-pop { animation: mgga-fab-pop 0.48s cubic-bezier(0.33, 1, 0.68, 1); }
```

- **绝不碰 `transform`**：导航球的垂直居中靠 `transform: translateY(-50%) !important`，
  而 `!important` 在层叠里**高于 CSS 动画**（动画只高于普通声明）⇒ 动画写 transform
  会被整条忽略，表现为"动画名生效、球纹丝不动"。
  `scale` 是独立的个体变换属性，与 `transform` 正交：缩放绕中心发生，
  `translateY(-50%)` 的居中不受影响（真机复测：动画期间球的 y 中心不变）。
- **不用 `both`/`forwards` 填充**：填充分式会让动画的终帧**永久接管** `opacity`，
  那样"面板打开时把球隐藏"的 `opacity: 0` 就再也压不回去了。
- 触发方式走 JS（`triggerFabPop`）而不是写进基座规则：只在"确实新建了一枚球"时挂 class、
  `animationend` 时摘掉；且**跳过隐藏态**（面板开着时新建的球带着 `hidden-to-right` /
  `mgga-dock-fab-hidden`，不播，免得先亮一下再淡出）。
- `@media (prefers-reduced-motion: reduce)` 一并关掉。

### 3.5 蓝色数量气泡：CSS 与 JS 一起删

`updateNavDockFabBadge` 函数 + 2 处调用 + `#mgga-nav-dock-toggle .mgga-nav-dock-badge`
整段样式。smoke 新增一条"源码里再不许出现这两个标识符"的闸门，防止只删一半。

**顺带修掉一个真 bug**：面板重建（SPA 导航/视口变化）时，旧实现只在油猴菜单与点击时
同步展开态 ⇒ 面板开着时重建，新的悬浮球**不会**带上隐藏类，会不该出现地冒出来。
现在重建后补一次 `setNavDockExpanded(navDockExpanded)`。

## 4. 验证

### 4.1 离线回归 `node tools/smoke-load.js`

- 修复后：**83 / 83 PASS**（新增 6 条：两处关闭控件成对 / 分割线→第一行间距 /
  两台悬浮球同源 + 动画 + 气泡移除 / 设置面板关闭控件行为 / 设置面板悬浮球 SVG 行为 /
  导航球气泡行为）
- 红绿对照（`MGGA_SCRIPT=.workbuddy/probe/prev-before-fab-close.js`，即 `16f8e69`）：
  **77 PASS / 6 FAIL** —— 6 条全是本次新增的判别器，既有 77 条一条没动。
  失败信息分别点出：`关闭控件应是 <button>…实际 SPAN`、`悬浮球里没有 svg`、
  `蓝色气泡还在`、`缺 background: transparent`、`内容区顶部内边距不是 calc(…) 形式`、
  `:root 里没有 --mgga-fab-size`。

### 4.2 真机（iina/iina）

见 §2 表格；原始数据 `.workbuddy/probe/fab-gap.json`、`fab-pop.json`、`settings-audit.json`。

## 5. 未验证

- **Firefox / Safari** 未测：`scale` 属性（Chrome 104+ / Firefox 72+ / Safari 14.1+）
  与 `:root` 变量断言都只在本机 Chrome 上跑过。若目标浏览器更老，`scale` 会整条失效
  —— 表现为"球直接出现、没有入场动画"，不会坏功能。
- **深色系统主题**未跑真机：关闭按钮 hover 底色用的是主题无关的中性灰
  `rgba(125,125,125,.18)`（导航面板的 `--color-neutral-muted` 兜底值也是它），
  理论上两主题都成立，但没实测。
- **动画观感**（"温和不剧烈"）是主观项：客观指标只有 480ms / 峰值 scale 1.015 /
  峰值不透明度 1，是否够温和要用户确认。
- **极窄视口**（≤320px）未复测：球体有 38px 下限，理论上不会小于原来的设置球（31.36px）。
- 悬浮球尺寸换算式（`4.4vmin`、38–56px 钳制）是按 1080p/1440p 定的，**2K/4K 全屏下
  会顶到 56px 上限**（2560×1440 实测已是 56px 钳制区），未在真实 4K 屏上肉眼确认是否偏大。

## 6. 判据沉淀

- **`!important` 高于 CSS 动画**：给带 `!important` 定位属性的元素加入场动画，
  必须改用 `scale`/`translate`/`rotate` 这类**个体变换属性**，否则动画静默失效。
- **jsdom / 事后快照都量不到动画**：动画在 `animationend` 后 class 就被摘了，
  事后 `getComputedStyle` 只会看到 `none` ⇒ 必须在**注入脚本之前**装 MutationObserver
  挂钩，并在 class 出现的那一刻采样 `getComputedStyle` 与 `getAnimations()`。
  挂钩本身还有坑：document-start 注入时 `document.documentElement` 可能是 `null`，
  挂 `document` 才稳（第一版探针就是这么静默失灵的：日志恒为空数组）。
- **"两处统一"类需求，先分清哪一层能改**：关闭按钮的"样式"可以统一，
  但它的 `padding` 同时是标题栏高度标准的一部分 ⇒ 只能改视觉、不能改尺寸；
  第一行间距看着像标题栏的事，实际要补在内容区（标题栏的 margin 是共用标准）。
- **一个 UI 缺陷往往伴随一个隐藏 bug**：这次动悬浮球，顺手暴露了"面板重建后
  新球不带隐藏类"。
