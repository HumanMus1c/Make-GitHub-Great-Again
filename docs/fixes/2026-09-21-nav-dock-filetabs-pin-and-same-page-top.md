# 修复记录：文件区 tab 切换后不吸顶 + 同页 tab 点击重载

- 日期：2026-09-21
- 版本：`2026.10.22` → `2026.10.23`（面板结构版本 `13` → `14`）
- 快照检查点：`e4d243d`（修复前，可 `git reset --hard e4d243d` 精确回滚）
- 提交：见本轮 commit

## 一、用户反馈

> 点击 README 导致不会下移，但是点击 Contributing 和 License 却会下移一段距离，
> 而不是和 README 一样吸顶。
> 并且当页面已经处于 code 页面时，再点击 Code 就应该 Ajax 吸顶而不重载。

两句指向两个**独立**缺陷：一个是文件区 tab 切换后的落点，一个是同页 tab 的点击行为。

## 二、缺陷 A：Contributing / License 切换后不吸顶（只有 README 会）

### 关键事实（决定性）

**`-ov-file` 从来不是元素 id。** 它是 GitHub `OverviewRepoFiles` 组件的
**React 路由键**，全库只出现在三处（证据取自 GitHub 自己的 bundle，
本仓库留存副本 `.workbuddy/probe/code-view.js`）：

```js
// ① nav 项的选中态比较值
"aria-current": "readme-ov-file" === ep ? "page" : void 0

// ② 切 tab 的真实实现：改 ?tab= 查询参数，并显式禁止滚动重置
N = (e, t) => {
  if (e.preventDefault(), ep === t) return;   // 点已选中的 tab 直接返回
  let n = new URLSearchParams(eu);
  n.set("tab", t);
  eh(n, { replace: !0, preventScrollReset: !0 })   // ← 组件自己就不想重置滚动
};

// ③ 侧栏 / 移动菜单的 hash 路由键
href: "#contributing-ov-file"          // 靠 hashchange 触发路由
```

以及 tabNames 列表（`f.push("contributing-ov-file")` 等）—— 全部是**字符串路由键**，
组件从未给任何元素挂 `id`。

真实页面探针逐仓库复核（`.workbuddy/probe/diag-locate.js`，跑在已保存的真实 SSR 上）：

| 仓库 | 路由键 | 目标元素存在 |
|---|---|---|
| iina/iina | `#readme-ov-file` / `#License-1-ov-file` / `#contributing-ov-file` | `false` / `false` / `false` |
| microsoft/vscode | `#readme-ov-file` / `#MIT-1-ov-file` / `#contributing-ov-file` / `#security-ov-file` | 全 `false` |
| kubernetes/kubernetes | `#readme-ov-file` / `#Apache-2.0-1-ov-file` / `#contributing-ov-file` / `#security-ov-file` | 全 `false` |

**8 个路由键，0 个元素。**

### 根因

上一版把路由键当元素 id 来等待：

```js
const findTarget = () => {
  if (hit && hit.id) { const el = document.getElementById(hit.id); if (el) return el; }
  return navDockFindOvFileElement(key);      // 找 id 以 -ov-file 结尾的元素
};
navDockScrollWhenReady(findTarget, 1500, onTimeout);   // 永远等不到 ⇒ 永远超时
```

于是两条路分岔：

- **README** —— 默认选中 tab（`aria-current`），`navDockInPageTarget` 走"已选中 →
  认领文件区正文块"分支，**拿到了元素** ⇒ 路径 2 立即定位 ⇒ 用户看到"吸顶" ✅
- **Contributing / License** —— 未选中，`hit.el === null` ⇒ 走路径 3，
  交还 React 原锚点把 tab 切成功（这部分一直是对的），然后**等一个永远不存在的
  元素**，必然 1500ms 超时 ⇒ **从不定位** ⇒ tab 切了、页面没动，
  相对 README 就是"下移了一段距离" ❌

### 修复

1. **完成信号改为"选中态迁移"**：栏内 `aria-current` 落到被点的那个 tab
   （`navDockFileTabSwitched` + `navDockBarSelectedKey`）。
   栏归属用 `item.source.closest("nav")` 取（面板条目持有原锚点，最可靠），
   回退才按 `aria-label="Repository files"` 找。
2. **定位目标改为"已渲染的正文块"**（`navDockFileTabLocateTarget` 三级兜底）：
   真存在的 `-ov-file` 元素（若有）→ `navDockOverviewArticleEl()`（文件区 markdown 正文）
   → `navDockContentRootEl()`。三仓库实测三者恒命中第二级：
   `markdown-body entry-content container-lg`。
