# 2026-09-22 移动端首帧初始化时「收纳进 More 的项」丢失（Primer UnderlineNav 剪裁项）

版本：v2026.10.25
快照检查点（回滚点）：`b5dbb8e`

## 用户报告

> 很好，现在导航栏已经有了我所需要的几个导航项，只不过，当脚本首次就在移动端页面
> 初始化时还是会仍然丢失收纳进 More（`#_R_1afl_`）的项。而其它栏收纳进 More 的项
> 却正常显示。

拆开成三条可验证的判据：

1. 只有**某一栏**的 More 折叠项丢失，其它栏（文件区 nav、营销头部 NavDropdown）正常。
2. 只在**首帧就在窄视口**初始化时发生。
3. 该栏的 More 触发器 `aria-controls` 指向的运行时 id 形如 `_R_1afl_`。

## 根因

取数链里这条规则**误杀**了"被剪裁的导航项"：

```js
// 隐藏包装元素（UnderlineNav wrap spacer 等）内的内容不索引
if (!isFileTab && a.closest('[aria-hidden="true"]')) return reject(a, "ariaHidden");
```

`[aria-hidden="true"]` 在这套 DOM 里承担了**两种完全相反**的语义，而规则只看其一：

| 语义 | 结构 | 应当 |
| --- | --- | --- |
| 装饰 / 重复包装层（wrap spacer、重复副本） | 空 `<li role=presentation>`；或含多锚点的包装 div | 剔除 |
| **剪裁项**：当前放不下、已折进 More 的导航项 | `<li aria-hidden="true">` 内**唯一**锚点 | **必须索引** |

## 取证链（三段，互相独立）

### ① 组件源码：溢出项仍在 DOM 里，只是被标 aria-hidden

`@primer/react@38.40.0`（`dist/UnderlineNav/UnderlineNav.js`、`UnderlineNavItem.js`）：

```js
const isOverflowing = useIsClipped(ref);          // IntersectionObserver，root = nav
UnderlineNavItemsRegistry.useRegisterDescendant(isOverflowing ? allProps : null);
...
<li className={...UnderlineNavItem} ref={ref} aria-hidden={isOverflowing || undefined}>
  <UnderlineItem as="a" href={href} tabIndex={isOverflowing ? -1 : undefined} ... />
</li>
```

More 菜单是 `ActionMenu.Overlay`，**只在展开时渲染**，里面那几份是同一批项的副本 ——
所以"剪裁项本体"才是唯一可靠的来源。可见性由 CSS 控制：`MoreButtonContainer` 的
`--UnderlineNav_moreButton-display` 由 `[data-has-overflow=true]` 切成 `flex`。

**版本对齐证据**：该版本 CSS 模块导出的类名与本地留档 SSR 逐字一致 ——
`prc-UnderlineNav-UnderlineWrapper-GWONT`、`prc-UnderlineNav-ItemsList-oj8gN`、
`prc-UnderlineNav-WrapSpacer--aLgz`、`MoreButtonContainer-Dnrq6`，
且 SSR 上带 `data-overflow-mode="wrap"` / `data-hide-icons-breakpoint="medium"`
（`data-overflow-mode="wrap"` 在该版本是硬编码）。即 GitHub 现网跑的就是这一支。

### ② 真机结构取证：真实页面上确实会走出剪裁分支

`tools/probe-mobile-more-structure.js`（新探针，逐栏量化"零点击可读"与"只能靠点击才拿到"）——
同一仓库 `iina/iina`，只改视口宽度：

| 视口 | 栏 | 锚点数 | 可见 | `aria-hidden` 祖先数 | 剪裁项容器数 |
| --- | --- | --- | --- | --- | --- |
| 400px | Repository files | 3 | 3 | 0 | 0 |
| **320px** | **Repository files** | 3 | 1 | **2** | **2** |

320px 下被剪裁的两项正是 `Contributing` / `License`，且都是
「`li[aria-hidden="true"]` 内唯一锚点」的形态，同时 `More items` 触发器出现。
⇒ 机制在**真机、真 Primer 构建**上复现。

### ③ 代码内史证：文件区那条白名单豁免，当年正是为同一现象加的

```js
// 文件区白名单占位 tab：即使 GitHub 在窄视口下隐藏了所在 li，也在 dock 中保留
const isFileTab = isFileAreaPlaceholderTab(a);
if (a.matches("[hidden]") && !isFileTab) return reject(a, "hidden");
```

