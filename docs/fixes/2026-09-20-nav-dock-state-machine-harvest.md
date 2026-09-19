# 2026-09-20 晚切换 Responsive 头部丢项修复与每栏一次收割状态机

## 需求

用户复测(v2026.10.6):等待打开 DevTools 后再切 Responsive,头部导航
(react-partial)在面板中仍只剩外显 2 项;文件区 More 隐藏项正常。

## 根因定位

1. v2026.10.6 的收割窗口(20s)从**页面加载**起算。用户流程:
   打开页面 → 打开 DevTools → 切 Responsive,耗时必然超过 20s。
2. 文件区栏在加载时(桌面宽度)已有 More 触发器并被收割入缓存 →
   切窄后复用缓存,正常。
3. 头部栏在桌面宽度下**无 More 触发器**(项全外显,无需下拉)→ 缓存
   中无头部条目;切窄后 GitHub 重排出头部 More,但窗口已关闭,
   canClickBar 永为 false → 头部溢出项永久丢失,只剩直扫到的外显项。
4. 教训:探针此前"加载后立刻缩窄",窗口未过期,测不出该时序漏洞;
   决定性差异是用户操作带来的**任意延迟**。

## 修改内容

1. 快照检查点 `43d7061`。
2. **每栏一次的状态机**(v2026.10.7,替代时间窗):
   - 会话内记 clicksByBar / failedBars;canClickBar = 该栏从未点击过
     且不在失败名单且全局余量(12)未尽;
   - 收割到条目 → 入缓存定稿;点击后为空/异常 → failedBars,本页面
     内绝不再点击;
   - 晚出现的栏首次出现即收割一次(无时间窗),其余视口变化只读缓存;
   - 删除 NAV_DOCK_HARVEST_WINDOW_MS / NAV_DOCK_BAR_MAX_CLICKS。
3. **解锁回弹**:收割结束立即 scrollTo(锁定位置),1.5s 宽限期内
   50ms 步进有界回弹,覆盖在途平滑滚动动画(否则页面残留到触发器
   位置,实测 5955px)。
4. 记账修正:异常路径也 recordClick(bar, false),不留可重复点击的栏。

## 验证

- `tools/verify-responsive-late-switch.js`(用户时序:桌面加载等 25s →
  切 Responsive 400 不刷新):面板 11 项不缩水、总点击 1 次、yMax=0。
- `tools/verify-late-bar-harvest.js`(晚现栏:34s 注入带真实溢出项的
  假 More 栏于页首下方 1500px):按钮恰好点击 1 次,Fake Alpha/Beta
  入面板(11→14 项),全程 yMax=0(解锁回弹生效),之后无点击。
- `tools/verify-mobile-e2e.js`:双视口 11/11 项 PASS。
- `tools/diag-scroll-oscillation.js` / `tools/diag-scroll-loop.js`:
  静止、无无限重试。
- `node --check` 语法通过。
