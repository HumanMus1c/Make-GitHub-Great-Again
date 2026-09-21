---
topics: [fix, code-quality, refactor]
doc_kind: note
created: 2026-09-21
version: 2026.10.17
snapshot: c721c4c1f05a0f07869970412b24a188b2e1474f
---

# 代码质量整改记录：9 项静态审查问题（2026-09-21）

## 背景

对主脚本 `Make-GitHub-Great-Again.js` 做了一次通读审查，列出 9 项问题。
本文逐项记录根因、改法与验证。

**回滚点**：`c721c4c1f05a0f07869970412b24a188b2e1474f`
（`git reset --hard c721c4c` 可精确回到改动前）

## 验证手段

本仓库是**单文件油猴脚本，无构建步骤、无 release/debug 分支**（仅 `main`）。
可编译产物不存在，故本次引入的等价验证是：

| 手段 | 覆盖 |
|------|------|
| `node --check Make-GitHub-Great-Again.js` | 语法 |
| `node tools/smoke-load.js` | 行为回归（jsdom，34 项断言，无需网络） |

`tools/smoke-load.js` 用 jsdom 构造最小 GitHub 页面结构 + `GM_*` stub +
canvas mock，注入主脚本后走通：Release 资产图标替换 / 关键词高亮 /
设置面板打开 / 内置取色器交互链路 / 三个功能开关持久化 / 确认保存 /
左侧悬浮导航构建与 SPA 清理 / **改版形态兜底**。

## 逐项

| # | 问题 | 位置（改前） | 改法 |
|---|------|--------------|------|
| 1 | `dialog` 隐式全局 | L1355 | `dialog = …` → `const dialog = …`。IIFE 非严格模式下原会泄漏为 `window.dialog` |
| 2 | `createColorPickerDialog` 1458 行 | L1331–2788 | 抽出 5 个模块：`buildSettingsDialogHTML` / `bindFeatureToggleButtons` / `createKeywordRulesController` / `createColorPickerPanel` / `toggleColorPickerPanel`。**1458 → 303 行** |
| 3 | 颜色转换重复 2–4 份 | L1423/1552/1563/1601/1648/1798/1827/1861/3431 | 收敛为模块级颜色工具区；新增 `cssColorToHex` 统一三处"rgb() 字符串 → HEX"。删除死代码 `hexToRgb`(面板内) 与 `rgbToHex`(数值版面板内) |
| 4 | `@name:en` 与 `@name` 同值 | L2–3 | `@name:en` → `Make GitHub Great Again` |
| 5 | 版本兜底硬编码 `"4.1"` | L409 | 新增 `getScriptVersion()` 单一来源；面板标题与 nav dock 版本号共用 |
| 6 | nav dock 命名漂移 | 全局 | `applyMobileNavDock`→`applyNavDock`；`mgga-mobile-nav-dock*`→`mgga-nav-dock*`；i18n `mobileNavDock`→`navDock`；修正策略注释；`NAV_DOCK_STRUCT_VER` 10→11 |
| 7 | `@grant unsafeWindow` 零引用 | L14 | 删除该 grant |
| 8 | 硬编码 GitHub 内部类名 | L2465/2468/3676/3681/3687/3888 | 集中为 `ASSET_SELECTORS` + `queryAssetRows/queryAssetCell/queryAssetLink`；失配时按 `data-testid="release-assets"` 与语义结构兜底；`applyColors` 的 `!important` 规则并列兜底选择器 |
| 9 | `window.initializeArchStyles` 无消费者 | L3483/3629 | 收回 IIFE 内部，改为普通函数声明 |

## 搬迁安全措施（问题 2）

1458 行函数的拆分是纯**搬移**（不改逻辑），用脚本完成并逐步校验：

1. **模板字面量逐字比对**：抽出前后比对 9 个模板字面量的内容，确认逐字一致
   （缩进处理对模板内部行原样保留，只调整非模板行的前导空格）。
2. **自由变量扫描**：扫描抽出块引用的外层标识符 —— 结果只有 `refreshRealtimeStyles`
   一个，显式参数化后闭合。
3. **调用点计数**：所有 `replaceOnce` 要求恰好 1 处匹配，多/少即中止。

## 验证结果

```
node --check            exit 0
tools/smoke-load.js     34 项，PASS 34，FAIL 0
```

指标核对：

| 指标 | 改前 | 改后 |
|------|------|------|
| `createColorPickerDialog` 行数 | 1458 | **303** |
| `cssColorToHex` / `rgbToHex` / `hexToRgb` / `hslToHex` / `hexToHSL` / `rgbToHSL` / `hslToRGB` / `isDarkColor` 定义数 | 1/4/2/2/2/2/2/2 | **1/1/1/1/1/1/1/1** |
| 隐式全局 `dialog` 赋值 | 1 | **0** |
| `unsafeWindow` 出现 | 1 | **0** |
| 硬编码 `"4.1"` | 1 | **0** |
| `window.initializeArchStyles` | 3 | **0** |
| 旧命名 `applyMobileNavDock` / `mgga-mobile-nav-dock` / `mobileNavDock` | 6/21/5 | **0/0/0** |
| 裸写内部类名 `querySelector("\.Box.Box--condensed…")` | 4 | **0** |
| 全文件总行数 | 5940 | 5967 |

## 遗留（不在本次 9 项内）

`createColorPickerPanel` 仍有 **504 行**。它是一体的内置取色器控件：canvas
绘制、输入解析、预设色、事件绑定共享 `currentH/S/L`、`currentFormat`、
`hexInput`、`preview` 等 5 个可变状态，继续拆分需要先改造成状态对象，
属重写范畴，本次未动。如需处理请单开一轮。

## 复现验证

```bash
node --check Make-GitHub-Great-Again.js
node tools/smoke-load.js
```
