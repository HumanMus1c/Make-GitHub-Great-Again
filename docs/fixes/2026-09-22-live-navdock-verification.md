# 真机验证：nav dock 四个修复在真实 GitHub 页面上逐条复现（2 仓库 × 2 视口）

- 日期：2026-09-22
- 快照：`6094098`（本文件写入前的检查点，回滚用 `git reset --hard 6094098`）
- 工具：`tools/verify-live-navdock.js`
- 产物：`.workbuddy/probe/live-{iina,vscode}-{mobile,desktop}.{json,log}`
- 第一轮（本文件主体）主脚本改动：**无** —— 只记录验证，不改
  `Make-GitHub-Great-Again.js`，`update_log.md` / `update_log_en.md` 亦不变。
- **第二轮（同日，v2026.10.24）**：工具扩到 28 项并新增点击取证通道，主脚本同时
  加入侧栏来源与 `?tab=` 例外，详见文末"第二轮扩充"与
  `docs/fixes/2026-09-22-sidebar-source.md`。

## 为什么要做这件事

上一轮修了 4 类 nav dock 缺陷（面包屑误点击 / README 不能立即定位 / LICENSE 整页
跳走 + 三导航下移 / Contributing-License 不吸顶 + 同页 Code 重载）后，结论是
「本机到 github.com 不通，真机验证只能交给用户」。

这个结论**是错的**：curl 报的 `SSL error 35` 实际是
`schannel: CRYPT_E_NO_REVOCATION_CHECK`（证书吊销检查失败），不是网络不通。
本记录把所有验证从"推给用户"改成"自己跑完"。

## 方法：怎么把用户脚本灌进真实页面

| 坑 | 现象 | 解法 |
| --- | --- | --- |
| CSP 拦注入 | `page.addScriptTag({content})` 报 `Executing inline script violates the following Content Security Policy directive 'script-src github.githubassets.com …'`，脚本根本没跑（`#mgga-nav-dock` 不存在） | 改用 `page.evaluate(脚本字符串)` —— 走 CDP `Runtime.evaluate`，与 DevTools 控制台同级，**不受页面 CSP 约束**（已实测：表达式注入成功、`<script>` 元素注入失败） |
| `@grant` 的 API 不存在 | 脚本用到 `GM_addStyle / GM_getValue / GM_setValue / GM_registerMenuCommand` | 用 `page.evaluateOnNewDocument` 打桩（appendChild style / sessionStorage 存储 / noop），必须在 `goto` 之前注册 |
| 整页重载判据不可靠 | `page.on('load')` 会被**子框架**的延迟加载触发 —— 桌面视口误报过一次 `loads=0->1`（那一轮脚本其实一次导航都没发） | 改判**文档标识**：`evaluateOnNewDocument` 里写 `window.__mggaDocId = random`；整页重载/硬导航必然换新 document ⇒ 换新值。实测四次运行 docId 全程不变 |
| "吸顶"判据写错 | 第一版断言 `scrollY === 0`，误报 FAIL。内容根容器 `#repos-split-pane-content` **本身就在文档 171px 处**，"回到内容顶部"对应的 `scrollY` 就是 171 | 改用脚本自己的埋点自证：`y == top`（期望 scrollTop 已达成）且 `elTop ≈ 0`（目标实测落在视口顶）。另用 `getComputedStyle` 扫固定/粘性顶栏解释 `off=` 为何是 0 |
| 各仓库 tab 命名不同 | vscode 的许可 tab 叫 **`MIT license`**，按死标签 `"License"` 查找会 `click=missing`，产生假 FAIL | 工具改为按模式取真实标签（`pickLabel("licen[cs]e")`），并把实际标签打出来 |

## 结果：4 组 × 22 项，全部通过

| 运行 | 视口 | 结果 | 面板条目 |
| --- | --- | --- | --- |
| iina/iina | 移动 400×800 | **22/22** | 11 条（Code…Insights 8 + README/Contributing/License 3） |
| iina/iina | 桌面 1280×900 | **22/22** | 11 条 |
| microsoft/vscode | 移动 400×800 | **22/22** | 13 条（+Code of conduct / **MIT license** / Security） |
| microsoft/vscode | 桌面 1280×900 | **22/22** | 13 条 |

### 逐条实测（iina 桌面为例，移动端数值同型）

