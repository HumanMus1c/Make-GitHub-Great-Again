# 2026-09-19 悬浮导航收割引发页面滚动振荡(顶部↔README 区)修复

## 需求

DevTools 模拟移动端(缩窄视口)打开 GitHub 仓库主页时,页面在顶部与
README 区之间来回平滑滚动,周期约 6.8s,永不停止。

## 根因定位(调查阶段,工具取证)

1. **无限重试循环**:`buildNavDock` 的签名短路在收割**之后**、补收之前
   不生效,任何 body 变更(MutationObserver + 定时器)都会重新进入补收;
   missedBars(有 More 触发器但收割不到条目的栏)重试无次数上限。
   实测一个"永不成功"的 More 栏以 ~2.6s/轮 被无限真实点击
   (`tools/diag-scroll-loop.js`:25s 内 18 次点击)。
2. **焦点还原引发滚动**:收割对屏幕外 More 触发器真实 click() + Escape,
   primer-react 关菜单时调 `HTMLElement.focus` 把焦点还原给触发器,
   浏览器平滑滚动使目标可见(scrollY 0→2294,调用栈来自 primer-react,
   `tools/diag-scroll-source.js`)。
3. **振荡合成**:两个失败栏(登录态头部 More 在页首、文件区 More 在
   README 区)交替重试,滚动在两个锚点间往复。复现脚本
   `tools/diag-scroll-oscillation.js`:0↔432px 周期 ~6.8s 平滑振荡。

## 修改内容

1. 快照检查点 `dfe7cfa`。
2. **滚动锁定升级(snap-back)**:收割点击窗口内不止 `overflow:hidden`
   (程序化滚动依规范可滚 hidden 容器,实测锁不住),同时挂 scroll
   capture 监听把 window.scrollY 瞬时拉回锁定时位置;引用计数支持
   嵌套收割;`finally` 保证解锁。
3. **每栏收割预算**:`navDockHarvestAttempts`(key = cacheKey + navBarKey)
   上限 3 次,主收割循环与补收循环共用;预算耗尽静默放弃该栏。
   成功收割清零预算;"无触发器"缺栏不点击、不耗预算(注水等待语义保留)。
4. **签名短路前移**:收割后、补收前,本轮结果与现有面板一致且无待补栏
   时直接返回;杜绝"任何 body 变更都重扫并重新点击 More"的循环。
   缓存键加 `#v2` 后缀,旧结构面板经 STRUCT_VER 强制重建一次。
5. **结构版本 v10**(`NAV_DOCK_STRUCT_VER` 常量化,短路检查与重建共用),
   面板 dataset 补 `mggaNavDockCount`;版本 2026.10.5。

## 验证

- `node --check` 语法通过。
- `tools/diag-scroll-oscillation.js`:振荡消失——锁定期间 scroll 恒定,
  解锁后一次 ~240ms 残余滑动后永久静止,无第二周期;focus-jump 0 次。
- `tools/verify-mobile-e2e.js`:移动 400px + 桌面 1280px 双视口 11/11 项,
  contributing/license/coc/security 全部到位,PASS(收割功能无回归)。
- `tools/diag-scroll-loop.js`:假失败栏点击 18 次 → 4 次(2 轮开/合,
  预算内)后永久安静;锁定期间滚动残差 ≤4px。
- git diff 逐块复查与计划一致;预算记账、短路条件(含 missedBars 判空)、
  引用计数解锁路径均已覆盖。

## 遗留说明

- 若未来 GitHub 改用非 window 滚动的容器布局,snap-back 需同步监听
  对应滚动容器;当前 GitHub 主文档流为 window 滚动,机制有效。
- 失败栏放弃后面板不含该栏溢出项(静默降级);因滚动锁定不再打扰用户,
  可接受的取舍。
