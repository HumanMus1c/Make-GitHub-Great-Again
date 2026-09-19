# 2026-09-20 排除仓库头部 kebab 元数据菜单误收割

## 需求

v2026.10.9 收割成功后,面板多出 Repository 分组的
stars/forks/watching/branches/tags/Activity/Custom properties 等条目,
且 Issues 重复(用户截图)。

## 根因

仓库页头部内容区(PageLayout-HeaderContent / show-whenNarrow)的
"⋯"元数据 kebab 也是纯图标弹出按钮,v2026.10.9 的触发器祖先扩展
(向上 3 层)把它误认成仓库标签栏的溢出触发器 → 点击收割出统计链接;
其 Issues 链接与标签栏 Issues 因数据属性不同而未被去重。

## 修改内容(v2026.10.10)

快照检查点 `55c2fe4`。findMoreTrigger 祖先扩展:
- scope 匹配 HeaderContent/show-whenNarrow 容器时跳过该层;
- 位于这类容器内的候选一律不作为触发器。
仓库标签栏自身的 "More items" 在 nav 内部,不受影响。

## 验证

- verify-mobile-e2e.js:双视口 PASS,react 仓库移动 13 / 桌面 11,
  无 kebab 误收条目。
- verify-partial-header-flow.js:1 次点击、3 溢出项入面板、scrollY=0。
- verify-responsive-late-switch.js / diag-scroll-oscillation.js:安静。
- node --check 通过。

## 教训

放宽触发器识别(ARIA 语义/祖先扩展)是双刃剑:每放宽一次都要同步
回答"哪些弹出按钮不是导航溢出"。结构性的排除(按容器语义)比事后
过滤条目更可靠。