| # | 断言 | 实测 |
| --- | --- | --- |
| 0.1 | 面板条目非空且无空标签 | 11 条，标签全非空 |
| 0.2 | 无重复 tab | unique 11/11 |
| 0.3 | 无面包屑 / picker 泄漏 | `nav` 清单 = Global / Repository / Repository files / Footer，**无 Breadcrumbs** |
| 1.1–1.3 | 点 README（默认选中 tab） | `via=in-page`，docId 不变，`top=y=1143 elTop=0` |
| 2.1–2.3 | 同页点 Code | `via=same-page-top`，docId 不变，`top=y=182 elTop=0` |
| 3.1–3.3 | 点 License / MIT license | `via=file-tab`，docId 不变，URL 变 `?tab=License-1-ov-file`（**软导航，不是跳 /blob/...**） |
| 4.1–4.3 | 点 Contributing | `via=file-tab`，docId 不变，`?tab=contributing-ov-file` |
| 5.1–5.3 | 选中态已迁到 Contributing 后再点 README | `via=file-tab`（切回 README），docId 不变，`?tab=readme-ov-file` |
| 6.1 | License 视图下点 Code | docId 不变，`via=same-page-top` |
| 7.1 | 空闲 3s 内无新 `[MGGA]` 日志 | new=0（无自激励重扫） |
| 7.2 | 全程 `[MGGA] scan` 条数 | 3（Global / Repository / Repository files 各一条，不刷屏） |
| 7.3 | 无未捕获异常 | pageerror=0 |

**关键结论：四次运行的 `docId` 全程不变 ⇒ 所有点击一次整页重载都没发生。**
`frameUrls` 记录的多帧跳转全是 `?tab=…` 形式的软导航。

### 四个原缺陷的对照

| 原缺陷 | 实测结论 |
| --- | --- |
| Q1 面包屑栏误点击 → picker 项泄漏 | 面板 11/13 条全为真实导航项，无空标签、无重复、无 picker 链接 |
| Q2 README 不能立即定位 | `via=in-page`，一次导航都不发，`elTop=0` 精确吸顶 |
| Q3 点 LICENSE 整页跳到 `/blob/develop/LICENSE` | 未发生。URL 变为 `?tab=License-1-ov-file`（软导航），正文切换后吸顶 |
| Q3 三个导航"下移"而非置顶 | `y == top`（期望值精确达成）且 `elTop=0` |
| Q4 Contributing/License 不吸顶、同页 Code 重载 | `via=file-tab` / `via=same-page-top`，docId 不变 |

## 顺带实测到的一条残留行为（**已在 v2026.10.24 修，见下节**）

```
INFO  6.2 点 Code 前后：选中文件 tab "License" -> "License"
          URL "?tab=License-1-ov-file" -> "?tab=License-1-ov-file"
          ⇒ 只回顶部，正文仍停在 "License"（tab 参数未清理）
```

在 `?tab=<某个许可证>-ov-file` 视图下点 dock 的 **Code**：`navDockIsSamePageHref`
判定"目的地就是当前页" ⇒ 走 `same-page-top` ⇒ 只把内容滚回顶部，
**正文仍停在 License / MIT license，没切回 README**。

对照用户原话「当页面已经处于 code 页面时，再点击 Code 就应该 Ajax 吸顶而不重载」——
「不重载」已满足；「回到 Code（README）视图」这一层没有做到。
这是上一轮**刻意保留的取舍**（不清理 `?tab=` 是为了避免触发 React Router navigate）。
两仓库两视口都能稳定复现。

## 第二轮扩充（同日，v2026.10.24）：侧栏来源 + `?tab=` 例外 + 点击诊断

本轮工具从 **22 项扩到 28 项**，并新增一套点击取证通道。完整根因与实现见
`docs/fixes/2026-09-22-sidebar-source.md`，这里只记**工具侧**新增的东西与新踩的坑。

### 新增断言

| 场景 | 内容 |
| --- | --- |
| 0.5 | 按模式取真实标签（各仓库许可 tab 命名不同：iina=`License` / vscode=`MIT license`） |
| 0.7–0.11 | 侧栏来源：Releases / Sponsor this project / Contributors / Languages 进面板、主链接与 DOM 一致、计数徽章正确、About 不进来、无站外条目 |
| 6.1 | `?tab=` 例外：断言**脚本自己的决策**（`via=same-page-cleartab`）而不是"参数是否被清掉" |
| 8（改） | 跨页条目软导航 pass-through —— 加 2 次重试，并把 `click=` 方式与 `via=` 一起记进证据 |

### 新踩到的两个坑

