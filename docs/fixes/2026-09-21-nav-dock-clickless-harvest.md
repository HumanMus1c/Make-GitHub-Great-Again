# 落地记录：nav dock 取数改为免点击读取预渲染的 More 折叠项

- 日期：2026-09-21
- 版本：v2026.10.19（面板结构版本 v11 → v12）
- 快照：`8772c63`（[snapshot] checkpoint before clickless More-item harvest）
- 涉及文件：`Make-GitHub-Great-Again.js`、`tools/smoke-load.js`、`tools/verify-harvest-sim.js`、`update_log.md`

## 缘起

上一版为压制"点击 More 引发 primer-react 焦点还原 → 页面滚动跳动 → 失败栏无限
重试 → 顶部↔README 区来回振荡"，引入了一整套防御复杂度：滚动锁定 + 回弹、
每元素 2 次点击预算、全局 12 次上限、2.5s 唯一重试窗口、20s 视口分桶、连续重建
上限。用户提出：有没有办法**不模拟点击**就拿到 More 里的折叠项。

## 取证一：GitHub 自身前端源码（决定性）

`githubassets/assets/behaviors-*.js` 模块 `G7`（`.js-responsive-underlinenav`）
行为体逐字如下：

```js
function(e, t) {                       // e = 可见项, t = 是否溢出
  e.style.visibility = t ? "hidden" : "";
  let r = e.getAttribute("data-tab-item");
  if (r) {
    let e = document.querySelector(`[data-menu-item=${r}]`);
    e instanceof HTMLElement && (e.hidden = !t);
  }
}
```

**它只切换 `visibility` 与 `hidden`，从不插入或生成菜单项节点**；行为在 `load`
与 `resize` 各跑一次，无注水时序问题。⇒ 点击 More 不产生任何新信息。

## 取证二：现网 SSR 结构（6 仓库实测）

抓取 `microsoft/vscode`、`nodejs/node`、`iina/iina`、`facebook/react`、
`torvalds/linux`、`kubernetes/kubernetes` 的仓库主页 HTML（另附 iPhone UA 对照，
SSR 与 UA 无关），对每栏分别计算：

- **A** = 现有直扫链（`nav.querySelectorAll("a[href]")` + 现有过滤规则）能取到的项
- **B** = 免点击预渲染读取（`[data-menu-item]` / `aria-controls` 目标）能取到的项

结果：

| 栏 | A | B | B 独有 | A 独有 |
| --- | --- | --- | --- | --- |
| `Repository`（vscode） | 16 → 归一 8 项 | 8 项 | 空 | 空 |
| `Repository`（node） | 14 → 归一 7 项 | 7 项 | 空 | 空 |
| `Repository files` | 3~5 项 | 0（无溢出容器） | — | — |
| `Global`（Marketing） | 61 项 | 59 项 | 空 | `pricing` |

**A ⊇ B，且"B 独有项"恒为空集。** 原因很直接：溢出项是
`li[data-menu-item][hidden] > a[href]`，`hidden` 挂在 `li` 上、**不在 `a` 上**，
而现有直扫只判 `a.matches("[hidden]")` —— 早就命中了。

附带发现：

1. 文件区栏现恒为 `data-overflow-mode="wrap"`，7 项全部外显、More 按钮常驻
   `display:none` → `docs/fixes/2026-09-19-files-more-portal-harvest-and-left-align.md`
   里的 body portal 收割链路在现网已成死代码。
2. `data-tab-item`（可见项）与 `data-menu-item`（菜单副本）**双向一一对应**
   （8=8 / 7=7），可作同一 tab 的精确匹配键，替代 `normLabel` + `destOf` 双启发式。

## 结论

点击收割零净收益，却要付全部副作用成本。主路径改为零点击读取，点击降级为兜底。

## 修复内容

1. **新增 `readPrerenderedBarItems(bar)`** —— 零点击读取本栏预渲染项，两类来源：
   - ① 本栏 `[data-menu-item]` 锚点（溢出副本，与可见项 `data-tab-item` 配对）；
   - ② 本栏触发器 `aria-controls` 指向的下拉容器，**仅当它位于本栏之外时**补取
     （覆盖"菜单被渲染到 nav 之外"的登录态头部 `react-partial` / ActionMenu）。
