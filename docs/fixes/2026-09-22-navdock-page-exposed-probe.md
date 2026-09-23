# 2026-09-22 · nav dock：页面外露探测（外露即定位 / 收进 More 即跳 URL）

- **版本**：v2026.10.26
- **快照（回滚点）**：`4b6c90e28772b44c01ebb450307e01598f97a938`
  （`git reset --hard 4b6c90e` 可精确回退到改动前）
- **需求原话**：「增强导航栏的对 github 仓库页面上没有收纳进 More 中外露出来的项的
  探测，如果导航栏上的项在页面上依然存在没有被收纳折叠进 More 就直接定位而不是直接
  跳转 url。反之，如果导航栏上的项在页面被收纳折叠进了 More 则直接跳转对应 URL 不再
  立即定位。」

## 一、需求落点（与用户确认过的两个边界）

| 问题 | 选定 | 含义 |
| --- | --- | --- |
| 规则作用范围 | **仅"本页有落点"的项** | 文件区 tab、侧栏区块、当前页自身；跨页项（Issues / Actions / Releases…）保持一键导航 |
| 定位落点 | **页面上该项自身** | 点面板里的 Code → 滚到页面上 Code 那个入口；不再笼统"回内容区顶部" |

⇒ 分诊从"同页就滚回内容区顶部"升级为**二分诊**：

- 页面上这一项**外露** ⇒ 接管，定位到**它自身**，一次导航都不发（`via=page-item`）；
- 页面上这一项**已被收纳进 More** ⇒ 页面上没有可见落点，**不做任何定位**，放行这次
  点击让真实（Turbo / React 软）导航走完（`via=page-item-hidden`）。

## 二、实现：新增外露探测层

`navDockSourceVisibility(item)` → `{state, el}`，四类：

| state | 判据 |
| --- | --- |
| `detached` | 源锚点不在文档里 / 该条目根本没有源锚点（侧栏来源） |
| `gone` | 源锚点在文档里，但被 `[hidden]` 或 CSS（display / visibility / opacity）藏起来 |
| `more` | 已被**收纳进 More**：`isClippedNavItemAnchor` 命中（`<li aria-hidden="true">` 内唯一锚点），或几何上被单行 overflow 容器裁到栏外（`navDockClippingAncestor`） |
| `exposed` | 外露可见 |

几何判据加了 `cr.width && ar.width` 这道门：没有排版层时（jsdom、`display:none`）
两侧 rect 都是 0，"无交集"是假象而非剪裁证据，必须跳过、交给属性与样式判据。

探测是**点击时实时**做的，不依赖面板重建 —— 所以"窄视口下剪裁状态变化不改 href、
廉价签名不变、面板不重建"这条已知特性不会影响判定。

## 三、真机取证（本机 Chrome + puppeteer，`--ignore-certificate-errors`）

新增：验证工具在闭包出口前把判定函数挂到 `window.__mggaProbe`，**直接调用真实函数**
取真值（比肉眼判断可靠，也能证明判定不是恒值）。

页面 nav 入口可见性统计（同一份代码、只改视口）：

| 仓库 / 视口 | exposed | more | gone | 被折进 More 的样本 |
| --- | --- | --- | --- | --- |
| iina 1280 桌面 | 79 | 0 | 8 | — |
| iina 400px 移动 | 18 | 0 | 69 | — |
| iina 320px 移动 | 16 | **2** | 69 | `Contributing`、`License` |
| vscode 1280 桌面 | 21 | 0 | 68 | — |
| vscode 400px 移动 | 17 | **3** | 69 | `Contributing`、`MIT license`、`Security` |

`gone` 的大头是 Global 头部与 `li[data-menu-item][hidden]` 溢出副本，符合预期。
⇒ 判定确实**有区分度**（不是恒值），且剪裁样本与 `probe-mobile-more-structure.js`
早先的 320px 结论一致。

点同页 Code（面板里唯一一条 `page-item`）：

```
INFO  2.0 页面上 Code 入口的可见性判定：exposed,gone
PASS  2.2 点 Code：目标吸顶（y==top 且 elTop≈0）  via=page-item top=132 y=132 off=0 elTop=0 inner=0
PASS  2.3 点 Code：走 page-item 分支  via=page-item
```

## 四、一次被真机推翻的实现（**已回退，别再试**）

第一版把"收纳即放行导航"也套到了路径 3（文件区概览 tab：License / Contributing /
`MIT license`）。真机立刻证伪：

