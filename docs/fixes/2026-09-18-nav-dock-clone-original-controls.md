# 2026-09-18 面板条目整体复用原控件,计数器胶囊样式保真

## 需求

1. Issues/Pull requests/Security and quality 的计数器已不重复,但仍缺少
   原有的胶囊样式。
2. 确认面板条目是重绘还是复用原控件;要求尽量复用原控件,避免样式差异。

## 事实核查(SSR)

抓取 issues-tab 完整锚点:

- 计数器为 GitHub 原生 `<span class="Counter" hidden title="0">0</span>`
  (带 `data-pjax-replace`/`data-turbo-replace`)。
- 图标 svg 带 `class="octicon ... d-none d-sm-inline"`(响应式隐藏类,
  窄容器下消失——正是 Security/Insights 在面板中缺图标的原因之一)。
- 原实现只克隆图标 svg + 手写文本 span + 手工重建 Counter → 样式差异。

## 方案选择

用户要求复用原控件。两个技术选项:

- 移动原节点:GitHub React 控制这些节点,移走会破坏其虚拟 DOM 一致性,
  可能触发 reconciliation 错误 → 不可行。
- **深克隆原锚点(采纳)**:图标/文本/原生 Counter/类名/主题变量全部
  保留;原节点留在原位,React 无感知。克隆做净化后即与页面视觉一致。

## 修改内容

1. 快照检查点 `36890ce`。
2. 新增 `collectNavDockOriginalAnchor(item)`:
   - `source` 为锚点时深克隆整节点,净化:
     - 去重 id(自身与内部)、热键/分析/框架接管属性
       (data-pjax/turbo-frame/pjax-replace/turbo-replace/react-nav 等);
     - `#` 占位 href(README tab)落地为当前页路径;
     - 计数器:仅保留首个 `[class*=Counter]`,文本为空或 "0" 时移除,
       否则去 `hidden` 显示;其余(响应式替换 "(1.8k)" 形式)移除;
     - svg 剥离 `d-none/d-sm-inline/d-md-inline/d-lg-inline`,窄面板下
       图标不再消失;
   - 加 `mgga-nav-dock-clone` 标记 + 守卫属性。
3. `buildNavDockPanel`:有源锚点 → 复用克隆;无源锚点(纯收割无 DOM 来源)
   → 原手工绘制路径,加 `mgga-nav-dock-fallback` 类维持原面板视觉。
4. 面板 CSS 职责收敛:通用 `a` 只管 flex/nowrap 布局;配色/字号/内边距/
   hover 交还 GitHub 原生类;`.Counter` 仅防缩水不覆盖观感
   (去掉自作主张的 margin-left)。
5. 版本 2026.9.30,update_log 同步。

## 验证

- `node --check` 语法通过(0 错误)。
- git diff 复查:克隆净化五步(属性/href/id/计数器/svg 类)、双路径渲染、
  CSS 职责收敛与计划一致;守卫属性防止 observer 自触发。
- 实机预期:Issues/PR/Security 条目显示原生胶囊(底色/圆角/主题色与页面
  完全一致);Security/Insights 图标出现;隐藏 id 不与原页面冲突。
- 本仓库为纯用户脚本,无 release/debug 构建配置,以语法检查 + diff 复查
  替代双构建验证。
