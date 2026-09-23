# 2026-09-23 · 整体删除「修正仓库头按钮溢出」（含面板开关与菜单项）

- **日期**：2026-09-23
- **触发**：用户两问一决 ——
  ①「为什么 Release 页的设置面板多了一项『修正仓库头按钮溢出』功能？」
  ②「这项功能难道不是应该默认生效的吗？所以这个设置项存在的意义是什么？」
  ③ 拍板：**彻底删掉这个功能**（备选方案里的「保留功能只删开关／保留现状只修 off 不彻底」均未采纳）。
- **取证**：`.workbuddy/probe/diag-header-btn-fix-value.js`（真机探针，桌面 UA 与移动 UA 两档 ×
  480/760/1280 三视口；原始数据 `header-btn-fix-value.json` / `header-btn-fix-value-mobile.json`）＋
  `tools/smoke-load.js`（新增删除闸门）＋ `tools/verify-live-navdock.js`（主回归）。
- **状态**：**已落地**。回滚点 `git reset --hard ebb88f3`（tag `snapshot-drop-repo-header-fix-20260923`）。
- **版本号不变**（沿用 `2026.9.23`，按用户既定要求不再改号）。

## 1. 结论

这个补丁**今天已经完全不起作用**：它靠 `!important` 覆盖 GitHub 私有类名（`.show-whenNarrow` /
`.tmp-mb-3` / `.d-flex.gap-2` / `HeaderContent`）+ 往 DOM 打内联样式，而今天 GitHub 的仓库头
**三个作用点选择器一处都不命中**，开关开/关两档量到的几何**逐字相同**，原始症状（Sponsor 顶出主列、
文档被撑宽、右侧空白列）**不再出现**。⇒ 删除零代价，删掉的是一段恒不生效的死补丁 + 一个没有
「偏好」含义的开关（关掉它 = 把旧 bug 放回去，正常人不会这么选）。

顺带定性：它出现在 Release 页设置面板里并不是错配 —— `.color-picker-dialog` 是**全站唯一一份**设置
对话框（`buildSettingsDialogHTML` 纯函数、单调用点、无按页分支），按页分档的只是**入口**
（`createFloatingButton()` 在非 Release 页直接 return，非 Release 路径还会主动 `remove()` 掉已开的面板）。
所以「Release 页多了一项」的真实观感来源是：面板装的是全局开关，而该功能的**作用对象不是 Release 页内容**
（另外几行都是资产行配色 / 图标 / 文件名高亮），它是那一组开关里唯一的异类。

## 2. 真机证据（iina/iina）

**桌面 UA**：

| 目标页面 | 视口 | `.show-whenNarrow` | 行级选择器 `.show-whenNarrow .d-flex` | `.tmp-mb-3` | `header .d-flex.gap-2.tmp-mb-3` | 命中并打标的行 | 文档横向溢出 | Sponsor 右缘 / 主列右缘 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 仓库主页 | 480×900 | **0** | **0** | 7（但都不带 `.d-flex.gap-2`） | **0** | **0** | 0 | 203.22 / 480 |
| 仓库主页 | 760×900 | **0** | **0** | 7 | **0** | **0** | 0 | 203.22 / 760 |
| 仓库主页 | 1280×896 | **0** | **0** | 7 | **0** | **0** | 0 | 1163.22 / 1280 |
| Release 页 | 480×900 | **0** | **0** | 49 | **0** | **0** | 0 | 230.92 / 480 |

**移动 UA 仿真档**（iPhone UA + `isMobile` + `hasTouch` + dpr 3，480×900，仓库主页与 Release 页各一遍）：
与上表 480 档**逐字相同** —— `.show-whenNarrow` 0、三个作用点选择器 0、横向溢出 0、开/关几何相同。
（这一档是为排除「桌面 UA 下 GitHub 压根不输出该工具类」这个解释而补的。）

**开 / 关两档对照**（同一个脚本，只改 GM 存储里该开关的初值）：全部四个目标上，
按钮行几何、Sponsor 位置、`documentElement.scrollWidth` **逐字相同**
⇒ 该开关今天连一次实际差异都产生不了。

