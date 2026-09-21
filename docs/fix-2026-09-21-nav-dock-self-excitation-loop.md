---
topics: [fix, nav-dock, infinite-loop, selectors]
doc_kind: note
created: 2026-09-21
version: 2026.10.18
snapshot: 116088274b815ba7563df977031dcbe1c7dafebe
---

# 仓库页"无限加载"修复：nav dock 自激励重扫循环（2026-09-21）

## 现象

打开 GitHub 仓库页后，DevTools 控制台被 `[MGGA] scan` 刷屏、看不到页面自身
代码；页面观感"无限加载"、永不进入空闲态。

**回滚点**：`116088274b815ba7563df977031dcbe1c7dafebe`
（`git reset --hard 1160882` 可精确回到修复前）

## 诊断结论（先量化，再动手）

真机 Chrome + CDP，1280px 桌面全宽、10s 稳态窗口：

| 指标 | 改前 2026.10.16 | 修复前 2026.10.17 | 修复后 2026.10.18 |
|------|-----------------|-------------------|-------------------|
| `[MGGA] scan` 日志 | 141 条（14.1/s） | 147 条（14.7/s） | **0 条** |
| Script 时间 / 10s | 147 ms | 201 ms | **5 ms** |
| DOM 创建节点 | +2110 | +2248 | **+0** |
| dock 面板 / 导航项 | 有 / 11 | 有 / 11 | 有 / 11 |

改前与修复前**逐位一致** —— 主因**不是**本次 9 项整改引入的，是长期潜伏的既有缺陷。
`facebook/react`（重型真实仓库）与 400px 窄视口对照结论相同。

`13.8 ÷ 3 栏 ≈ 4.6 轮/秒 ≈ 每 217ms 一轮`，与 200ms 去抖周期精确吻合。

## 根因 A：自激励重扫循环（主因）

三个条件同时成立才发作：

1. **`finally` 无条件续排** —— `buildNavDock` 结束时必然
   `scheduleNavDockViewportCheck()`，即 200ms 后再跑一轮；定时器自我重排，没有停止条件。
2. **`session.byBar` 只在"收割成功"时才定稿** —— `if (harvestedByBar.size) session.byBar = …`。
   桌面全宽时各栏导航项全部外显、无需下拉，收割永远为空 → 缓存永远写不上 →
   每轮都走"缓存未命中"分支：重扫所有栏 + 打印每栏日志。
3. **签名短路写在重扫之后** —— 白干一遍、日志打完才 `return`。

**为什么"突然"**：它只在**桌面全宽**成立。项目里 `docs/fixes/*` 与 `tools/*.js` 的
验证一律用 400px 移动视口，这条路径从未被探针覆盖；一旦在桌面打开仓库页 +
DevTools，14 条/秒的刷屏立刻可见。

## 根因 B：选择器兜底越界（本次整改的真实回归）

`queryAssetRows()` 的兜底含裸 `ul[data-view-component] li.Box-row` /
`section[data-testid="release-assets"] li`，主选择器失配时会把页面其它无关
`li.Box-row`（动态流、贡献者列表）也当资产行返回；`queryAssetCell()` 末位兜底
为 `row` 自身，使 `link.innerHTML = ""` 直接清空无关行的内容 → 触发 React
重渲染 → 观察器再调 `processAssets` → **无限重试循环**（本仓库已记录两次）。

jsdom 对照（主选择器失配 + 页面存在无关 `li.Box-row`）：

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 被处理的资产行 | 5（含 3 个无关行） | **2（仅真实资产行）** |
| 无关行原生图标 | 3 → **0（被清空）** | 3 → **3（保留）** |
| 被套 `.file-name-container` | 0 → **5（越界）** | 0 → **2（正常）** |
| 资产行自定义图标 / 高亮 | 2 / 2 | 2 / 2（功能保留） |

`tools/smoke-load.js` 抓不到，因为它 fixture 里唯一的 `li.Box-row` 就是资产行。

## 修复清单

### A1 早短路前置
新增 `navDockCheapSignature()`（只读栏内锚点 href，零副作用）与
`navDockHasPendingTrigger()`，在**任何重扫 / 日志 / DOM 写入之前**判定"本轮无事可做"
并直接返回。

