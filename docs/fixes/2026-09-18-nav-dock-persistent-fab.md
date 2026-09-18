# 2026-09-18 悬浮球常驻、油猴菜单仅控制面板展开/收起

## 需求变更

用户反馈:悬浮球的出现/关闭不应由油猴菜单控制。悬浮球应始终保持显示;
油猴菜单只负责展开/收起悬浮导航面板。

## 修改方案

1. 快照检查点 `b57d32a`。
2. **悬浮球常驻**:激活条件仅剩"当前路径为仓库主页"
   (`isRepoHomePath()`),移除功能开关门槛;悬浮球显隐只由页面类型决定,
   任何设备(含桌面)均显示。
3. **删除开关入口**:
   - 移除设置面板「移动端左侧悬浮导航」开关行及初始化绑定代码。
   - 移除 `GM_getValue/GM_setValue("mobileNavDock")` 存储读写。
   - 删除 `isMobileNavDockEnabled` 及开关相关的
     `rebuildNavDockAfterToggle` / `reportNavDockAvailability`。
4. **油猴菜单语义变更**:菜单项改为「展开/收起悬浮导航」,调用
   `toggleNavDockPanelFromMenu()`:
   - 非仓库主页:控制台提示 + 系统通知说明仅仓库主页可用。
   - 悬浮球未就绪:先即时构建一次再切换。
   - 已就绪:`setNavDockExpanded(!navDockExpanded)` 切换面板展开态。
5. **统一展开态同步**:新增 `setNavDockExpanded(expanded)`,悬浮球点击与
   菜单共用,同步面板 `data-expanded`、悬浮球 `aria-expanded` 与提示文案;
   `bindNavDockFab` 改为调用该函数。
6. 文档同步:版本 2026.9.23,README/README_en 措辞更新,update_log 新增条目。

## 验证

- `node --check` 语法通过(0 错误)。
- 全文检索确认:`isMobileNavDockEnabled`、`mobileNavDockToggleBtn`、
  `rebuildNavDockAfterToggle`、`reportNavDockAvailability`、
  `GM_getValue("mobileNavDock")` 全部清零。
- git diff 复查:菜单回调、FAB 点击、applyMobileNavDock 激活条件、
  observer 初始化均与新语义一致;无死代码残留。
- 本仓库为纯用户脚本,无 release/debug 构建配置,以语法检查 + diff 复查替代
  双构建验证。
