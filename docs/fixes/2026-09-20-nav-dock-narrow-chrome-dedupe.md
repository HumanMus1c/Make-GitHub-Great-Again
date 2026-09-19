# 2026-09-20 窄视口专用 chrome 整树排除与计数感知去重

## 需求

v2026.10.10 后,仓库头部内容区(#repos-split-pane-content > ... >
prc-PageLayout-HeaderContent > ... > show-whenNarrow)的条目仍被收割,
且 Issues / Pull requests / Security and quality 三个计数项重复。

## 根因

该容器是 GitHub 的**窄视口专用 chrome**(show-whenNarrow 工具类,CSS
控制显隐),内含窄屏版仓库条:计数 tab 快捷片 + "⋯" 元数据 kebab。
canonical 导航一直在 DOM 中,而直扫不过滤 CSS 可见性。v2026.10.10 只
排除了"触发器祖先扩展认领 kebab",没排除这个容器本身被
findRepoHomeNavBars 索引成栏:
- 栏内直扫 → Issues/Pull requests/Security and quality 计数副本
  (与可见 tab 标签不同,去重未命中 → 重复);
- 栏内 kebab → stars/forks/... 元数据项(误收)。

## 修改内容(v2026.10.11)

快照检查点 `9373d6f`。双层修复:
1. **结构排除**:findRepoHomeNavBars 排除 show-whenNarrow 子树内的
   nav;全部被排除时回退为不过滤(防过度排除导致 dock 消失)。
2. **计数感知去重**:pushItem 增加规范化键(同 href 去尾斜杠 + 标签
   去计数后缀):"Issues" ≡ "Issues 857",先到先得(canonical 先索引);
   精确键并行保留,面板显示原始标签。

## 验证

- verify-mobile-e2e.js:双视口 PASS,计数项各一次,无 kebab 条目
  (移动 13 / 桌面 11)。
- verify-partial-header-flow.js:1 次点击、3 溢出项入面板、scrollY=0。
- verify-responsive-late-switch.js / diag-scroll-oscillation.js /
  diag-scroll-loop.js:全部安静。node --check 通过。

## 教训

- GitHub 用工具类(show-whenNarrow/hide-whenNarrow)做响应式副本,
  canonical + 窄屏副本**同时存在于 DOM**;处理"重复条目"时先查
  响应式副本树,再查收割来源。
- 修结构问题要修整条链路:容器排除一次做全(栏索引、直扫、栏内
  收割三个入口都随"不索引该容器"自然关闭),不要只堵单点。