```
FAIL  3.1 点 MIT license：无整页重载（放行导航，允许换路径）
      docId=16058363578639023->4421299704736088
      url=/microsoft/vscode/blob/HEAD/license
```

`docId` 变化 = **整页重载**。根因：文件区 tab 的 href 是 React 路由占位 `#`，面板上的
落地路径是 `resolveFileAreaTabHref` 从页面证据**反推**的，反推失败时用**兜底猜的文件名**
（`entry.names[0]` = `license`），而 vscode 的真实文件叫 `LICENSE.txt` ⇒ 落到不存在的
路径 ⇒ 301 ⇒ 整页重载。旧版之所以从没暴露，是因为它走"切 tab"（React 客户端路由），
**根本不用那个 href**。

⇒ 回退：路径 3 维持原样（无论是否被收纳都切 tab），并留一条断言把"别再套用放行规则"
钉住（`tools/smoke-load.js` 场景 3h-3）。

## 五、验证表

| 闸门 | 结果 |
| --- | --- |
| `node --check`（主脚本 + 2 个测试工具） | OK |
| jsdom 冒烟 `tools/smoke-load.js` | **69/69 PASS**（新增 3 条断言） |
| **红绿对照**：同一套断言喂修复前版本 `MGGA_SCRIPT=…prev-before-page-exposed.js` | **67/69**，红的恰是两条新能力断言（`elTop = -16`、`页面上已看不到这一项，却仍被接管定位`） |
| 真机 iina 400px 移动 | 28/29 |
| 真机 iina 320px 移动 | 28/29 |
| 真机 vscode 400px 移动 | 28/29（回退前该组 21/22，且带一次整页重载） |
| 真机 iina 1280 桌面 | **29/29** |
| 真机 vscode 1280 桌面 | **29/29** |

五组里唯一的 FAIL 都是 **8.1 跨页条目走软导航**：`via=pass-through` 说明脚本侧放行
正确，是页面侧没接住这次点击（URL 与 docId 都不动）。**该条为既有偶发** —— 修复前版本
`MGGA_SCRIPT=…prev-before-page-exposed.js` 跑真机同样 FAIL，且本文件的历史留档
（`live-d4` / `live-diag-iina-mobile` 等）多轮记录为"次次不同、重跑即过"。

## 六、未验证 / 已知风险

1. **同页项 + 折叠 ⇒ 放行导航**这条分支的真机样本尚未覆盖：320px 下 `Code` 仍被判为
   `exposed`（Repository 栏是换行溢出模式，More 常驻 `display:none`），所以真机上没触发。
   断言层面由 jsdom 夹具（`clippedCurrentTabHTML`）覆盖。
2. **跨页项（路径 5）**完全未改动，"点了 Issues 没跳"的既有偶发仍在（见验证表末条）。
3. 侧栏区块来源（`barKey=repo-sidebar`）无源锚点 ⇒ `detached`，行为不变（仍走跨页导航）。
   真机上面板里的 Releases / Contributors 等点下去仍是去对应页面。**若希望它们也走
   "页面上该区块外露就滚过去"，需要另开一轮**（本轮的探测函数已能直接复用它）。
4. 几何剪裁判据只认 `overflow-x` 为 `hidden`/`clip` 的祖先，且越不过自己的 `nav`。
   现网 Primer 的剪裁靠 `aria-hidden` 标记就已判准，这层是给"标记没了但确实被裁掉"兜底，
   五组真机里 `more` 数与 `probe-mobile-more-structure.js` 的口径一致。

## 七、改动清单

- `Make-GitHub-Great-Again.js`：`navDockClippingAncestor` / `navDockSourceVisibility` /
  `navDockSourceExposed` 新增；`handleNavDockItemClick` 路径 4 改为二分诊；`@version` → 2026.10.26。
- `tools/smoke-load.js`：`overviewFilesHTML({clipContributing})`；同页 Code 场景落点断言
  改为"页面上该项自身"；新增「收纳项 ⇒ 零定位、放行导航」与「文件区 tab 折进 More 仍切 tab」
  两条；旧断言 `内容区内部未归零` 随语义更新。
- `tools/verify-live-navdock.js`：支持 `MGGA_SCRIPT`（红绿对照）与 `--width`；新增 0.8 外露探测
  取证（探针直调内部函数）；`locateScenario` 支持"零定位 + 放行后确实跳走"两种新断言；
  场景 2/3/4/5 按真实可见性打印期望来源。
