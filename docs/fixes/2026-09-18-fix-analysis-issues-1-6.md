# 修复流程：代码分析问题 1-6（2026-09-18）

## 修复计划（执行前确定）

| # | 问题 | 方案 | 风险控制 |
|---|------|------|----------|
| 1 | 架构识别算法 v2（约 280 行）从未被调用 | 接入 `processAssets` 作为图标匹配的**第四级兜底**（扩展名 → 压缩包系统词 → 全关键词 → v2 OS 归一），只映射到已有 6 个图标规则 | 不引入新图标、不改变既有三级匹配顺序，零回归风险 |
| 2 | 存储值经 innerHTML 注入的路径（颜色/关键词文本） | 新增 `sanitizeHexColor()` / `escapeHtmlText()` 公共工具；所有颜色进入模板前消毒；关键词文本转义 | 消毒失败回落主题默认色；转义仅影响显示 |
| 3 | i18n 硬编码中文残留 | 对话框重置确认改用 `confirmReset/darkTheme/lightTheme`；开关 title 改用 `enabledTitle/disabledTitle`；颜色按钮 name 拆分为稳定逻辑键 + 本地化显示名（新增 `oddRowShort/evenRowShort/hoverShort/invalidColor`） | 纯文案层，无逻辑变更 |
| 4 | body 级 MutationObserver 性能开销 | 三个 observer 分别处理：assets → 观察范围缩到 `main`（兜底 body）；头部按钮 → 缩到仓库头（兜底 AppHeader/body），头部未渲染时用有限轮询（20×250ms）替代 body 监听；导航 More → 保留头部范围。三者均跳过本脚本自身变更（`data-mgga-mutation-guard` 标记 + 折叠属性检查），头部/导航布局增加幂等短路（样式已应用 / 布局签名未变则跳过） | 全部保留兜底路径，GitHub 改版时功能不失效 |
| 5 | aarch64 与 x86_64 同色不符合语义 | aarch64 固定与 arm64 同为桔红色（hue 15），与 v2 算法的 ARM 同族归一一致 | 仅配色 |
| 6 | `applyColors` 空样式残留 / HEX 校验不一致 / 高亮函数重复 GM_getValue | 非 Release 页移除并重挂空 style 标签；删除面板内 `validateHexColor`（统一走 `sanitizeHexColor`）；prompt 保存路径补校验 + `invalidColor` 提示；新增 `refreshThemeColorsCache()` 主题色缓存，高亮正则替换改读缓存（确认保存/重生成高亮/初始化时同步） | 存储键与数据结构不变 |

## 实施流程

1. 创建快照检查点 `fbf28b8`（[snapshot] checkpoint before fixing analysis issues 1-6）。
2. 批次一：版本号 2026.9.21、i18n 新键、公共工具函数（sanitizeHexColor/escapeHtmlText/主题色缓存）、`applyColors` 消毒 + 非 Release 页清理。
3. 批次二：设置面板模板三处颜色消毒、`renderKeywords` 文本转义、`handleColorBtnClick` 去"奇数行/偶数行/悬停"硬编码、`updateToggleBtnUI` 走 i18n、重置确认走 i18n。
4. 批次三：菜单 prompt 三处颜色校验 + `invalidColor` 提示、确认保存后同步缓存、添加关键词颜色消毒、`highlightArchKeywords` 改读缓存、`regenerateHighlight`/初始化同步缓存、删除 `validateHexColor`。
5. 批次四：三个 observer 改造（范围缩小/自身变更过滤/幂等短路/布局签名），头部修复有限轮询兜底；注入节点打 `data-mgga-mutation-guard` 守卫标记。
6. 批次五：aarch64 配色修正；新增 `OS_CANON_TO_RULE_NAME` + `findIconRuleV2()`，接入 `processAssets` 第四级兜底。
7. 验证：`node --check` 语法通过；提取 v2 算法/消毒/转义/兜底映射做 19 项行为测试全部通过（测试中发现并修复了 `sanitizeHexColor` 对 3 位/无 # 缩写的两处边界缺陷）。
8. 按 SOP 删除临时测试脚本，提交。

## 影响面

- 不改变任何 `GM_setValue` 存储键与数据结构，老用户升级无感。
- 图标匹配仅在既有三级规则全部未命中时多一级 v2 兜底（如 `*_win64_*.exe`、`*win32*` 此前不会出 Windows 图标，现在会）。
- 非 Release 页面不再遗留空 style 标签。
- English 界面不再出现中文残留（重置确认/开关提示/按钮名）。

## 编译验证说明

本仓库为单文件用户脚本，无 release/debug 构建配置；以 `node --check`（语法）+ 提取式行为测试（逻辑）替代双配置编译验证，两者均通过。