### A2 空产物同样定稿
只要没有"从未点击过"的触发器，就把 `session.byBar` 写定为当前产物（哪怕为空）。
这是安全的：面板项本就由 `collectRepoHomeNavItems()` 直读实时 DOM，缓存只补充
"被收进 More 里的隐藏项"；晚现触发器仍由每轮独立重算的 `missedBars` 补收分支
获得点击机会并在成功时回写。

### A3 续排收窄且自限
`finally` 只在以下三种情况续排，且连续"有进展"轮次设上限
（`NAV_DOCK_MAX_REBUILD_STREAK = 5`），其余一律停表：

| 条件 | 含义 |
|------|------|
| `navDockDirty` | 构建期间到达的变更需要回看（补回旧实现靠无条件续排遮盖的缺口） |
| `roundPending` | 还有分批 / 重试收割需求 |
| `roundProgress` | 本轮真的重建了面板，需一轮确认晚现触发器 |

停表后由 `MutationObserver` / `resize` / SPA 事件唤醒 —— 这些唤醒源本就存在
（`window.addEventListener("resize", scheduleNavDockViewportCheck)`）。

### A4 重试窗口独立排程
收窄续排后，"空结果后的 2.5s 唯一重试"会等不到轮次（React 注水慢、菜单延迟挂载时
曾靠它成功收割）。新增 `navDockEarliestRetryAt()` + `scheduleNavDockRetry()`：
一次性定时器，不参与自激励续排；每元素至多 2 次、全局至多 12 次，落地后即无待重试项。

真机证据（预热 3s 累计）：`scan 3 / harvest 6` = 3 栏各扫 1 次、3 个触发器各点 2 次
（首次 + 2.5s 重试），此后 10 秒逐秒增量**全为零**。

### A5 日志降噪
每栏结构自诊断由 `console.info` 改为 `console.debug`（Chrome/Edge 控制台默认不显示
Verbose），排查时切 Verbose 即可，不再遮住页面自身日志。

### B 兜底收窄
1. `queryAssetRows()`：兜底改为「`[data-testid="release-assets"]` 容器内」→
   「行内确有 `/releases/download/`、`/archive/` 等下载特征」两级，绝不裸选。
2. `queryAssetLink()`：主单元格类名失配时，额外要求链接具备下载特征或位于可信
   容器内，宁可跳过也不误改。
3. `queryAssetCell()`：**保留** `row` 兜底 —— GitHub 改版时单元格类名可能整体
   更换（如仅剩 `div.d-flex`），安全性改由"行选择收窄 + 链接可信度判定"承担。

## 验证手段

本仓库是**单文件油猴脚本，无构建步骤、无 release/debug 分支**（仅 `main`）。
可编译产物不存在，故等价验证为：

| 手段 | 覆盖 |
|------|------|
| `node --check Make-GitHub-Great-Again.js` | 语法 |
| `node tools/smoke-load.js` | 行为回归（jsdom，34 项断言，无需网络） |
| `.workbuddy/diag-loop/cmp-fix.js` | 三版本 jsdom 对照（scan 24→2，6s 窗口仍为 2） |
| `.workbuddy/diag-loop/cmp-fallback.js` | 选择器兜底越界对照 |
| `.workbuddy/diag-loop/probe-real2.js` | 真机 CDP 主线程 / 日志 / DOM 探针 |
| `.workbuddy/diag-loop/probe-once.js` | 真机逐秒增量定点核查 |

```
node --check            exit 0
tools/smoke-load.js     34 项，PASS 34，FAIL 0
```

## 复现验证

```bash
node --check Make-GitHub-Great-Again.js
node tools/smoke-load.js
node .workbuddy/diag-loop/cmp-fix.js 6000
node .workbuddy/diag-loop/probe-real2.js 10 "" facebook/react 1280
```

## 遗留

- 本次未做 `.workbuddy/diag-loop/` 之外的探针覆盖扩充。**桌面全宽路径长期无探针**
  是这条缺陷潜伏至今的结构性原因，建议把 `probe-real2.js` 纳入常规回归。
- `NAV_DOCK_STRUCT_VER` 未递增：面板 DOM 结构未变，新增的
  `data-mgga-nav-dock-cheap-sig` 会在首轮被回填，无需强制重建。
