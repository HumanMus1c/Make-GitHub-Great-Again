# 内置取色器切到 RGB / HSL 时面板右侧多出一倍空白 —— 根因诊断

- **日期**：2026-09-23
- **触发**：用户「取色器的色值类型切换到 RGB 和 HSL 时，取色器面板右侧会瞬间多出一倍空白区域，这是为什么？」
- **取证**：三支真机探针（原始数据在 `.workbuddy/probe/`）
  - `diag-picker-format-width.js` → `picker-format-width-before.json`（三种格式下的宽度分配）
  - `diag-picker-format-width-fix-test.js` → `picker-format-fix-test.json`（**介入实验**：两种候选修法各改一处看宽度是否塌回）
  - `diag-picker-input-cascade.js` → `picker-input-cascade.json`（四个输入框实际生效的级联规则）
- **状态**：本文是**诊断**。用户拍板「**只改容器宽度**」（上表方案 A），已落地 ——
  改动与验证见 `docs/fixes/2026-09-23-picker-width-max-content.md`（回滚点
  `git reset --hard c74b765`，tag `snapshot-picker-width-fix-20260923`）。

## 1. 现象量化

`iina/iina` Release 页，1280×896，点开第一颗颜色块（`.custom-color-picker-panel`）：

| 色值格式 | 面板 rect 宽 | 取色容器 rect 宽 | 「面板内容盒右缘 − 容器右缘」 |
| --- | --- | --- | --- |
| HEX | 281.17 | 250 | 6.78 |
| RGB | **605.67** | 250 | **331.28** |
| HSL | **605.67** | 250 | **331.28** |

同时，**三种格式下 `.builtin-input-group` 的实际布局逐字相同**（227.63px；
HEX 时是「按钮 + 单输入框 + ✕」，RGB/HSL 时是「按钮 + 三个数字框 + ✕」，
三个框各 47.63px 均分）。

⇒ 关键判据：**面板宽了 324.5px，内容一寸没动**。这不是"内容被挤开"，而是
"面板被撑大、右侧留白"。

## 2. 机制

两个声明叠在一起才出问题，缺一不可：

**① 面板宽度按内容收缩**（`.custom-color-picker-panel`）

```css
.custom-color-picker-panel {
    width: max-content;                                  /* ← 宽度由内容固有尺寸决定 */
    min-width: min(14em, calc(100vw - 1em));
    max-width: min(90vw, calc(100vw - 1em));
    padding: 0.8em;                                      /* 面板 font-size 实测 14px ⇒ 11.2px */
}
```

**② 容器宽度是"不定值"**（`.builtin-color-picker-container`）

```css
.builtin-color-picker-container { width: min(250px, 100%); box-sizing: border-box; }
```

`width: max-content` 的父元素在**固有尺寸计算那一遍**里，包含块宽度是**不定的**；
按 CSS 尺寸规则，此时百分比按 `auto` 处理 ⇒ `min(250px, 100%)` 那一支拿不出 250px，
容器只能贡献自己的**内容固有尺寸**。

**③ 三个数字输入框各自的固有尺寸 = 20 个字符**

`<input type="text">` 不带 `size` 时，浏览器按**默认 `size=20`** 给固有宽度
（探针实测：`sizeAttr = null`、`el.size = 20`）。RGB/HSL 模式一下多出**三个**这样的框，
每个约 165.5px 计入 max-content：

```
容器固有尺寸(RGB) ≈ 容器 padding/border(24.4) + 输入行
                   = 24.4 + 39.19(fmtBtn) + 5.6(gap) + 3×165.5 + 8.4(框间 gap) + 5.98…
实测 581.27 ⇒ 每个框贡献 165.5px，三个共 ≈ 496px 的"虚宽"。
```

**④ 面板定尺之后，真正排版那一遍把宽度算回正常，多出来的宽度就空着**

面板被定成 605.67px 后，容器里的 `100%` 变成确定值 ⇒ `min(250px, 581.27px)` = 250px，
容器回到 250；三个框的 `flex: 1 1 0%` + `min-width: 0` 也正常均分 47.63px。
但**面板的宽度不会因此重算** ⇒ 右侧 331.28px 永久空着。

数字闭合：面板内容盒 = 面板宽 − 0.8em×2(22.4) − 边框 2 = 605.67 − 24.4 = 581.27；
留白 = 581.27 − 250(容器) = **331.27**，与实测 331.28 对得上（HEX 档同式：
256.77 − 250 = 6.77，实测 6.78）。

**⑤ HEX 档其实也有同一个毛病，只是小到看不出来**

