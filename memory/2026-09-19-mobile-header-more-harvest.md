# MGGA 导航坞修复记录

- 2026-09-19: 提交 `8272801`（快照 `30d7576`），v2026.10.3，结构 v8。
  根因：新版文件区 nav `data-overflow-mode="wrap"`（More 按钮 display:none 永不展开），
  License/Contributing/Code of conduct/Security 是 `href="#"` 的 React 客户端路由 tab，
  被 isBreadcrumbish/pushItem 当占位符丢弃。修复：resolveFileAreaTabHref 白名单+证据链
  （页面 blob/tree 锚点 → flight 数据 tabName/path/refName → 约定名+blob/HEAD）；
  窄视口被隐藏的社区 tab 保留进面板。
- 2026-09-19: 提交 `0bd4d04`（快照 `7e021ac`），v2026.10.4，结构 v9。
  根因：模拟移动端视口下头部 nav（登录态 react-partial）More 收割链路缺陷 ——
  ① findMoreMenu 预检假成功：More 按钮与 tab 列表同容器时 wrapper 分支把本栏导航
  列表本身/内部节点当菜单，收割出重复/残缺条目即缓存为成功，永不点击 More，溢出项
  丢失（文件区 More 容器干净故正常）；② findMoreTrigger 只在 nav 内查找，More 按钮为
  nav 兄弟节点时找不到；③ extractMenuItems 丢弃 href="#"，溢出 React 路由 tab 在收割层
  被丢。修复：预检拒绝本栏 nav 内部候选；触发器向外扩一层容器查找（限外层首个 nav 为
  本栏）；href="#" 放行给 pushItem 白名单/选中态判定。验证矩阵：react 双视口 11/11、
  DeepLX 8 项 License ✓、MGGA 9 项无假条目、jsdom 仿真 8/8。
- 可复用验证工具：`tools/verify-mobile-e2e.js`（移动 400px+桌面 1280px 双视口端到端，
  MGGA_PROBE_REPO 环境变量切换仓库）、`tools/probe-headermore-mobile.js`（注入原函数
  取证）、`tools/probe-mobile-navs.js`（全 nav 结构枚举）、`tools/verify-harvest-sim.js`
  （jsdom 仿真）、`tools/diag-navdock.js`/`tools/probe-filesmore.js`/`tools/anchors-probe.js`。
- 2026-09-19: 页面跳动(顶部↔README 区来回滚)调查结论(未修代码)。
  根因链:①buildNavDock 签名短路在收割**之后**,任何 body 变更都重新执行收割;
  ②missedBars(有 More 触发器但收割不到条目的栏)补收无次数上限,与 body
  MutationObserver/1.2s 轮询叠加形成 ~2.6s/栏 无限重试;③每次重试对屏幕外 More
  触发器真实 click() + Escape,primer-react 关菜单时把焦点还原给触发器,
  浏览器/GitHub 脚本平滑滚动使触发器可见 → 页面滚动到该栏位置。
  两个失败栏(如登录态头部 More 在页首、文件区 More 在 README 区)交替重试
  即复现"顶部↔README 栏中间"振荡。复现:tools/diag-scroll-oscillation.js
  (两个假"永不成功"More 栏 + 周期性 body 变更 → 0↔432px 周期 ~6.8s 平滑振荡)。
  辅助工具:diag-scroll-source.js(focus/scrollIntoView/scrollTo 拦截取证,
  已证 Escape 后 primer-react 调 HTMLElement.focus 还原触发器引发滚动)、
  diag-scroll-loop.js(证明失败栏每 ~2.6s 无限重试点击)、diag-scroll-jitter.js。
  修复方向:签名短路提前到收割前;missedBars 重试设上限;点击收割期间
  锁定 scrollY / 对触发器 focus({preventScroll:true});失败栏记录状态避免重复点击。
