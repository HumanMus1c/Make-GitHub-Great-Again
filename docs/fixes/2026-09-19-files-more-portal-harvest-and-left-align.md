# 2026-09-19 文件区 More 菜单收割落地与面板文本左对齐回推

## 需求

1. 文件区栏（`OverviewRepoFiles-module__Box_3 > nav[aria-label="Repository files"]`）
   More 下拉内的 Contributing 与 License 仍未收进面板。
2. 上一轮为修假滚动条给克隆文本 span 加的 `flex: 1 1 auto` 把各条目文本
   推离行首，破坏了面板各项文本统一左对齐。

## 根因定位（抓取真实仓库页面核对，非猜测）

对 `https://github.com/<owner>/<repo>` SSR HTML 的分析结论：

1. 文件区 nav 结构：`prc-UnderlineNav-UnderlineWrapper` +
   `aria-label="Repository files"`，More 按钮为
   `button[data-component="overflow-menu-button"]`（类
   `prc-UnderlineNav-MoreButton`），位于 nav 内的
   `prc-UnderlineNav-MoreButtonContainer`，文本是
   `More + sr-only " items"` —— 旧 `isMoreLabel` 靠前缀匹配可命中。
2. **菜单容器不在按钮附近**：GitHub Primer 新版 ActionMenu 把菜单渲染为
   `anchored-position[data-target="action-menu.overlay"] → .Overlay →
   ul[role="menu"].ActionListWrap` 的 body 级 portal，`aria-controls`
   在 SSR HTML 中尚未带出；Contributing/License 在 SSR HTML 中完全不存在
   （React 注水后异步填充）。旧的「容器内 querySelector + 可见菜单全局兜底」
   链路对这一形态找不到菜单，收割持续为空。
3. 左对齐问题：`span[data-content] / span[data-component='text']` 与
   `.mgga-nav-dock-label` 的 `flex: 1 1 auto` 会拉伸文本节点，短文本
   （图标+文本布局下）不再紧贴行首。

## 修复内容

1. 快照检查点 `efa821e`。
2. `findMoreMenu(trigger, allowGlobalFallback)`：
   - 预检（未点击，`false`）仅接受所有权明确的菜单（`aria-controls`
     指向、触发器容器内）——页面其它菜单的可见残留不再造成假成功；
   - 点击后（`true`）允许扫描 body 下的 ActionMenu portal（新增
     `div[class*='Overlay'] [class*='ActionList']` 等特征），仍只收
     实际可见菜单（`isVisibleMenu`）且排除触发器自身内部。
3. `harvestMoreItems` 等待升级：点击后总计 2.5s（250ms 步进）有界轮询，
   兼容 React 异步创建 portal；「触发器本就展开」分支同样走可见性过滤；
   移除失去调用方的 `waitFor` 死代码。
4. 左对齐回推：两处文本节点 `flex: 1 1 auto → 0 1 auto`（不拉伸、仅
   `min-width:0 + overflow:hidden + ellipsis` 防溢出）。
5. 面板结构版本 v6 → v7 强制重建；版本 2026.10.2，update_log 同步。

## 验证

- `node --check` 通过。
- jsdom 仿真测试 `tools/verify-harvest-sim.js`（复刻脚本内真实函数源码）：
  8/8 通过 —— 预检不抓其它菜单、点击后能定位 body portal、
  Contributing/License 条目正确提取、隐藏幽灵菜单被拒、
  `harvestMoreItems` 全流程收割成功、`aria-controls` 所有权菜单保留。
- git diff 复查：`findMoreMenu` 签名与三处调用点一致，函数结构完整。

## 回归说明

- 仿真为 jsdom 无布局环境（getBoundingClientRect 打桩），真实浏览器中的
  portal 定位依赖 `isVisibleMenu` 尺寸探针，链路一致；升级后首次打开
  面板时文件区栏会经 1-2 轮补收（每轮 ≤2 栏）带入 Contributing/License。
- 回滚快照：`git reset --hard efa821e`。