**唯一还能命中的是容器层**：CSS 六组规则里，只有首组的 `header` / `[class*="HeaderContent"]`
在仓库主页各命中 1 个元素（Release 页 0 个），但那一组只声明 `max-width/min-width` 兜底，
既不改 `flex-wrap` 也不改按钮收缩，实测开/关几何无差 ⇒ 无实际作用。

## 3. 删了什么

| 位置 | 内容 |
| --- | --- |
| i18n 字典 | `mobileFix` 键（中英） |
| 设置面板模板 | 一整条 `.color-picker-row`（开关按钮 + 文案）⇒ 面板开关行 6 → **4** |
| `bindFeatureToggleButtons` | 该开关的 `bindToggle` 一行；注释由「三个功能开关」改「两个」 |
| 油猴菜单 | `GM_registerMenuCommand(GM..., 翻转存储 + 重应用)` 整条 ⇒ 菜单项 7 → **6** |
| 实现区 | 整套 200 行：样式注入器、行布局打标器、80ms 去抖、20×250ms 兜底轮询、头部 MutationObserver、观察器拆除、开关读取器、总入口函数 |
| 初始化 | 初始调用 + `DOMContentLoaded` 分支 + 两个视口事件监听（**悬浮导航自己的那两个监听保留**） |
| SPA 导航 | `handleSpaNavigation` 里的重新应用调用 |
| 文档 | `README.md` / `README_en.md` 各删一条功能条目 |

删除用**行界断言脚本**执行（不是手抄 200 行 old_string）：删前逐条校验 13 个边界锚点
（段首注释、常量、两个函数首行、`rows.forEach`、段尾 `}`、后续空行与两个待保留的悬浮导航监听）
全部命中才动手，`8068 → 7862` 行。

## 4. 删除后的判据（已进冒烟）

新增闸门「仓库头按钮溢出修正：整套实现 + 面板开关 + 菜单项已整体删除」：

- 源码全文不含 18 个标识符（含 `tmp-mb-3`、存储键、样式表 id、DOM 打标属性）——
  **注释里也不许留**（写在「已删除」注释里的标识符会让 grep 型检查继续命中，等于没删干净，
  这是 §1.4 那次踩过的坑）；删除处在源码里只留一段**中文描述**的说明。
- 运行期：不注入样式表、不给 `<html>` 加修正类、不往按钮行打标。
- 源码切片：设置面板模板里 `.color-picker-row` 恰好 **4** 条。
- 菜单命令恰好 **6** 项。

**闸门里刻意不拿 `.show-whenNarrow` / `HeaderContent` 当判据**：悬浮导航仍在用它们做
「排除 GitHub 窄屏 chrome」的反向过滤（`[class*='HeaderContent'], [class*='show-whenNarrow']`），
那是正当引用 —— 第一版把它们列进「全文不含」清单，属于自伤。

## 5. 未验证 / 风险

- **真机手机没测**：本次用 headless Chrome + iPhone UA 仿冒，不是 iOS Safari / Android Chrome 真设备。
  原 bug 当初是在手机上被报告的，严格说没在真机上确认过「今天手机也不出现」。
- **只测了 iina/iina**：不同仓库仓库头按钮集合不同（例如无 Sponsor 的仓库），未逐仓验证。
- **GitHub 若在某些形态下仍输出 `.show-whenNarrow`**（SSR 骨架态、A/B 变体、或将来回滚设计），
  历史症状会复现 —— 但那是 GitHub 侧行为，删掉补丁只是回到原生布局，脚本不再牵涉。
- **存储键残留**：老用户的 Tampermonkey 存储里仍留着 `mobileLayoutFix`，脚本已不再读取（无害）。
- 删除后**没有任何新行为**被引入，所以「回归风险」只在于删漏 —— 已由上述闸门 + 主回归覆盖。

## 6. 回归与回滚

- 离线：`node --check` 通过；`node tools/smoke-load.js` **90/90 PASS**（原 89 条，去掉 1 条开关断言、
  新增 1 条删除闸门）。
- 红绿对照：旧版（`ebb88f3`）跑新闸门 **89 PASS / 1 FAIL**，唯一那条 FAIL 正是本次新闸门
  （`该功能应已整体删除，仍残留：applyMobileLayoutFix`）⇒ 断言确实咬住了这次改动。
- 真机：`tools/verify-live-navdock.js`（悬浮导航主回归）。
- 回滚：`git reset --hard ebb88f3`。
