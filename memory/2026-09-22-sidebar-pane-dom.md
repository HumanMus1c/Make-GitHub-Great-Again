# MGGA 工作日志

## 2026-09-22 侧栏 PaneWrapper 归属取证（无代码改动）

- 用户问：`Releases (53)`、`Sponsor this project`、`Deployments`、
  `Contributors (180)`、`Languages` 等在**移动端**是否位于容器
  `#repos-split-pane-content > div > div > div > div.prc-PageLayout-PaneWrapper-pHPop.pr-2` 内？
- 结论：**是，且桌面/移动结构逐字相同**（层数恰好 4、逐层 div）。移动端唯一差异是
  `About` 带 `hide-sm hide-md`（<lg 隐藏）。选择器在 SSR / 注水×双视口 / 真实 Chrome
  双视口共 5 种场景全部命中 1 次、深度均为 4。
- **"移动端是另一套 DOM"的假设被证伪**：桌面 UA vs iPhone UA 抓同一 URL，响应体仅差
  309 B，首个差异在 @26007 的 `<meta name="fetch-nonce">` 随机 UUID；响应式全靠 CSS。
- 结构真相取自 GitHub 自己的 bundle `code-view-*.js`（587 KB）：PaneWrapper =
  `PageLayout.Pane({position:"end", className:"pr-2"})`，内含
  `CodeViewSidebarLayout`（`borderGrid`），11 个侧栏边界按固定顺序渲染，
  顺序 = cta → about → releases → sponsors → deployments → packages → usedBy →
  contributors → languages → templateRepository → suggestedWorkflows。
- 开关实测（≈30 仓库）：iina `releases:{releaseCount:53,tagCount:73}`、sponsors=true、
  deployments=false、packages=false、usedBy=true、contributors=true、languages=true。
  `deployments` 抽样全 false。
- `(53)`/`(180)` 来源：`h2 > headingLinkWrapper > [a"Releases", span.CounterLabel"53",
  span.prc-VisuallyHidden"(53)"]` —— 括号是读屏副本，`textContent` = `"Releases53 (53)"`。
- 新发现接口：`GET /{owner}/{repo}/_sidebar`，**必须 `Accept: application/json`**
  （无 Accept → 400，text/html → 406）；返回 `contributorCount:180` 等，与页面一致。
- 关键工程含义：侧栏区块**不是 `<nav>`**（nav 恒 4 个，PaneWrapper 内 0 个）⇒
  `findRepoHomeNavBars()` 永不收录侧栏；若要接入需新增侧栏来源，且必须挂在注水后。
- **本机联网能力解锁**（推翻旧结论）：curl 的 SSL error 35 是
  `CRYPT_E_NO_REVOCATION_CHECK`，绕过吊销检查即可；`NODE_TLS_REJECT_UNAUTHORIZED=0`
  让 node fetch 直连 github.com 返回 200，Chrome/puppeteer 加
  `--ignore-certificate-errors` 可抓注水后 DOM。真机验证不必再推给用户。
- 踩坑：`content.querySelector("#repos-split-pane-content > …")` 因选择器以自身 id 开头
  恒 0 命中，一度误判"注水后结构变了"；用 `document.querySelector` 才对。
- 交付：`docs/fixes/2026-09-22-sidebar-pane-dom-evidence.md`；
  新探针 `tools/probe-sidebar-pane.js`（双视口真实浏览器）+ 产物
  `tools/probe-sidebar-pane.json`。无主脚本改动、无版本号变更。
- 快照：06f868e（写入本记录前）。
