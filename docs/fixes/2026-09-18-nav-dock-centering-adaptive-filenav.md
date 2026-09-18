# 2026-09-18 悬浮球垂直居中、面板自适应、补齐文件区导航项

## 需求

1. 悬浮球未左侧垂直居中,应对齐 Release 悬浮按钮(top:50% 平移居中)。
2. 面板高度/宽度应随条目数自适应,且不允许超出屏幕。
3. 文件区 nav(`OverviewRepoFiles-module__Box_3 > nav > ul`)内部项仍未
   进入面板。

## 事实核查(抓取文件区 nav 完整 SSR HTML)

精确解析 `OverviewRepoFiles-module__Box_3` 内的 nav:

- `nav aria-label="Repository files"`,内部 `ul[role=list]` 含 wrap spacer
  li(`aria-hidden="true"`)与 README tab(`a href="#" aria-current="page"`,
  标签文本在 `span[data-content="README"]`)。
- More 按钮文本为 **"More items"**(`span>More` + visually-hidden
  ` items`),`normalizedText` 拼接后为 "More items"。
- 下拉面板项由点击后 JS 渲染,SSR 中不存在。

## 根因定位

1. **More 触发器识别失败(主因)**:`isMoreLabel` 用 `^more$` 精确匹配,
   "More items" 不命中 → 文件区 More 收割从不执行。
2. **README tab 被误杀**:`href="#"` 命中上一轮面包屑过滤;但它带
   `aria-current="page"`(真实 tab 标记)。同理仓库标签条 Code tab
   (`href=/owner/repo` + `data-selected-links`)也被误杀。
3. **悬浮球/面板定位**:FAB `bottom:74px`、面板 `bottom:128px` 固定锚定,
   非 Release 的垂直居中模式;面板宽度固定 300px,非内容自适应。

## 修改方案

1. 快照检查点 `0a6aa47`。
2. **isMoreLabel 前缀匹配**:归一化空白后按
   `/^(more|更多|더보기|もっと見る|mehr|plus|⋯|\.\.\.|more items)/i` 匹配
   且限长 16,验证 More/More items/more 命中、Codespaces/Code/Issues 0
   不误伤。node 单测正则行为后写入。
3. **条目过滤修正**:`isBreadcrumbish` 改为按元素判断,真实 tab 凭
   `aria-current` / `data-selected` / `data-selected-links` 选中态放行;
   `aria-hidden="true"` 包装层(wrap spacer)内锚点不索引;收割项仍按
   仓库根路径正则过滤。
4. **悬浮球垂直居中**:`left:1em + top:50% + translateY(-50%)`,对齐
   Release 悬浮按钮定位与缩进。
5. **面板自适应**:同锚点垂直居中;`width:fit-content`(min 220px/
   max 360px 与 80vw 封顶),`max-height:calc(100dvh - 1em)` 双写回退,
   超出内部滚动;条目 `white-space:nowrap` + ellipsis,宽度随内容自适应;
   滑入/滑出 transform 同步加入 translateY(-50%) 保持居中锚定。
6. 面板结构版本 v3 强制重建;版本 2026.9.26,update_log 同步。

## 验证

- `node --check` 语法通过;isMoreLabel 行为经 node 单测(命中/不误伤
  用例均通过);中途一次正则语法错误(`\b?` Nothing to repeat)已当场
  修复并复检。
- git diff 复查:CSS 三块(FAB 定位、面板自适应、nowrap)、isMoreLabel、
  isBreadcrumbish、aria-hidden 过滤、STRUCT_VER 六处改动与计划一致。
- 实机验证建议:刷新仓库主页,悬浮球应垂直居中;展开后 README/Code
  等真实 tab 应出现;文件区 More 收割项在注水后进入面板;面板尺寸随
  条目变化且不超屏。