2. **新增点击闸门** —— `collectRepoHomeNavItems(navList, harvestedByBar, statsOut)`
   增加出参，统计每栏"零点击即可取到"的项数（`Map<barKey, count>`）；某栏 `>0`
   即视为已覆盖、永久退出点击流程。闸门接入五处：`navDockHasPendingTrigger`、
   `navDockEarliestRetryAt`、初次收割循环、`hasUndecided`、`missedBars`。
3. **新增 `isDockEligibleBar(bar)`** —— 页脚与全局 Marketing 头部栏既不索引也不
   允许点击，被 `collectRepoHomeNavItems` 与四处闸门共用。不这么做的话，非 dock
   栏因"没有 zeroClick 计数"会被闸门漏放触发器。
4. **点击路径降级为兜底** —— `harvestMoreItems` 与滚动锁定、点击预算、重试窗口
   全部保留，但仅在"某栏零点击一项都取不到、且存在可见 More 触发器"时启用。
   现网 SSR 下该分支恒不触发。
5. 面板结构版本 `v11 → v12`，升级后旧面板强制重建一次。
6. 策略注释块（4283 起）与 `harvestMoreItems` 的注释同步改写，说明主/兜底关系。

### 为什么保留兜底而不是直接删除

登录态头部的 DOM 无法本地取证（无登录态 HTML，且本沙箱内 headless Chrome 直连
github.com 超时、`--proxy-server` 亦无效，只有 curl 可通）。若某未知结构把 More
项既不预渲染在 nav 内、也不用 `aria-controls` 指认，删除兜底会导致**功能回退**。
闸门条件足够严（本栏零点击项数为 0），保留它的成本只是若干 KB 代码。

## 验证

| 项目 | 结果 |
| --- | --- |
| `node --check Make-GitHub-Great-Again.js` | 通过 |
| `node tools/smoke-load.js` | **38/38 PASS**（原 34 项 + 新增 4 项） |
| `node tools/verify-harvest-sim.js` | **8/8 PASS**（点击兜底路径未破） |

新增 4 项为免点击改造的**决定性回归**（`tools/smoke-load.js` 场景 3b，
fixture `repoHomeHTMLResponsive()` 复刻现网真实结构
`.js-responsive-underlinenav` + `li[data-menu-item][hidden]`，且
**Wiki / Security / Insights 三项只存在于溢出副本里**、`UnderlineNav-body` 中没有）：

| 断言 | 结果 |
| --- | --- |
| 响应式标签栏场景加载无异常 | PASS |
| More 触发器一次都未被点击（`clicks=0`） | PASS |
| 溢出独有项 Wiki / Security / Insights 已进入面板 | PASS |
| 可见项与溢出副本去重后恰好 7 项、无重复 | PASS |

## 过程中修掉的两个真问题

1. **`ReferenceError: zeroClick is not defined`** —— 我最初把 `zeroClick` 用
   `const` 声明在 `try` 块内，而 `finally` 里要用它做重试排程的闸门判定；块级
   作用域跨不过 `finally`。已提升为函数作用域的 `let`（与既有 `navBars` /
   `session` 同一坑）。冒烟测试首轮即抓到，未流出。
2. **`tools/verify-harvest-sim.js` 自 2026-09-19 起一直是崩的** —— 它按名抽取
   函数源码后在沙箱里重建，但漏抓了 `navDockAnchorLabel`、`HTMLElement`、
   `lockPageScrollForHarvest` / `unlockPageScrollForHarvest`、
   `harvestMoreItemsLocked`。补齐后 8/8 PASS；另打桩 jsdom 缺失的
   `window.scrollTo` 以消除噪音。

## 已知限制

- 登录态头部的 More 项结构仍未取证。可运行文档
  `2026-09-21-nav-dock-clickless-harvest-feasibility.md` 末尾的控制台探针，
  把输出回传确认；若头部既非预渲染在 nav 内、也无 `aria-controls`，闸门会
  自动放行到点击兜底分支，行为与改造前一致。
- `update_log_en.md` 停留在 `v3.5 [2026-03-23]`，与 `update_log.md` 的
  `v2026.10.x` 系列早已脱节（属既有问题，本次未动）。

## 回归命令

```bash
node --check Make-GitHub-Great-Again.js
node tools/smoke-load.js
node tools/verify-harvest-sim.js
```

## 回滚

```bash
git reset --hard 8772c63
```
