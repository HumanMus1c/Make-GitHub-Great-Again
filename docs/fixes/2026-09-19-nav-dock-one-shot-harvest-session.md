# 2026-09-19 收割节奏改为一次性会话与 Responsive 头部丢项修复

## 需求

1. DevTools 选 Responsive 缩窄视口(桌面 UA、不刷新)后,头部导航
   (react-partial)在面板中只剩外显 2 项;文件区 More 隐藏项正常。
2. 用户建议:每次进入 repo 页/刷新时只收割一次,短时间内条目不会
   大规模变动。

## 根因定位

1. 桌面→缩窄是**重排流**:GitHub 对导航的处理与小视口全新加载不同。
   探针(tools/diag-responsive-header.js)取证:桌面加载时各栏无 More
   触发器,缩窄后 12 锚点的仓库栏缩到 6 外显;登录态头部 react-partial
   的 More 注水/重渲染时机晚得多。
2. 上一版(v2026.10.5)每栏 3 次预算在重排流里于菜单就绪前耗尽,
   头部栏被永久放弃 → 面板只剩外显项。
3. 预算键含视口桶,拖拽 Responsive 跨桶还会重置预算造成新一轮点击。

## 修改内容

1. 快照检查点 `0aaa37a`。
2. **一次性收割会话**(v2026.10.6):
   - 会话键 = loadRun 序号 + 路径;loadRun 序号仅在进入仓库页/刷新/
     SPA 跨路径时递增(navDockLastBuiltPath 识别);
   - 窗口期 20s,每栏至多点击 2 次(初次 + 空结果补收一次);
   - 窗口外与视口变化重建一律只读缓存,绝不再点击;
   - 删除 navDockHarvestAttempts 预算簿记与无限补收机制。
3. **边界修复**:空收割不定稿(防"空缓存锁死 → 悬浮球消失");
   待补栏每轮重算(窗口 + 每栏余量双守卫,不超额点击),覆盖
   重排/注水晚出现的栏。
4. 收割点击期间滚动锁定(snap-back)保留(v2026.10.5 引入)。

## 验证

- `node --check` 语法通过。
- `tools/verify-responsive-flow.js`(用户场景):桌面 1280 加载 11 项
  (1 次点击)→ 切 Responsive 400 不刷新,面板保持 11 项、追加点击
  有界(4 次事件后安静)、scrollY ≤4px、无振荡。
- `tools/verify-mobile-e2e.js`:移动 400px + 桌面 1280px 全新加载
  双视口 11/11 项,PASS。
- `tools/diag-scroll-oscillation.js`:静止;`tools/diag-scroll-loop.js`:
  失败栏点击收敛不再无限。