- 2026-09-19: 跳动修复实施(快照 dfe7cfa),v2026.10.5,结构 v10。
  实施要点:①滚动锁定用 snap-back(overflow:hidden 锁不住程序化滚动,
  实测复现证明),scroll capture 把 scrollY 拉回锁定位置;②每栏收割预算
  3 次,主循环与补收共用,成功清零;③签名短路前移到补收前(条件含
  无待补栏,否则堵死增量补收);④主收割循环也受预算约束(全失败时缓存
  不写入,否则每轮重扫仍会重新点击);⑤缓存键 #v2 换键。
  验证:振荡消失(无第二周期)、e2e 双视口 11/11 PASS、失败栏点击
  18→4 次后安静。文档 docs/fixes/2026-09-19-nav-dock-harvest-scroll-lock-budget.md。
- 2026-09-19: Responsive 头部丢项 + 一次性收割会话(快照 0aaa37a),
  v2026.10.6。用户报告:桌面→缩窄(不刷新)后头部只剩外显 2 项;
  取证:重排流头部 More 注水远慢于小视口全新加载,3 次预算提前耗尽。
  按用户建议落地一次性会话:loadRun 序号(进入/刷新/SPA 跨路径 +1,
  navDockLastBuiltPath 判定)+ 路径为会话键;窗口 20s、每栏至多 2 次
  点击;窗口外/视口变化只读缓存;空收割不定稿;待补栏每轮重算。
  坑:①桌面 UA 重排流与移动 UA 全新加载是两条不同链路,验证需覆盖
  verify-responsive-flow.js(桌面加载→缩窄);②PowerShell git diff 显示
  乱码只是控制台编码,文件无损,用编辑器/diff 工具核对;③GitHub 页面
  加载偶发 60s 超时,e2e 重跑即可。文档
  docs/fixes/2026-09-19-nav-dock-one-shot-harvest-session.md。
- 2026-09-20: 晚切换 Responsive 仍丢头部项修复(快照 43d7061),
  v2026.10.7。根因:20s 窗口从页面加载起算,用户打开 DevTools 后才切
  Responsive,窗口已过期;桌面宽度下头部无 More 触发器不入缓存,切窄后
  重排出的头部 More 永不被点击。修复:收割改每栏一次状态机(无时间窗,
  clicksByBar/failedBars,晚现栏首次出现即收,全局 12 次兜底)+ 解锁
  回弹(1.5s 宽限有界回弹,压在途平滑滚动,实测残留 5955px→0)。
  坑:①探针必须模拟用户真实时序(加载后等 25s 再切),"加载后立刻缩窄"
  测不出时间窗漏洞;②解锁后 in-flight 平滑滚动会继续走完,必须宽限回弹。
  验证:verify-responsive-late-switch.js(11 项不缩水,1 次点击)、
  verify-late-bar-harvest.js(34s 晚现栏恰好 1 次点击,入面板,yMax=0)、
  e2e 双视口 11/11 PASS。文档
  docs/fixes/2026-09-20-nav-dock-state-machine-harvest.md。
- 2026-09-20: 登录态头部 More 丢项真因修复(快照 04c8f7e),v2026.10.8。
  诊断日志逐轮取证定位四个叠加缺陷:①findMoreMenu 预检把**包含 nav 的
  容器**当菜单(头部 More 与 tab 同容器的结构),预检假成功永不点击
  ——主因,v0.10.4 只拒了 nav 内部候选漏了父容器;②harvestMoreItemsLocked
  的 menu/items 未声明,ReferenceError 被静默 catch 吞掉;③会话定稿后
  缓存命中分支不算 missedBars,晚现触发器永不被处理;④状态机按栏键,
  React 重渲染的新触发器被封死。修复:拒含 nav 容器;补声明;missedBars
  每轮重算;状态机按元素(WeakMap,≤2 次,空结果 2.5s 后重试一次);
  wrap 模式隐藏按钮预跳过;通用菜单兜底(须严格多于预检);构建结束补调度。
  真实 GitHub 移动宽度现可收割此前丢失的头部溢出项(react 仓库
  Node/React Native,13 项 vs 桌面 11 项),e2e 断言语义已更新。
  教训:匿名态探针测不出登录态结构缺陷;静默 catch 掩盖 ReferenceError
  是多轮修复无效的真因;关键链路临时 console.info 逐轮取证是破局关键。
  标题栏已加版本角标(GM_info)。文档
  docs/fixes/2026-09-20-nav-dock-partial-header-fix.md。
