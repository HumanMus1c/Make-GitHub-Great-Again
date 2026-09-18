# 2026-09-18 悬浮导航条目净化与过渡动画对齐

## 需求

1. 去除面板前两个无关导航项(面包屑类 owner/owner+repo 链接)。
2. 补齐仓库文件区 nav(OverviewRepoFiles 内 UnderlineNav)的导航项。
3. 悬浮球→悬浮面板的显隐过渡与 Release 页悬浮按钮→设置面板对齐。

## 事实核查(抓取 SSR DOM)

用脚本抓取 github.com/HumanMus1c/Make-GitHub-Great-Again 的 SSR HTML:

- 文件区 nav `aria-label="Repository files"` SSR 内 0 个锚点,内容由 React
  注水后才出现 → 依赖既有"全域 nav 扫描 + 空结果重试 + body observer"
  在注水后补齐。
- 未登录头部 Marketing nav `aria-label="Global"` 含 61 个营销锚点,
  属非仓库导航。
- 面包屑/头部内指向 owner(`/:owner`)与仓库根(`/:owner/:repo`)的链接
  href 恰好命中仓库主页路径正则,是面板前两个无关条目的来源。

## 修改方案

1. 快照检查点 `a2533a3`。
2. **条目净化** `collectRepoHomeNavItems`:
   - 新增 `isBreadcrumbish(href)`:匹配 `/^\/[^/]+(\/[^/]+)?\/?$/`(owner
     或 owner/repo)、`#` 页内锚点、当前路径,命中即剔除;收割项同样过滤。
   - 跳过 `aria-label` 为 global/footer 的 nav 及 footer 内 nav;跳过 dock
     自身条目,防止面板关闭按钮等被再次索引。
3. **过渡对齐 Release 设置面板**:
   - 面板:初始 `opacity:0 + visibility:hidden + translateX(-100%)`,
     `.mgga-visible` 后 0.3s ease 滑入;`data-expanded` 语义保留。
   - 悬浮球:新增 `.mgga-dock-fab-hidden`(opacity 0 + margin-left 2em,
     0.4s ease),面板展开时右移淡出,与 Release 悬浮按钮被面板接管一致;
     过渡节奏(opacity 0.4s/margin-left 0.4s/background 0.2s)同源。
   - 面板新增标题栏(功能名)+ ✕ 关闭按钮,点击回调 `setNavDockExpanded(false)`,
     悬浮球随之淡入恢复;结构对齐设置面板 header。
   - 面板结构版本号 `data-mgga-nav-dock-ver="2"`,签名相同但结构版本不同的
     旧面板强制重建一次,避免升级后残留旧 DOM。
4. 版本 2026.9.25,update_log 新增条目。

## 验证

- `node --check` 语法通过(0 错误)。
- git diff 复查:过滤正则、nav 排除表、过渡三属性、FAB 隐藏类、标题栏、
  结构版本号六处改动与计划一致;`bindNavDockFab` 点击路径与菜单共用
  `setNavDockExpanded`,过渡类同步无遗漏。
- 本仓库为纯用户脚本,无 release/debug 构建配置,以语法检查 + diff 复查
  替代双构建验证。
