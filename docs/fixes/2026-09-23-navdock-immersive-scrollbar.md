# 2026-09-23 · nav dock：沉浸式滚动条（干掉步进箭头 + 透明轨道 + 悬停显形）

- **版本**：v2026.10.28
- **快照（回滚点）**：`87ad71bb87a3435dee474135a8ac14b2b701b92f`
  （`git reset --hard 87ad71b` 可精确回退到改动前）
- **需求原话**：「有没有更沉浸的滚动条？我想导航栏的滚动条再沉浸一些，
  起码不再显示滚动条上下顶端底端的步进箭头」

## 一、箭头是从哪来的（先定性再动手）

面板 `#mgga-nav-dock` 自己有 `overflow-y: auto !important`（`max-height: calc(100dvh - 1em)`），
所以它**本身就是滚动容器**。改前样式表里「scrollbar」出现 **0 次** ⇒ 走的是浏览器默认滚动条。

在 Windows 的 Chrome/Edge 上，默认走的是 **经典滚动条（classic scrollbar）**，它不是一条线，
而是一个由多个 `::-webkit-scrollbar-*` 伪元素拼起来的控件：

| 伪元素 | 视觉 |
| --- | --- |
| `::-webkit-scrollbar-button` | 轨道**两端那两个带三角的按钮**（上/下、左/右各 1 组，共 4 个） |
| `::-webkit-scrollbar-track` / `-track-piece` | 轨道底色（浅灰长条） |
| `::-webkit-scrollbar-thumb` | 滑块 |
| `::-webkit-scrollbar-corner` | 横竖轨道交角的方块 |

⇒ 用户看到的"上下顶端的步进箭头"就是 `::-webkit-scrollbar-button`，
**不是内容、也不是我们的元素**，只能用 CSS 关掉，没有别的路（`overflow: overlay` 早已废弃）。

## 二、改动（全部落在 `injectNavDockStyle()`）

### 2.1 基座规则：加滚动接力隔离

```css
#mgga-nav-dock {
  …
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  /* 滚到面板两端时不再把滚动接力给整页（"沉浸"的关键一环） */
  overscroll-behavior: contain !important;
  …
}
```

面板滚到底之后继续滚，整页不再跟着动 —— 这是"沉浸"里体感最强的一条，
和设置对话框里的 `.color-picker-content` / `.custom-color-picker-panel` 保持一致
（它们本来就有 `overscroll-behavior: contain`）。

### 2.2 新增滚动条块（紧跟 `#mgga-nav-dock.mgga-visible` 之后）

```css
#mgga-nav-dock::-webkit-scrollbar { width: 8px; height: 8px; background: transparent; }

#mgga-nav-dock::-webkit-scrollbar-track,
#mgga-nav-dock::-webkit-scrollbar-track-piece { background: transparent; border: none; }

/* 步进箭头：显式 display:none + 归零尺寸，四组状态全列 */
#mgga-nav-dock::-webkit-scrollbar-button,
#mgga-nav-dock::-webkit-scrollbar-button:vertical:decrement,
#mgga-nav-dock::-webkit-scrollbar-button:vertical:increment,
#mgga-nav-dock::-webkit-scrollbar-button:horizontal:decrement,
#mgga-nav-dock::-webkit-scrollbar-button:horizontal:increment,
#mgga-nav-dock::-webkit-scrollbar-corner {
  display: none !important; width: 0 !important; height: 0 !important; background: transparent !important;
}

#mgga-nav-dock::-webkit-scrollbar-thumb {
  background-color: rgba(127, 127, 127, 0.28) !important;
  border: 2px solid transparent !important;      /* 配合 padding-box ⇒ 视觉厚度只有 4px */
  background-clip: padding-box !important;
  border-radius: 8px !important;
}

#mgga-nav-dock:hover::-webkit-scrollbar-thumb,
#mgga-nav-dock:focus-within::-webkit-scrollbar-thumb { background-color: rgba(127,127,127,0.5) !important; }

#mgga-nav-dock::-webkit-scrollbar-thumb:hover { background-color: rgba(127,127,127,0.72) !important; }
```

设计取舍三条：

1. **滑块没有做成"完全隐形、只悬停才出现"**。那样确实最沉浸，但面板高度
   `calc(100dvh - 1em)` 在长仓库页上经常溢出，看不出"下面还有内容"是可用性事故。
   折中：静止态给 `0.28` 的一抹淡灰（比默认浅得多、也不再有轨道底色与箭头），
   悬停 `0.5`、悬停滑块本体 `0.72`。三级递进足以表达"这里有滚动"。
2. **颜色用 `rgba(127,127,127,·)` 而非主题变量**。它是明暗主题两极的中点色，
   浅色/深色背景下都是同一份对比度，和本项目其它"必须两边都好看"的地方同一手法。
3. **只用 `::-webkit-scrollbar`，不加 `scrollbar-width`** —— 原因见下节，这是本次最大的坑。

### 2.3 Firefox 兜底

