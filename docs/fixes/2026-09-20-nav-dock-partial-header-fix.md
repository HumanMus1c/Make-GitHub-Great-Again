# 2026-09-20 登录态头部 More 丢项根因修复与导航坞版本号显示

## 需求

1. 导航坞标题栏显示脚本版本号。
2. 模拟移动端下登录态头部(react-partial)More 溢出项仍丢失
   (v2026.10.7 复测)。

## 根因定位(控制台诊断日志逐轮取证)

1. **预检 wrapper 假成功(主因)**:`findMoreMenu` 的 wrapper 分支把
   **包含 nav 的容器**当菜单候选 —— 登录态头部 More 与 tab 列表同属
   一个容器,预检收割到本栏外显项即判定"成功",此后永不点击 More。
   v0.10.4 只拒绝了"nav 内部候选",漏掉"包含 nav 的父容器本身"。
2. **变量未声明 ReferenceError**:v2026.10.5 拆分 harvestMoreItems 时
   `menu/items` 声明留在外层包装,Locked 函数内读取未赋值变量直接抛
   ReferenceError,被上层 catch 静默吞掉(菜单未在 2.5s 内出现必现)。
3. **会话定稿封死收割机会**:产物定稿后缓存命中分支不计算 missedBars,
   切 Responsive 后晚出现的头部 More 永不被处理。
4. **状态机按栏键记录**:React 重渲染重建的触发器元素被旧状态封死。

## 修改内容(v2026.10.8)

1. 快照检查点 `04c8f7e`。
2. findMoreMenu:含 nav 的容器一律拒绝作为菜单候选。
3. harvestMoreItemsLocked:补 `let menu = null; let items = [];`。
4. buildNavDock:missedBars 每轮重算(与缓存命中无关)。
5. 收割状态机改按触发器元素(WeakMap,每元素至多 2 次:空结果 2.5s 后
   允许一次重试;成功即封),全局 12 次上限兜底。
6. harvestMoreItems 预跳过 display:none 的 wrap 模式 More 按钮;
   菜单查找新增最终通用兜底(触发器之后第一个可见含锚点列表,要求
   严格多于预检所见,防假成功);isMoreLabel 放宽语义匹配。
7. buildNavDock finally 里补 scheduleNavDockViewportCheck:构建期间
   注入的触发器不再被 navDockBuilding 守卫吞掉。
8. 标题栏版本角标(.mgga-nav-dock-header-version,GM_info,样式对齐
   设置面板)。

## 验证

- `tools/verify-partial-header-flow.js`(登录态头部结构模拟:切窄后
  1.5s 注入 More + portal 延迟挂载 + primer 焦点行为):恰好点击 1 次,
  Pricing/Team/Customer Stories 全部入面板,scrollY=0,无后续点击。
- `tools/verify-mobile-e2e.js`:真实 GitHub 移动宽度收割到此前丢失的
  头部溢出项(react 仓库 Node/React Native,13 项 vs 桌面 11 项);
  断言语义更新为"核心项双视口都在 + 移动 ≥ 桌面 + 社区 tab 存在"。
- `tools/verify-late-bar-harvest.js`(34s 晚现假栏):恰好 1 次点击,
  2 项入面板,scrollY=0。
- `tools/diag-scroll-oscillation.js` / `tools/diag-scroll-loop.js`:
  静止、无无限重试。`node --check` 通过。

## 教训

- 匿名态探针覆盖不了登录态头部结构;模拟探针要尽量还原 react-partial
  的重渲染时序(触发器晚出现 + portal 延迟挂载)。
- 静默 catch 吞掉 ReferenceError 掩盖了多轮修复无效的真因;在关键
  链路加临时 console.info 逐轮取证是破局关键。
