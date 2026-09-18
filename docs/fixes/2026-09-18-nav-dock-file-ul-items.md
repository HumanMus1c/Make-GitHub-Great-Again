# 2026-09-18 修复文件区导航 ul 内条目未进面板

## 需求

文件区导航
`#repos-split-pane-content ... OverviewRepoFiles-module__Box_3 > nav > ul`
内部的项仍未进入悬浮导航面板。

## 事实核查(精确解析文件区 nav SSR)

- `nav aria-label="Repository files"` 内 `ul[role=list]` 实际只有 2 个 li:
  1. wrap spacer(`role=presentation aria-hidden=true`,空)
  2. README tab:`<a href="#" aria-current="page">`,文本在
     `span[data-content="README"]`
- More 按钮:`aria-haspopup=true aria-expanded=false`,文本
  "More items";下拉项由点击后 JS 渲染,SSR 不存在。
- 仓库标签条 Code tab:`href=/owner/repo data-selected-links=...`,
  无 aria-current。

## 根因定位

**pushItem 入口硬过滤**:`collectRepoHomeNavItems` 的 `pushItem` 第一行
`if (href === "#") return;` 把文件区 README tab(href 为 React 客户端路由
占位 `#`)在进入去重之前直接丢弃。上一轮虽然用 aria-current 放行了
`isBreadcrumbish` 判定,但锚点根本走不到那一步——两道过滤中入口那道更早。

## 修改方案

1. 快照检查点 `c30000a`。
2. `pushItem` 修复:`#` 锚点若 source 带 `aria-current`/`data-selected`
   选中态标记,放行并把 href 落地为 `location.pathname`(README tab 点击
   语义即停留在本页 README);无选中态的 `#` 锚点仍丢弃。
3. 清理编辑残留的无用 `anchors` 变量;其余过滤逻辑保持上一版语义。
4. 面板结构版本 v3 → v4,升级后旧面板强制重建;版本 2026.9.27。

## 验证

- `node --check` 语法通过(0 错误)。
- 逻辑单测(node -e,模拟真实 SSR 锚点属性):README tab 放行、owner 面包屑
  剔除、owner/repo 面包屑剔除、Code tab(data-selected-links)放行、
  Issues tab 放行,5 例全 PASS;isMoreLabel 对 More items/More 命中、
  README 不误伤。
- git diff 复查:pushItem 选中态放行 + href 落地、残留变量清理、
  STRUCT_VER、版本号四处改动与计划一致。
- 本仓库为纯用户脚本,无 release/debug 构建配置,以语法检查 + 逻辑单测 +
  diff 复查替代双构建验证。