单个 HEX 输入框同样带默认 `size=20`（实测固有宽 ≈ 156px）⇒ 面板在 HEX 档
是 281.17 而不是理想的 274.4，右侧已经躺着 **6.78px** 的同类留白。
所以这不是"切格式才引入的 bug"，而是"三个框把原本 6.78px 的留白放大成 331px"。

## 3. 介入实验（决定性证据）

在真机页面上就地改一处、量一次、立刻还原（改的都是内联样式/属性，不动磁盘源码）：

| 实验 | 改动 | 面板宽 | 容器宽 | 右侧留白 |
| --- | --- | --- | --- | --- |
| 基准 HEX | — | 281.17 | 250 | 6.78 |
| 基准 RGB | — | 605.67 | 250 | 331.28 |
| E1 | `.builtin-color-picker-container` 内联 `width: 250px` | **274.38** | 250 | −0.01 |
| E2 | 三个数字框加 `size="3"` | **274.47** | 250 | 0.08 |
| E3 | **只**给第一个框加 `size="3"` | 486.67 | 250 | 212.28 |
| 还原 | — | 605.67 | 250 | 331.28 |
| E1@HEX | 容器内联 `width: 250px` | 274.38 | 250 | −0.01 |

E3 是"每个框各自贡献虚宽"的直接证据：修掉一个框 ⇒ 留白从 331.28 掉到 212.28（−119.0）；
三个全修 ⇒ 掉到 0.08。三种格式修完后**面板一律 274.38–274.47**，
即「容器 250 + 面板 0.8em×2 + 边框 2」的理论值 274.4。

## 4. 附带发现：`.builtin-color-value-input` 里四条声明是死声明

`picker-input-cascade.json` 里列出了**能匹配该元素的全部规则**（含特异性）：

```
spec(10)  .builtin-color-value-input          { flex: 1 1 0%; width: 0; min-width: 0;
                                                padding: 0.3em 0.2em; font-size: 0.85em;
                                                font-family: "Courier New", monospace; … }
spec(21)  .custom-color-picker-panel input[type="text"]
                                              { width: 100%; padding: 0.3em 0.4em;
                                                font-size: 0.9em; font-family: monospace; … }
```

后者特异性 (0,2,1) 高于前者 (0,1,0)、且在样式表中更靠后 ⇒ **整条拿下**。
实测计算值印证：数字框 `font-size` = 12.6px（= 0.9em × 14px，不是声明的 0.85em）、
`padding` = 3.78/5.04px（= 0.3em/0.4em，不是 0.2em）；在未渲染时读到
`width` 的计算值是 `100%`，而不是 `.builtin-color-value-input` 里写的 `0`。

同一件事也发生在 `.builtin-color-hex-input` 上（它声明的 `0.3em 0.5em` / `0.85em` /
`'Courier New'` 同样被盖掉）。⇒ 这四条在写的时候就没生效过：
**`width: 0` 从来没保护过这三个框**，这才是"固有宽度能漏进 max-content"的直接原因。

## 5. 修法选项（**A 已按用户拍板落地**）

| 方案 | 改法 | 结果（同一次探针的实测/推算） | 代价 |
| --- | --- | --- | --- |
| **A（已落地）** | `.builtin-color-picker-container`：`width: min(250px, 100%)` → `width: 250px; max-width: 100%` | 三种格式统一 **274.38**，容器保持 250；260px 窄视口下与改前**逐字相同**（244 / 219.63）⇒ 收缩行为未变 | HEX 档比改前窄 6.78px（就是把那点留白消掉） |
| B | 三个数字框补 `size="3"`、HEX 框补 `size="7"`（或把 `.custom-color-picker-panel input[type="text"]` 的 `width` 让位） | 三种格式统一 **274.47**，容器仍 250 | 依赖"固有尺寸恰好仍 ≥250"这个巧合（250.07），比 A 脆 |
| C | A + B 同时做 | 同 A，最稳 | 改动面最大 |
| D | 只把面板 `width: max-content` 换掉 | 面板会固定成某个 em 值，比 250 容器窄或宽，取色器尺寸会变 | 观感变化最大，不推荐 |

## 6. 未验证

- 只测了 Chrome（headless）；**未测** Firefox / Safari，也未测页面缩放（Ctrl+±）档。
- ~~窄视口未测~~ → **已补**：260×896 下改前改后逐字相同（面板 244 / 容器 219.63 / 留白 −0.01），
  `max-width: 100%` 的收缩路径与原来的 `min(250px, 100%)` 行为一致。
- 未专门测「聚焦到数字框时是否还抖」——现象与焦点无关已由 E3（只改第一个框即减 119px 留白）排除。
