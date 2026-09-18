# 2026-09-18 移动端仓库主页左侧悬浮导航(重做导航栏 More 功能)

## 问题

原「导航栏 More 多行开关」功能桌面端与移动端全局生效,把仓库页头部导航的
More 下拉按钮改造成行内展开/折叠 toggle,并重排原生导航 DOM。该交互不符合
移动端使用预期,且对原生页面改动侵入性强。

## 需求变更

用户要求不再直接移除,而是复用其 More 检测与下拉收割能力,改进为:

> 当检测到页面处于移动端手机设备时,将 repo 仓库主页所有包含 "More"
> Toggle 的条形栏内部的所有 nav 导航全部索引一遍,按顺序罗列在一起放到
> 一个左侧悬浮导航栏。

## 修复方案

1. **快照检查点**:改动前提交 `[snapshot]` 检查点,便于精确回滚。
2. **保留复用**:`findMoreTrigger` / `findMoreMenu` / `extractMenuItems` /
   `harvestMoreItems` / `waitFor` 全部保留,作为 More 检测与下拉收割内核。
3. **移除 flatten 专属逻辑**:`injectNavMoreFlattenStyle`、
   `pickNavHost`、`clearFlattenedItems`、`buildFlattenedAnchor`、
   `hideNativeMoreDropdown`、`ensureMoreToggle`、`updateMoreToggleUI`、
   `collectFlowItems`、`measureWidth`、`layoutNavMoreRows`、
   `applyNavMoreFlatten`、`scheduleNavMoreFlatten`、`setupNavMoreObserver`
   及 `NAV_MORE_*` 常量全部删除。
4. **新增移动端 dock 模块**:
   - `isMobileDevice()`:窄视口 + 触摸/UA 综合判定手机设备。
   - `isRepoHomePath()`:仅匹配 `/:owner/:repo` 仓库主页,排除
     orgs/explore 等保留路径。
   - `findRepoHomeNavBars()`:扫描全局头部 nav、仓库标签条
     UnderlineNav、主内容区 nav 语义容器,覆盖所有含 More Toggle 的条形栏。
   - `collectRepoHomeNavItems()`:逐栏索引既有导航项(跳过隐藏项),
     合并各栏 More 下拉收割项,按 href|label 去重、保持顺序。
   - `buildNavDock()` + `buildNavDockPanel()` + `buildNavDockFab()`:
     渲染左侧悬浮球(带导航项数徽标)与可展开面板;不改动原生 DOM,
     原生 More 行为保持不变。
   - 同一路径收割结果缓存,避免反复自动点击触发器;签名未变化时跳过重建。
   - `applyMobileNavDock()` 入口:非移动端/非仓库主页/功能关闭时移除
     dock 并断开 observer;SPA 导航、resize、orientationchange 后重查。
5. **开关迁移**:i18n 词条改为 `mobileNavDock` 系列;设置面板按钮 id 改为
   `#mobileNavDockToggleBtn`;油猴菜单命令同步更名;存储键
   `navMoreFlatten` → `mobileNavDock`。
6. **文档同步**:README / README_en / update_log 新增功能条目,版本号
   2026.9.21 → 2026.9.22,头部 @description 补充新功能描述。

## 验证

- `node --check Make-GitHub-Great-Again.js` 语法通过。
- 全文检索 `navMore|NAV_MORE|nav-more` 无残留引用。
- 调用点检查:设置面板、油猴菜单、resize/orientationchange、SPA 导航钩子
  (turbo:load / turbo:render / pjax:end / pjax:complete / popstate)、初始
  执行均已指向 `applyMobileNavDock`。
- `data-mgga-mutation-guard` 为通用守卫标记,其他模块仍在使用,保留。