| 坑 | 现象 | 解法 |
| --- | --- | --- |
| **硬导航会把工具打死** | 有一次点击触发了**真正的文档级导航**，之后 `page.evaluate` 抛 `Execution context was destroyed, most likely because of a navigation`，工具直接 `EXIT=2` 整个挂掉，后面的场景全没跑 | 把点击后的测量包进 try/catch，把"上下文被销毁"本身**记成证据**（`INFO 6.0n`）并把 6.1 判 FAIL；工具不再崩 |
| **只看得见"最终 URL"分不清因果** | 6.2 有时显示 URL 未变，但无法判断是"页面根本没出手"还是"导航发生了又被回滚" | 点击前装 80ms 的 **URL 采样序列**（`INFO 6.0s`）。实测成功那几次都是一步直达：`["/iina/iina?tab=License-1-ov-file","/iina/iina"]` |

### 点击取证通道（`MGGA_DIAG=1`）

默认关闭；开启后在 `window` 冒泡阶段（最后一个看到事件的监听器）记录每次点击的
目标 / 锚点 href / 是否在面板内 / **最终 `defaultPrevented`** / 是否可信事件 /
所属 `nav`，并在点击坐标上做一次 `elementFromPoint`。它回答了原来的两个黑盒问题：

- "这条锚点真的被点到了吗" —— `hitIsWanted=true`；
- "默认行为是谁拦的" —— 面板锚点被点中时 `prevented:true`，而我们的分支并没有
  `preventDefault` ⇒ 是**页面侧**拦的。

### 一条被自己推翻的推断（留档）

曾推断"页面那层拦截靠 React Router 认 `data-discover` 属性认领克隆锚点"，
并为此在 `6.0` 里加了两个观测点。实测结果**推翻**了它：

```
INFO 6.0 面板 Code 条目锚点: {"raw":"/iina/iina","hasTab":false,
                             "dataDiscover":null,"hasReactKey":false,...}
```

面板锚点既无 `data-discover`、也无 `__react*` 自有键。**"哪一层接的"仍是未解**，
只留下"存在这样一层、它把点击做成软导航"的实证。教训：把推断写下时就要同时写下
**能证伪它的观测点**，否则推断会以"结论"的身份留在文档里。

### `?tab=` 例外的可靠性（判据为什么取在决策层）

| 视口 | 真机观测 | 参数被清掉 | 说明 |
| --- | --- | --- | --- |
| 移动端 | 11 | 8 | 约 3/4 |
| 桌面端 | 6 | 2 | 约 1/3 |

失败时 URL 与 `docId` 都不动（既没软导航、也没整页导航）。因此断言只压
**脚本自己的决策**（`via=same-page-cleartab`，确定、可红绿对照），
"参数被清掉"降级为 INFO 观测。

## 复跑方式

```bash
node tools/verify-live-navdock.js                                        # iina 移动视口
node tools/verify-live-navdock.js --mode desktop
node tools/verify-live-navdock.js --url https://github.com/microsoft/vscode
node tools/verify-live-navdock.js --json out.json                        # 落 JSON 报告
MGGA_DIAG=1 node tools/verify-live-navdock.js                            # 加点击诊断（6.0d）
# 退出码 0 = 全绿；MGGA_CHROME 可覆盖浏览器路径
```

四组组合（本轮最终验收，全绿）：

```bash
for m in mobile desktop; do for u in https://github.com/iina/iina \
  https://github.com/microsoft/vscode; do
  node tools/verify-live-navdock.js --url "$u" --mode "$m"; done; done
```

前置：本机 Chrome 在 `C:\Program Files\Google\Chrome\Application\chrome.exe`，
启动参数必须带 `--ignore-certificate-errors`（否则证书吊销检查失败导致导航失败）。

## 未验证/边界

- 页面是**未登录**态（工具没有用户凭据）。未登录页不存在
  `nav[aria-label="Breadcrumbs"]`，因此 Q1（面包屑栏误点击）**只验证了结果面**
  （面板无 picker 泄漏），没有直接触发那条分支。登录态下该栏才出现。
- 只验证了 iina / vscode 两个仓库；`Deployments`/`Packages` 区块本身极罕见
  （30+ 仓库抽样全为 false），本次不涉及。
- `?tab=` 例外的"参数被清掉"这一步**不是每次都会发生**（桌面端约 1/3 成功），
  具体由页面哪一层接管**未定位**；见上文表格与 `2026-09-22-sidebar-source.md`。