```css
@supports (-moz-appearance: none) {
  #mgga-nav-dock { scrollbar-width: thin !important; scrollbar-color: rgba(127,127,127,0.5) transparent !important; }
}
```

Gecko 从不给滚动条画箭头，所以"去箭头"在 Firefox 上天然成立；它缺的只是"细条"，
用标准属性补齐。`(-moz-appearance: none)` 这个探测在 Chromium 恒为 `false`，
块内属性不会污染上面的 webkit 规则。

## 三、踩坑记录（两条都是"无声失败"型）

### 3.1 `scrollbar-width` 与 `::-webkit-scrollbar` 互斥

Chromium 121+ 起支持标准属性 `scrollbar-width`。**一旦它在某元素上被设为非 `auto`
（如 `thin`），该元素上整组 `::-webkit-scrollbar*` 规则会被浏览器直接忽略** ——
`::-webkit-scrollbar-button { display :none }` 不生效、箭头原封不动回来，
而且**不报任何错、DevTools 里规则显示"有效"**。

所以最容易犯的错（"顺手补个 `scrollbar-width: thin` 兼容一下"）恰好会毁掉本次全部改动。
已在源码注释里写明原因，并加了源码级闸门断言（见 4.1）：
**基座规则体内不得出现 `scrollbar-width`**，标准属性只能待在 `@supports` 块里。

### 3.2 反引号会提前闭合模板字符串

样式表整体是 JS 模板字符串（`style.textContent = \`…\``）。注释里写了
`` `::-webkit-scrollbar-button` `` 这种带反引号的标识符 ⇒ 模板字符串**在此处提前闭合**
⇒ `node --check` 直接报 `SyntaxError: Unexpected token ':'`。

修法：注释里一律改用中文引号「…」。**这类错误 `node --check` 能拦住，所以每改必跑。**

## 四、验证

### 4.1 源码级回归闸（新增，`tools/smoke-load.js`）

```js
check("导航面板滚动条：无步进箭头 + scrollbar-width 不得混进基座规则", …)
```

| 断言 | 防的是什么 |
| --- | --- |
| `injectNavDockStyle` 体内 `::-webkit-scrollbar-button … { display:none !important }` 命中 | 箭头被"清理死代码"删掉 |
| **基座规则体**内 `scrollbar-width` 出现 0 次 | 3.1 的无声失效（箭头复活） |
| 基座规则体内仍有 `overflow-y: auto` | 面板不再可滚（会被误当成"没有滚动条"改回来） |
| 基座规则体内仍有 `overscroll-behavior: contain` | 滚动接力隔离被误删 |
| 存在 `@supports (-moz-appearance: none)` 且其后有 `scrollbar-width: thin` | Firefox 兜底被误删 |

闸门只取自 `function injectNavDockStyle(` 到 `function removeNavDock(` 之间的切片，
不会误伤页面别处的滚动条样式。

### 4.2 离线回归 `tools/smoke-load.js`：71 → **72/72 PASS**

### 4.3 红绿对照

```bash
git show 87ad71b:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-scrollbar.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-scrollbar.js node tools/smoke-load.js
```

⇒ **共 72 项，PASS 71，FAIL 1**，失败项恰为本次新增那条，其余 71 项不变：

```
FAIL  导航面板滚动条：无步进箭头 + scrollbar-width 不得混进基座规则
      滚动条按钮（步进箭头）未被 display:none 干掉
```

断言在检验本次改动，不是恒真。

### 4.4 未验证项（如实记录）

- **真机（真实 github.com + 真实 Chrome/Edge 经典滚动条）未跑，也跑不了**：
  本次的验收对象是 `::-webkit-scrollbar-button` 的**渲染**，
  而验收环境里唯一能自动截图的是 **headless Chrome**，headless 下 Chromium 用的是
  **overlay 滚动条**——它根本不渲染步进箭头，改了也看不出差别（改了和没改截图一样）。
  硬要自动化，只能走 CDP 读 `CSS.getComputedStyleForNode` 之类拿伪元素样式，
  成本远高于收益。⇒ 这一条**需要用户在自己的浏览器里目视确认**，
  观察点：面板右侧不再有上下两个带三角的按钮、轨道无浅灰底色、滑块变细且淡。
- **面板是否会真的溢出**取决于仓库页内容多少，内容不足时看不到滚动条 —— 属正常。
- **滑块静止态的透明度（0.28）是估的**，不是量出来的。若觉得还是太显眼，
  把该值调到 `0` 即变成"完全隐形、只在悬停时出现"（对应 2.1 提到的取舍）。

## 复现

```bash
# 离线回归（无需网络）
node tools/smoke-load.js                                   # → 共 72 项，PASS 72，FAIL 0

# 红绿对照
git show 87ad71b:Make-GitHub-Great-Again.js > .workbuddy/probe/prev-before-scrollbar.js
MGGA_SCRIPT=.workbuddy/probe/prev-before-scrollbar.js node tools/smoke-load.js
                                                           # → 共 72 项，PASS 71，FAIL 1
```

## 回滚

```bash
git reset --hard 87ad71bb87a3435dee474135a8ac14b2b701b92f
```
