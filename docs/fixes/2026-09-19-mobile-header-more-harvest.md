# 修复记录：模拟移动端视口下头部导航 More 溢出项收割失效

- 日期：2026-09-19
- 版本：v2026.10.4（面板结构版本 v9）
- 快照：7e021ac（修复前）；修复提交 0bd4d04

## 现象

进入调试模式把页面模拟为移动端后，悬浮导航面板坍缩为只剩 5 项。缺失的只有
头部导航（`.js-header-wrapper > react-partial > … > header > nav`）More 下拉
里的溢出项；文件区导航（`OverviewRepoFiles-module… > nav`）的 More 收割正常。

## 取证方法

puppeteer-core + 本机 Chrome 无头 + GM_* 垫片完整加载 userscript（沿用上轮
工具链），新增三个工具：

- `tools/probe-headermore-mobile.js`：400px 移动视口注入 userscript 原始函数
  （findMoreTrigger/findMoreMenu/extractMenuItems/harvestMoreItems）到真实
  GitHub 页面运行，输出头部 nav 结构、触发器匹配、收割结果、面板实际条目。
- `tools/probe-mobile-navs.js`：移动视口枚举仓库页全部 nav 的结构特征
  （aria-label、父链、锚点可见性、More 触发器可见性）。
- `tools/verify-mobile-e2e.js`：移动 400px + 桌面 1280px 双视口端到端回归。

## 取证结果（证据链）

1. 未登录 + 400px 视口（react 仓库）：面板 11 项完整（6 个仓库 tab + 5 个
   文件区 tab），收割机制在移动视口下本身正常。
2. 登录态头部 nav 与未登录结构完全不同：未登录为 MarketingNavigation
   （aria-label="Global"，无 More）；用户截图的登录态头部在 react-partial
   内渲染，More 触发器收纳溢出项。
3. 代码审查锁定两处结构性缺陷 + 一处保真缺陷，与"文件区正常、头部失败"
   完全吻合：
   - 预检假成功（主因）：findMoreMenu 预检的 wrapper 分支用
     trigger.closest("div") 圈定容器后 querySelectorAll("ul")，若 More 按钮
     与 tab 列表同容器（登录态头部布局），候选"菜单"就是本栏导航列表本身
     或其内部节点（tab ul、溢出隐藏 li）。收割出与可见项重复/残缺的条目即
     被当作成功缓存（buildNavDock 只把空收割记入 missedBars 重试），永不
     点击 More，溢出项永久丢失。文件区 More 按钮容器干净，预检返回 null，
     正常走点击路径 —— 正是"文件区正常、头部失败"的差异点。
   - 触发器查找过窄：findMoreTrigger 只在 nav 元素内部查找，若新版头部把
     More 按钮渲染为 nav 的兄弟节点则永远找不到触发器（防御性修复）。
   - 收割产物丢失：extractMenuItems 把 href="#" 一律丢弃，More 菜单内的
     React 客户端路由溢出 tab（License/Contributing 类）在收割层被提前
     丢掉，到不了 pushItem 的白名单解析。

## 修复内容

1. findMoreMenu 预检加固：allowGlobalFallback=false 时拒绝一切位于本栏 nav
   内部的候选菜单（aria-controls 与 details/summary 所有权路径在前置分支，
   不受影响）；真实菜单由点击后的全局兜底（仅收可见 portal）提供。
2. findMoreTrigger 加固：nav 内找不到触发器时向上扩大一层容器查找，限定
   外层首个 nav 必须是本栏，避免把相邻栏的 More 误认为本栏触发器。
3. extractMenuItems 保真：href="#" 不再在收割层丢弃，放行给 pushItem 的
   白名单/选中态判定（与文件区直扫同规则）。
4. 面板结构版本 v8 → v9：升级后旧面板强制重建一次。

## 验证（真实 Chrome 端到端，移动 400px + 桌面 1280px）

| 场景 | 结果 |
| --- | --- |
| react/react 移动 400px | 11 项完整（Code/Issues/Pull requests/Actions/Security/Insights + README/Code of conduct/Contributing/MIT license/Security） |
| react/react 桌面 1280px | 11 项，与移动完全一致 |
| HumanMus1c/DeepLX 双视口 | 8 项一致，License ✓ |
| HumanMus1c/Make-GitHub-Great-Again 双视口 | 9 项一致，无假条目（回归干净） |
| jsdom 仿真 verify-harvest-sim.js | 8/8 PASS（预检拒收本栏列表、portal 收割、幽灵菜单过滤、harvest 全流程） |
| node --check | 通过 |

## 已知限制

- 未登录态无法本地复现登录态头部 DOM，登录态修复依据为结构缺陷推演 +
  多结构防御（同容器/兄弟节点/# 占位三类路径全部覆盖）。若用户环境仍有
  缺项，可运行 `tools/probe-headermore-mobile.js`（登录态浏览器）回传
  `tools/probe-headermore-mobile.json` 取证。

## 回滚

git reset --hard 7e021ac
