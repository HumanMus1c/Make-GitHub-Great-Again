# 2026-09-18 导航条目图标兜底与计数器胶囊还原

## 需求

1. Security and quality、Insights 条目缺少 SVG 图标。
2. Issues / Pull requests / Security and quality 标签混入计数器文本且重复
   ("Issues1.8k (1.8k)"),且计数器缺少原处的胶囊样式。

## 根因定位

1. **图标缺失**:Issues/PR/Security 等 tab 的图标来自源锚点内的内联 svg,
   面板构建时 `item.source.querySelector("svg")` 命中;但 Security/Insights
   的源锚点在响应式布局下无 svg(或收割路径来源为 ActionMenu 项,菜单
   锚点本身无图标),一步回退都没有。
2. **标签污染**:GitHub tab 结构为 `文本 + 可见.Counter + 响应式替换计数器`,
   `textContent` 拼出 "Issues1.8k (1.8k)";收集时直接取整段文本,计数被
   并入标签,面板里又把它当纯文本渲染,读屏重复。
3. **胶囊丢失**:标签渲染用自定义 `mgga-nav-dock-label` span,原生的
   `.Counter` 胶囊元素从未被带入面板。

## 修改方案

1. 快照检查点 `b611498`。
2. **纯净标签提取** `navDockAnchorLabel`:克隆锚点后剔除
   `.Counter` / `[data-component=Counter]` / `.js-nav-count-replace` /
   `[class*=ounter]` 节点再取文本;收集处 `aria-label || navDockAnchorLabel(a)`。
3. **图标回退链**:源锚点 svg → 外层 li svg → 内置 octicon 路径映射
   (shield/graph/pull/issue/play/table/gear/eye/code,按标签关键词匹配)。
4. **计数器胶囊** `extractNavDockCounter`:优先克隆源锚点内的原生
   `.Counter`(同文档下 GitHub 原生 CSS 自动生效,胶囊样式保真);读不到
   时从标签尾部 "1.8k (1.8k)" 形式提取(计数器与文本紧贴无空白,正则
   不要求前置空白),重建 `.Counter` 并同步清理 item.label。
5. 构建顺序:计数器提取放在 title/aria-label/可见文案赋值之前,保证
   回退清理后三者一致。
6. 面板 CSS 仅补 `.Counter` 布局(不缩水、不换行),视觉样式交给原生。
7. 版本 2026.9.29,update_log 同步。

## 验证

- `node --check` 语法通过(0 错误);中途一次编辑误删面板序言,当场发现
  恢复并复检。
- 逻辑单测(14/14 PASS):纯净标签提取 4 例(Issues/Pull requests/
  Security and quality/README)、计数器回退提取 3 例(紧贴形式)、
  图标映射覆盖 7 例。
- 单测发现回退正则空白前置缺陷("requests97" 紧贴形式不命中),修正后
  全部通过。
- git diff 复查:CSS、纯净标签、收集调用点、图标回退链、计数器提取、
  构建顺序六处改动与计划一致。
