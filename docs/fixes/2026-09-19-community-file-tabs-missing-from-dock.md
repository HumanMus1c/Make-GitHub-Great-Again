# 修复记录：文件区社区文件 tab（License/Contributing 等）缺失

- 日期：2026-09-19
- 版本：v2026.10.3（面板结构版本 v8）
- 快照：30d7576（修复前）；修复提交见 git log

## 现象

移动端仓库主页悬浮导航面板始终缺少文件区导航的 License / Contributing / Code of conduct / Security 等条目。此前两轮修复（More 菜单 portal 识别、假成功收割过滤）均无效。

## 真机取证方法

使用 puppeteer-core 驱动本机 Chrome 无头浏览器，以 userscript 垫片（GM_* API + document-end 时机）加载完整脚本，对真实 GitHub 仓库页面做端到端验证与探针采样（tools/diag-navdock.js、tools/probe-filesmore.js、tools/anchors-probe.js）。

## 根因（证据链）

1. 新版文件区 nav（aria-label="Repository files"）使用 data-overflow-mode="wrap"：More 按钮（MoreButtonContainer 内）常驻 display:none，永不展开 —— "点 More 收割"链路在此 nav 上无从触发（探针实测点击无任何状态变化）。
2. License/Contributing/Code of conduct/Security 以 React 客户端路由 tab 直接渲染在 nav 内：href="#"、无 aria-current（README 除外）、无 aria-controls；真实路由（如 /owner/repo/blob/main/LICENSE）仅存在于内嵌 React flight 数据（"tabName":"License","path":"LICENSE","refName":"main"）。
3. collectRepoHomeNavItems 的两道过滤（isBreadcrumbish 与 pushItem 的 href==="#" 分支）将"无选中态的 # 锚点"判为无导航意义占位符丢弃 —— 社区文件 tab 从未进入面板，与收割流程无关。

另：本仓库（Make-GitHub-Great-Again）自身没有 CONTRIBUTING.md/LICENSE，GitHub 不渲染对应 tab；此前在该仓库上测试必然复现"缺失"。

## 修复内容

1. 新增 resolveFileAreaTabHref(tabLabel, ownerRepo)：
   - 白名单：license/licence、contributing、code of conduct、security、citation、readme，以及 "MIT license"/"Apache-2.0 licence" 等许可证类型前缀文案（尾 token 匹配，isFileAreaTabLabel 供两处共用）。
   - 证据链解析落地路径：① 页面已有 /blob|/tree/<名> 锚点（文件列表/侧栏）；② 内嵌 flight 数据的 tabName + path + refName；③ 社区文件约定名 + blob/HEAD 兜底。
   - 解析失败返回 null，仍按占位符丢弃，不引入假条目。
2. collectRepoHomeNavItems 放行白名单占位 tab：isBreadcrumbish 不再误杀；pushItem 对其解析真实 href；按 label 缓存解析结果。
3. 窄视口下 GitHub 隐藏（li[hidden]）的社区文件 tab 保留进面板：换行模式下这些项在页面上没有任何入口，面板补充导航正是其价值。

## 验证（真实 Chrome 端到端）

| 场景 | 结果 |
| --- | --- |
| react/react 桌面 1280px | Code of conduct、Contributing、MIT license、Security 全部入面板，路径均正确（blob/main/…） |
| react/react 移动 400px | 同上 5 项全收（GitHub 隐藏 li 的放行生效） |
| HumanMus1c/DeepLX 移动 | License 入面板，href=/HumanMus1c/DeepLX/blob/main/LICENSE |
| HumanMus1c/Make-GitHub-Great-Again 移动 | 无假条目（回归干净，9 项与修复前一致） |
| node --check | 通过 |

注意：facebook/react 现已 301 至 react/react，测试中出现的 /react/react/… 路径为正确落地路径。

## 回滚

git reset --hard 30d7576