- 2026-09-20: 纯图标溢出触发器识别(快照 6a0d807),v2026.10.9。
  结构自诊断日志取证:全局头部窄视口的溢出触发器是**纯图标汉堡按钮
  ("Toggle navigation")**,无 More 字样,旧文本匹配全部落空 —— 这就是
  用户选择器里"More"的真身;模拟页仓库栏也暴露 icon-btn 触发器。
  修复:findMoreTrigger 按 ARIA 弹出语义识别纯图标按钮(haspopup+
  expanded 齐备无文本),查找向上扩 3 层;isMoreLabel 放宽语义;外显
  锚点 ≤1 的 nav 保留;收割循环加 [MGGA] scan 自诊断日志(定位后可移除)。
  教训:识别触发器要基于 ARIA 语义而非字面 "More" 文本;自诊断日志应
  在调查初期就加。文档
  docs/fixes/2026-09-20-nav-dock-icon-trigger-diag.md。
- 2026-09-20: 仓库头部 kebab 误收割排除(快照 55c2fe4),v2026.10.10。
  用户截图确认主链路打通,但 Repository 分组多出 stars/forks/watching/
  branches/tags/Activity/Custom properties 且 Issues 重复。根因:头部
  内容区(HeaderContent/show-whenNarrow)的"⋯"元数据 kebab 也是纯图标
  弹出按钮,被 10.9 的祖先扩展误认为标签栏溢出触发器。修复:祖先扩展
  跳过该容器、容器内候选不认领。教训:每放宽触发器识别都要同步排除
  "非导航溢出"的弹出按钮,结构级排除优于条目级过滤。文档
  docs/fixes/2026-09-20-nav-dock-exclude-header-kebab.md。
- 2026-09-20: 窄视口 chrome 整树排除 + 计数感知去重(快照 9373d6f),
  v2026.10.11。10.10 后仍有头部内容区条目且 Issues/Pull requests/
  Security and quality 三项重复。根因:该容器是 show-whenNarrow 窄屏
  副本(CSS 控制显隐,canonical 同时在 DOM),10.10 只堵了触发器认领
  没堵"容器被索引成栏"——栏内直扫出计数副本、栏内 kebab 收割出元数据。
  修复:①findRepoHomeNavBars 排除 show-whenNarrow 子树 nav(空结果
  回退不过滤);②pushItem 规范化键(去尾斜杠+标签去计数后缀),
  "Issues"≡"Issues 857" 先到先得,面板仍显原标签。教训:GitHub 响应式
  副本树(show/hide-whenNarrow)同时存在于 DOM,查重复条目先查副本树;
  容器排除一次关闭栏索引/直扫/收割三条入口,优于单点堵漏。文档
  docs/fixes/2026-09-20-nav-dock-narrow-chrome-dedupe.md。
- 2026-09-20: 跨栏目的地等价去重(快照 257b1b8),v2026.10.12。iina/iina
  截图:三计数项仍重复(模拟端只重复 Issues)。curl 抓服务端 HTML 取证:
  页面同时有**新旧两套标签条**(React 条 + 旧 js-repo-nav UnderlineNav,
  aria-label 均为 "Repository"),同一 tab 的 href 形态不同(React 条
  落地当前路径/占位,旧条真实路径),精确/计数感知键都命不中跨栏差异。
  修复:pushItem 去重升级为"规范化标签(去计数+小写)+ 目的地等价
  (归一相等/尾斜杠/最后一段路径/歧义 # 或当前路径)",先到先得,歧义
  href 可被真实目的地补记。教训:迁移期页面双导航并存,取证直接抓
  SSR HTML;去重维度是目的地等价而非字符串相等。文档
  docs/fixes/2026-09-20-nav-dock-cross-bar-dest-dedupe.md。
- 坑（延续）：①node_modules 用 --no-save 交替安装会互相剪除，puppeteer-core 与 jsdom
  需同时列出安装；②facebook/react 已 301 到 react/react；③MGGA 仓库本身无
  CONTRIBUTING/LICENSE，在它上面测试社区 tab 必然"缺失"，验收看"无假条目"；
  ④PowerShell 传多行 JS 用临时 .js 文件；⑤证书链问题：curl --ssl-no-revoke、
  node --use-system-ca；⑥page.evaluate 传函数时模板串 ${} 不插值，参数走 evaluate 实参。
