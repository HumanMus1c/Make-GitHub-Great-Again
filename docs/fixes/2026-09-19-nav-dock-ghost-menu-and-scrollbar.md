# 2026-09-19 文件区 Contributing/License 收割与面板假滚动条

## 需求

1. 文件区栏(`OverviewRepoFiles-module__Box_3 > nav > ul`)的 Contributing
   与 License 项(在 More 下拉内)仍未收割进面板。
2. 面板高度未顶到屏幕上下端,却已出现滚动条。

## 根因定位

1. **假成功收割(Contributing/License 缺失的主因)**:
   `findMoreMenu` 的全局兜底(`[role='menu']` 等)会抓到 React 关闭后仍
   挂载在 DOM 的隐藏旧菜单 portal。收割文件区栏时,预检抓到隐藏的标签条
   旧菜单 → 提取出"非空"条目 → 文件区栏被标记为已收割(实际条目是别的栏
   的,且大多已被去重吞掉)→ 永不重试。
2. **注水后才出现的栏不补收**:`missedBars` 只记录"扫描到但收割为空"的栏;
   文件区 nav 若在首轮扫描时尚未渲染,根本不会进入缺栏名单,后续永不补收。
3. **假滚动条**:面板 `overflow-y:auto` 使 `overflow-x` 计算为 auto,
   克隆锚点的 nowrap 长文本横向溢出;Windows 经典滚动条占位后又挤压
   内容宽度,表现为面板未到屏幕边缘就出现(纵+横)滚动条。

## 修改内容

1. 快照检查点 `1069ee7`。
2. **可见性过滤** 新增 `isVisibleMenu(el)`:非 `hidden`、computedStyle
   可见、有实际尺寸;`findMoreMenu` 全局兜底与 `harvestMoreItems` 等待
   路径均只接受可见菜单,假成功收割从源头消除。
3. **缺栏名单扩展**:
   - 扫描时无触发器(注水未完成)的栏进入 `missedBars`;
   - 补收轮次重试失败/仍空的栏留在名单,由下轮继续(每轮最多 2 栏);
   - 增量补扫:本轮出现但不在缓存、也不在缺栏名单的栏补入名单,
     消除"首轮时栏不存在 → 永不补收"。
4. **滚动条修复**:
   - 面板 `overflow-x: hidden`;
   - 条目行 `overflow: hidden` 兜底,nowrap 长文本不再横向撑开;
   - 克隆文本节点(`span[data-content]` / `span[data-component=text]`)
     `flex:1 + ellipsis`,先于计数器收缩;图标包装 span 不受影响。
5. 面板结构版本 v5 → v6 强制重建;版本 2026.10.1,update_log 同步。

## 验证

- `node --check` 语法通过(0 错误)。
- git diff 复查:isVisibleMenu 双接入点、missedBars 三处扩展(无触发器、
  重试失败回填、增量补扫)、CSS 四处(overflow-x、行溢出、文本 ellipsis、
  结构版本)与计划一致;补收仍为有界节奏(每轮 ≤2 栏),缓存命中不重复点击。
- 实机预期:文件区分组下 README 之后出现 Contributing/License(经 1-2 轮
  补收);面板内容不超宽,无横向滚动条,纵向滚动条仅在条目真正超过
  max-height 时出现。
