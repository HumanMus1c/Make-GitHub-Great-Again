# 2026-09-18 修复移动端悬浮导航不可见与菜单开关无响应

## 问题

上一轮实现的移动端仓库主页左侧悬浮导航存在两个用户可见缺陷:

1. 仓库主页完全看不到用于展开导航栏的悬浮球。
2. 油猴菜单的「移动端左侧悬浮导航」点击后没有任何效果。

## 根因定位

1. **buildNavDock 静默早退**(主因):构建入口保留旧 flatten 功能的遗留守卫
   `const nav = findHeaderNav(); if (!nav) return;`。移动端或部分布局下全局
   头部没有 `nav` 元素时,整个构建在收割任何导航项之前就静默返回——悬浮球
   不渲染、无报错、无日志。这同时解释了症状 1。
2. **isMobileDevice 判定过严**:`compact && (touch || uaMobile)` 要求窄窗口
   且(触摸或移动 UA)。桌面 DevTools 窄窗口(无触摸、桌面 UA)下永远不满足,
   调试时同样"看不到";部分 WebView 的 UA 也不含移动标记,真机可能漏判。
3. **开关请求被构建守卫静默丢弃**:`buildNavDock` 用 `navDockBuilding` 防重入,
   `applyMobileNavDock` 是异步的。若上一次构建仍在收割下拉项(自动点击 More
   触发器后轮询最多 1 秒),开关触发的重建请求直接被守卫丢弃,表现为"点了没
   效果"。此外开关后没有任何用户反馈(状态只写进存储,页面不变化也不提示)。

## 修复方案

1. 快照检查点 `bc37c99`。
2. `buildNavDock` 移除对全局头部 nav 的硬依赖,直接 `findRepoHomeNavBars()`
   扫描全部导航条形栏;每栏收割包 try/catch,单栏失败不阻断其余栏。
3. `isMobileDevice` 宽松化:`touch || uaMobile || compact`——手机真机由触摸或
   移动 UA 命中;桌面窄窗口(DevTools 调试)也允许,便于验证与使用。
4. 新增 `rebuildNavDockAfterToggle()`:开关后强制 `removeNavDock()` +
   清空收割缓存,再重建;若构建正在进行则有界等待(最长 3 秒)构建结束后
   重建,不再被守卫静默丢弃。设置面板与油猴菜单开关均改走此入口。
5. `applyMobileNavDock` 全程 try/catch,构建异常输出 `console.error`;
   非活动页面/设备输出 `console.info` 说明原因(path 与 mobile 判定值)。
6. 开关操作加用户反馈:油猴菜单切换后 `GM_notification` 提示已开启/已关闭;
   若当前页面/设备不满足条件,用通知 + 控制台说明(需仓库主页 + 手机或窄窗口)。

## 验证

- `node --check` 语法通过(0 错误 0 警告)。
- 全文检索确认 `navDockPendingRebuild` 残留清零(竞态方案改为有界等待后已删)。
- git diff 复查:确认无头部 nav 依赖残留、通知调用均有 `typeof GM_notification`
  守卫、等待循环有 3 秒上界。
- 本仓库为纯用户脚本,无 release/debug 构建配置,以语法检查 + 逻辑复查替代
  双构建验证。
- 实机验证建议:桌面 Chrome DevTools 手机模拟(iPhone UA + 375px 视口)打开
  任意仓库主页,应出现左下角悬浮球;点击展开导航面板;油猴菜单切换应有系统
  通知,且桌面宽窗口下会提示"当前页面/设备不满足条件"。