3. **先立即吸顶一次，切换完成后再补一次对齐**：慢网络下（tab 切换要等路由数据）
   用户先看到反馈；切换落地后重新测量、把最终落点钉住，残余漂移由既有的
   1.2s 有界重定位（`navDockStartLocateReassert`）收尾，用户一动滚轮立刻收手。
4. 未注水（React 没接住点击）时，超时仍按旧策略**回放一次面板锚点自身**
   （交 Turbo 软导航），保持"可达性不低于改动前"。

日志可自证：`[MGGA] nav dock: locate "<label>" via=file-tab top=… y=… elTop=…`；
切换没确认到则是 `via=file-tab-await`。

## 三、缺陷 B：已在 Code 页时点 Code 会重载

### 根因

Code tab 的落地路径 `dest === location.pathname`，而旧版分诊的作用域判定是：

```js
if (!isFileAreaTabLabel(item.label) && !(hit && hit.id)) return false;   // ← 不接管
```

`isFileAreaTabLabel("Code")` 为 false（白名单是 license/contributing/readme/…），
`hit` 也是 null ⇒ **直接返回 false 不接管** ⇒ 点击交给浏览器/Turbo 做一次
**同 URL 导航**：重取整块页面内容、再把滚动归零。用户感知就是"重载"。

### 修复

新增路径 4：**落地路径就是当前页的条目，一次导航都不发**。

```js
if (navDockIsSamePageHref(item)) {
  event.preventDefault();
  logNavDockLocate(item, "same-page-top", "", navDockScrollToTarget(navDockContentRootEl()));
  return true;
}
```

- `navDockIsSamePageHref`：解析成 URL 后比 `pathname`（去尾斜杠），相对/绝对路径
  两种形态都吃；跨源一律不接管。
- 目标 `navDockContentRootEl()` = `#repos-split-pane-content`（实测三仓库均在）
  → `#repo-content-pjax-container` → `main`。
- **`navDockScrollElementToTop` 新增一层**：目标自身若就是滚动容器
  （`#repos-split-pane-content` 带 `tabindex="0"`，即 GitHub 的"键盘可滚区域"
  标记，**它自己就是滚动容器**），只对齐外框是不够的 —— 它内部还停在半路。
  现在连它自己的 `scrollTop` 一起归零，语义即"从该元素的开头显示"。

这一条对**所有**同页 tab 通用（Issues 页点 Issues、Pull requests 页点 Pull requests 同样受益），
不只 Code。

## 四、验证

| 项 | 结果 |
|---|---|
| `node --check` | PASS（纯用户脚本，无 release/debug 构建配置，用语法+逻辑+diff 三层验证替代双构建） |
| `tools/smoke-load.js` | **55/55 PASS**（新增场景 3g 文件 tab 吸顶 3 项 + 3h 同页 tab 2 项） |
| 红绿对照 | 旧版（快照 `e4d243d`）喂同一套断言 ⇒ **3 项 FAIL**：<br>① Contributing 切换后 `scrollTo` 调用序列为空（**旧版从没定位过**，正是用户反馈）<br>② License 同上<br>③ 同页 Code 未被接管（会走同 URL 导航 = 重载） |
| `tools/verify-harvest-sim.js` | **10/10 PASS**（未回归） |
| 真实页面探针 | iina / vscode / kubernetes 三仓库：8 个 `-ov-file` 路由键**目标元素全为 false**；<br>三个 tab 全部分诊到 `file-tab`、定位目标恒为同一正文块；<br>Code → `same-page-top`，内容区根容器 `repos-split-pane-content` 均存在 ✅ |

新场景 3g 的夹具刻意**不含**任何 `-ov-file` 元素（与真实 SSR 一致），并在
切换回调里把正文的文档绝对坐标从 `2000` 改到 `3200` —— 断言"最后一次 scrollTo
是 3200 且 `elTop === 0`"，从而证明**切换后确实重新对齐过**（旧版此处调用序列为空）。

## 五、未验证 / 待确认

- **真机未验证**：本机网络到 github.com 不通（curl SSL error 35、node fetch failed），
  只能对已保存的真实 SSR 做端到端验证。
- 待确认：真机点 Contributing / License 后看控制台那行 `locate`：
  - `via=file-tab` = 切换被确认（理想）；
  - `via=file-tab-await` = 1.8s 内没探到选中态迁移 —— 此时**页面已按"立即吸顶"
    落在文件区顶部**，不会退化回旧行为；把该行发我即可据此收紧判定。
- 已知取舍：同页条目**不会**清除 URL 上的 `?tab=` 参数（清参数需要走 React Router
  的 navigate，那正是要避免的重载）。表现为"在 `?tab=license` 下标点 Code 会回顶部
  但内容仍停在 License"。这是一次显式取舍，不是遗漏。

## 六、回滚

```bash
git reset --hard e4d243d
```