文件区 tab 靠 `isFileAreaTabLabel` 白名单绕过了 `ariaHidden` 过滤，所以用户看到
"其它栏正常"；**仓库标签栏没有这条豁免**，于是整批丢。

### 为什么只在"首帧就在窄视口"时暴露

剪裁是**布局驱动**的，且改变的是 `aria-hidden` / `tabIndex`，**不改变 href**。
`navDockCheapSignature` 只统计栏内锚点 href ⇒ 桌面首帧加载后再缩小，签名不变、
下一轮走早短路、面板沿用桌面那次收好的条目，看起来"正常"；一旦别的原因触发重建，
同样会掉。首帧就在窄视口时，第一次构建读到的就已经是剪裁态 ⇒ 直接丢。

## 修复

`Make-GitHub-Great-Again.js`：

1. 新增 `isClippedNavItemAnchor(a, ariaHiddenHolder)`，判据三重收紧：
   - 最近的 `aria-hidden="true"` 祖先是 `<li>`（项容器，不是包装 div/ul）；
   - 该容器内 `a[href]` 恰好 1 个；
   - 那个锚点就是本锚点。
   带构建哈希的模块类名（`-syRjR`）不可依赖，故只用结构与 href 判定。
2. 直扫过滤改为：`ariaHiddenHolder && !isClippedNavItemAnchor(a, holder) ⇒ reject`。
3. 放行后仍走 `pushItem` 的同名 / 同目的地去重链，重复项不会因此泄漏。
4. 版本号 → `2026.10.25`。

**零点击设计不变**：剪裁项本来就在 DOM 里、href 完整，无需点开 More 取数
（真机断言 `clicks=0`）。

## 验证

| 项 | 命令 / 场景 | 结果 |
| --- | --- | --- |
| 语法 | `node --check`（主脚本 + 两个探针） | 通过 |
| 回归 | `node tools/smoke-load.js` | **67/67 PASS**（新增 5 条） |
| 红绿对照 | `MGGA_SCRIPT=.workbuddy/probe/prev-before-primer-clip.js node tools/smoke-load.js` | **FAIL 2**：`剪裁溢出项全部进入面板`（`Pull requests missing; got Code / Issues`）、`条数与去重正确`（收到 2 项而非 7 项）⇒ 断言命中真问题 |
| 反向闸 | 同场景内 `decorativeAriaHiddenNavHTML()`（多锚点包装 div、非 `<li>` 容器） | 两条 Decoy 均未进面板，规则未被放宽成"aria-hidden 一律放行" |
| 真机（移动） | `node tools/verify-live-navdock.js --mode mobile --url https://github.com/iina/iina` | **28/28 PASS** |
| 真机（桌面） | `node tools/verify-live-navdock.js --mode desktop --url https://github.com/microsoft/vscode` | **28/28 PASS** |

真机首跑出现过 `8.1 跨页条目走软导航` 单条 FAIL；对照留档
（`live-d4 / live-diag-iina-mobile / live-iina-desktop / live-vscode-mobile` 等）
该条**历史多轮同样偶发 FAIL**，且该场景源码注释已自述"实测 6 次里 2 次没触发"；
复跑同参数即 28/28。判定为既知偶发，与本次改动无关。

## 未验证 / 已知边界

- **未在登录态真机复跑**：用户报的那一栏（登录态新版 React 仓库头部）需要登录会话，
  本机无凭据。用于替代的最强证据是"同版本 Primer 组件 + 真机 320px 剪裁分支 +
  组件源码 + jsdom 红绿"四段闭合。**若登录态仍丢，下一步取证点是**：
  `[MGGA] nav dock: click decision` 日志里的 `bar=` / `ariaHidden=` 分桶计数 ——
  若某栏 `ariaHidden` 仍大于 0 且其触发器可见，说明有第二种剪裁形态（例如
  `hidden` 属性挂在锚点本身、或容器不是 `<li>`），届时按同一判据放宽。
- `isFileTab` 白名单豁免**保留**（与新的结构判据重复，但它是文件区 `href="#"`
  路由键解析的入口，删掉只会引入风险）。
- 反向闸只覆盖了两种装饰形态；多锚点 + `<li>` 容器这种组合未单独构造用例。

## 回滚

```bash
git reset --hard b5dbb8e
```
