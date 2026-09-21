v2026.10.23 [2026-09-21]
nav dock 文件区 tab:切换后对新正文吸顶(Contributing/License 不再"下移一段距离") + 同页 tab 点击不再重载
[
1. 缘起:用户反馈"点击 README 导致不会下移,但是点击 Contributing 和 License 却会
   下移一段距离,而不是和 README 一样吸顶"+"当页面已经处于 code 页面时,再点击 Code
   就应该 Ajax 吸顶而不重载"。两个独立缺陷:文件区 tab 切换后的落点 + 同页 tab 的点击。
2. 决定性取证:**`-ov-file` 从来不是元素 id**,而是 GitHub `OverviewRepoFiles` 组件的
   **React 路由键**。证据取自 GitHub 自身的 bundle(本仓库留存副本
   .workbuddy/probe/code-view.js),全库只出现在三处:
   ① nav 项的选中态比较值 "aria-current": "readme-ov-file"===ep?"page":void 0;
   ② 切 tab 的真实实现 N=(e,t)=>{e.preventDefault(); if(ep===t)return;
      let n=new URLSearchParams(eu); n.set("tab",t);
      eh(n,{replace:!0,preventScrollReset:!0})} —— 改 ?tab= 查询参数并**显式禁止
      滚动重置**;点已选中的 tab 直接 return(什么都不做);
   ③ 侧栏/移动菜单的 hash 路由键 href:"#contributing-ov-file"。
   另有 tabNames 列表 f.push("contributing-ov-file") 等。**组件从未给任何元素挂
   这个 id**。
3. 真实页面复核(diag-locate.js 扩到"切 tab 后定位目标 + 同页条目"):iina
   (#readme-ov-file / #License-1-ov-file / #contributing-ov-file)、vscode
   (#readme-ov-file / #MIT-1-ov-file / #contributing-ov-file / #security-ov-file)、
   kubernetes(#readme-ov-file / #Apache-2.0-1-ov-file / #contributing-ov-file /
   #security-ov-file)—— **8 个路由键,目标元素存在全为 false**。
4. 根因 A(为何只有 README 会吸顶):README 是默认选中 tab(aria-current),
   navDockInPageTarget 走"已选中 → 认领文件区正文块"分支**拿到了元素** ⇒ 路径 2
   立即定位。Contributing/License 未选中 ⇒ hit.el===null ⇒ 走路径 3,交还 React
   原锚点把 tab 切成功(这部分一直是对的),然后等一个**永远不存在的元素** ⇒ 必然
   1500ms 超时 ⇒ **从不定位**。表现为 tab 切了、页面没动,相对 README 就是"下移了
   一段距离"。
5. 修复 A:① 完成信号改为**选中态迁移**(navDockFileTabSwitched + navDockBarSelectedKey;
   栏归属用 item.source.closest("nav"),回退按 aria-label="Repository files");
   ② 定位目标改为**已渲染正文块**(navDockFileTabLocateTarget 三级兜底:真存在的
   -ov-file 元素 → navDockOverviewArticleEl() → navDockContentRootEl(),三仓库实测
   恒命中第二级 markdown-body entry-content container-lg);③ **先立即吸顶一次**
   (慢网络下先有反馈),切换完成后再补一次对齐,残余漂移由既有的 1.2s 有界重定位
   收尾;④ 未注水超时仍回放一次面板锚点自身,可达性不低于改动前。
6. 根因 B(同页 tab 重载):Code tab 落地路径 dest===location.pathname,而旧版作用域
   判定 `if(!isFileAreaTabLabel(item.label) && !(hit&&hit.id)) return false` ——
   isFileAreaTabLabel("Code") 为 false、hit 为 null ⇒ **直接不接管** ⇒ 交给浏览器/
   Turbo 做一次**同 URL 导航**:重取整块内容 + 滚动归零,用户感知即"重载"。
7. 修复 B:新增路径 4 —— 落地路径就是当前页的条目**一次导航都不发**:
   navDockIsSamePageHref 解析成 URL 后比 pathname(去尾斜杠,相对/绝对两种形态都吃,
   跨源不接管),命中则 preventDefault + 定位 navDockContentRootEl()
   (#repos-split-pane-content → #repo-content-pjax-container → main;三仓库均存在)。
   该路径对所有同页 tab 通用(Issues 页点 Issues 同样受益),不只 Code。
8. 滚动引擎增强:navDockScrollElementToTop 新增一层 —— 目标自身若就是滚动容器
   (#repos-split-pane-content 带 tabindex="0",GitHub 的"键盘可滚区域"标记,它自己
   就是滚动容器),只对齐外框不够,内部还停在半路;现在连它自己的 scrollTop 一起归零,
   语义即"从该元素的开头显示"。实测值多返回一个 self 标记。
9. 日志可判读:via 取值扩展到 in-page|file-tab|file-tab-await|same-page-top|
   pass-through;有定位时另带 self=0 表示"目标自身内部被归零"。真机点一次
   Contributing/License 看那行 via= 即可自证走的哪条路。
10. 回归:tools/smoke-load.js **55/55 PASS**。新增场景 3g(文件 tab 吸顶,3 项断言:
    夹具刻意**不含任何 -ov-file 元素**以对齐真实 SSR;切换回调把正文文档绝对坐标从
    2000 改到 3200,断言最后一次 scrollTo=3200 且 elTop=0,从而证明"切换后确实重新
    对齐过";License 用不同形状的路由键 id #License-1-ov-file 再验一次)、场景 3h
    (同页 tab:预置窗口 __fakeY=900 / 内容区 scrollTop=700,点 Code 后断言 ——
    已接管 defaultPrevented、URL 未变、内容区 scrollTop→0、窗口→236、
    内容区 elTop=64;外加"跨页条目 Insights 仍不接管")。
11. 红绿对照:同一套断言喂给修复前版本(.workbuddy/probe/prev-before-filetabs-fix.js,
    取自快照 e4d243d)⇒ **3 项 FAIL**:① Contributing 切换后 scrollTo 调用序列为
    **空**(旧版从没定位过,正是用户反馈的直接证据);② License 同上;③ 同页 Code
    未被接管(会走同 URL 导航 = 重载)。tools/verify-harvest-sim.js 10/10 未回归。
12. 未验证:真机(本机网络到 github.com 不通,curl SSL error 35 / node fetch failed),
    只对已保存的真实 SSR 做端到端验证。真机判读:via=file-tab 为理想;若为
    file-tab-await(1.8s 内没探到选中态迁移),页面**已按"立即吸顶"落在文件区顶部**,
    不会退化回旧行为,把该行发我即可据此收紧判定。
13. 已知取舍:同页条目不清理 URL 上的 ?tab= 参数 —— 清参数需要走 React Router 的
    navigate,那正是本次要避免的重载。表现为"在 ?tab=license 下标点 Code 会回顶部但
    内容仍停在 License"。这是显式取舍,不是遗漏。
]

v2026.10.22 [2026-09-21]
nav dock 定位修正:三层滚动下精确置顶 + 禁止整页重载(点 LICENSE 跳走修复)
[
1. 缘起:用户反馈"点击导航的 LICENSE 会导致页面跳转至
   https://github.com/iina/iina/blob/develop/LICENSE,并且 Repositories 的三个导航
   每次定位都会发生下移而不是置顶"。两个独立缺陷:导航行为 + 滚动落点。
2. 根因 A(整页重载):上一版在"页内目标未渲染"时一律 preventDefault + 等 1500ms,
   等不到就 location.assign(item.href) —— 那是**文档级导航**,绕过 Turbo,等于把
   SPA 上下文整个丢掉。而 item.href 对文件区主题 tab 由 resolveFileAreaTabHref
   解析得到:iina 的 License tab 命中"证据 1(页面已有 /blob/.../{license,…} 锚点)",
   即左侧文件区那条 /iina/iina/blob/develop/LICENSE —— 与用户报告的 URL 完全一致。
3. 根因 B(定位不置顶):navDockScrollToTarget 用
   el.scrollIntoView({block:"start"}) —— 它的语义是"逐级滚动每一层可滚动祖先",
   而各层偏移量按**同一份初始几何**一次性算完。新版仓库页里内容区自己就是滚动容器
   (#repos-split-pane-content 带 tabindex="0" + data-selector 同名,典型的"键盘可滚
   区域"标记),于是存在"内层容器 + 窗口"两层:内层按初始 rect 滚 Δ1、窗口又按同一份
   初始 rect 滚 Δ2,两层互相抵消 ⇒ 目标既不在容器顶也不在视口顶,停在中间偏下
   ("下移")。behavior:"auto" 还会跟随站点 CSS 的 scroll-behavior:smooth,动画中途
   被打断就停在半路;定位完成后也没有锚定,注水/焦点还原/粘性重排都能把滚动再挪走。
4. 修复 A(禁止整页重载):删掉 location.assign 兜底,改为三级——
   ① 页内目标已在 DOM → 接管 + 立即定位(不导航、不重载);
   ② 源锚点是 href="#" 的占位 tab → 接管 + 交还 React 原锚点(原生客户端路由 =
      AJAX);**仅当 React 未接管**(尚未注水,没人接得住这次点击)才回放一次面板
      锚点自身(带真实 href,交给 Turbo 软导航);React 已接管却还在等路由数据时
      不回放,避免与其撞车形成双重导航;
   ③ 其余(真实 URL 的社区文件链接,如左侧文件区的 LICENSE)→ **不接管**,面板锚点
      自身的 href 交给 Turbo 全局拦截器,比我们替换更保真。
5. 修复 B(定位引擎重写):新增 navDockScrollableAncestors(找可滚动祖先)/
   navDockStickyOffsetWithin(容器内让位)/ navDockStickyTopOffset(顶栏让位)/
   navDockTargetScrollTop / navDockSetWindowScrollTop / navDockScrollElementToTop /
   navDockStartLocateReassert,替换原 scrollIntoView:内层容器先各滚各的(扣掉
   "已贴容器顶"的粘性子导航),窗口最后统一对齐(扣掉固定/粘性顶栏实测高度,与站点
   自身 scroll-padding-top 取大者),显式 behavior:"instant" 绕开 CSS smooth,
   并在 scrollTo 被覆写时用 scrollTop 兜底。
6. 锚定与礼让:定位后 1.2s 内有界重定位(仅在"用户没自己滚 + 目标仍在文档里 + 确实
   偏 >2px"时才动);装一次 wheel/touchstart/keydown 的 capture+passive 监听,探测到
   用户自己在滚就立即收手,绝不抢滚动条。收割回弹抑制窗口 1200ms → 2000ms,覆盖
   重定位窗口,避免 unlockPageScrollForHarvest 的回弹把定位拉回 snapY。
7. 日志可判读:locate 行补上实测值 top=/y=/off=/elTop=/inner=(目标应有滚动位置/实际
   位置/顶部让位/定位后目标视口坐标/参与滚动的内层容器数),via 取值
   in-page|delegate-ajax|await-render|pass-through;若定位后被别的滚动挪走过,会另打
   一行 "locate re-asserted Nx (...)";下次真机复现不必再猜。
8. 回归:tools/smoke-load.js 新增场景 3e(三层滚动夹具:内容区自滚 + 粘性子导航 +
   固定顶栏,断言容器 scrollTop=860 / 窗口=276 / 正文 elTop=64,并在 1.4s 后复查无
   漂移)、场景 3f(真实 URL 的 LICENSE 条目不得被接管)、静态回归闸
   (handleNavDockItemClick 函数体内不得出现 location.assign/replace)。测试基建新增
   installFakeLayout / viewportTop / stubViewportRect / stubScrollable —— jsdom 没有
   排版层(scrollY 恒 0、getBoundingClientRect 恒 0、scrollTop 写入被忽略),不打桩就
   写不出"定位到哪个元素/有没有置顶"这类断言。50/50 PASS。
9. 红绿对照:同一套断言喂给修复前版本(.workbuddy/probe/prev-before-locate-top-fix.js,
   取自快照 b1b204a)⇒ 6 项 FAIL,逐条对应本版两类缺陷(4 项属定位/置顶,2 项属整页
   重载)。tools/verify-harvest-sim.js 10/10,并补上仿真沙箱缺失的
   navDockScrollRebounceSuppressUntil 声明(否则 50ms 后的回弹回调会 ReferenceError)。
10. 真实页面验证(diag-locate.js 扩到"分诊路径 + 社区文件链接"):iina / vscode /
    kubernetes 三仓库 —— README tab 分诊 in-page(命中正文块),其余 tab
    delegate-ajax;左侧文件区的 LICENSE / README.md / CONTRIBUTING.md 一律
    pass-through,且其 href 正是旧版 location.assign 会去重载的 URL。
11. 未验证:真机(本机网络到 github.com 不通,curl SSL error 35 / node fetch failed)。
    真机判读方法:点一次 License 看 locate 行的 via=;若仍不置顶,看有无
    re-asserted 行(有则说明还有第三方滚动源在赛后抢滚动条)。
]

v2026.10.21 [2026-09-21]
nav dock 概览文件条目点击:README 立即页内定位 + 未选中 tab 交还原锚点触发 AJAX
[
1. 缘起:用户反馈"点击了 README 项之后无法立即定位到 README?默认情况下 README
   不是在页面默认展示的吗?"+"我要那些支持 AJAX 的项都支持立即定位到目标位置
   并触发 AJAX"。
2. 取证一(真实 SSR,.workbuddy/probe/iina.html 等三仓库):文件区
   `nav[aria-label="Repository files"]` 的三个 tab 全是 React 客户端路由占位
   —— `<a href="#" aria-current="page">README</a>`、`<a href="#">Contributing</a>`、
   `<a href="#">License</a>`。真实路由由 React 拦截点击完成(= AJAX)。
3. 取证二(根因,探针 .workbuddy/probe/diag-locate.js 跑真实页面,三仓库一致):
   取数链 pushItem 对"已选中 + href=#"落成 `location.pathname` ⇒ README 面板
   href = 当前页路径 ⇒ 点击 = 浏览器导航到当前 URL(无 fragment)= **整页重载**,
   滚动位置清零回到页首。既非定位也非立即,而页面本来就展示着 README,重载纯浪费。
4. 取证三(AJAX 为何丢失):collectNavDockOriginalAnchor 深克隆源锚点。React 把
   `__reactProps$…`/`__reactFiber$…` 挂成 DOM 节点**自有属性**,而 cloneNode
   **不复制自有属性** ⇒ 克隆对 React 不可见,点它只走原生 href ⇒ `href="#"` 的
   概览 tab 在面板里彻底失去客户端路由能力。(对比:真实 URL 条目克隆的普通 href
   仍被 GitHub 自己的 Turbo 全局拦截器接管 —— `data-turbo-frame=
   "repo-content-turbo-frame"` 实证,故那类本来就已是 AJAX,本轮不动。)
5. 取证四(可复用的官方锚点):右侧 About→Resources 区用页内锚点跳概览文件 ——
   `#readme-ov-file` / `#License-1-ov-file`(iina) / `#MIT-1-ov-file`(vscode) /
   `#Apache-2.0-1-ov-file`(kubernetes)。但 **SSR 只有 href、没有对应 id 元素**
   (三仓库实测"目标元素存在=false",id 由客户端补) ⇒ 定位策略必须"优先认领
   已存在的元素",只认 id 会把点击判成"等渲染"变成空操作。
6. 文件区正文容器的稳定标识:`#repos-split-pane-content`(文件区内容,
   `data-selector` 同名)+ `article.markdown-body.entry-content`(GitHub 渲染
   markdown 的固定组合类)。hashed 模块类名(OverviewRepoFiles-module__Box_3__*)
   不入选择器 —— 构建哈希一变即失效。
7. 修复 1(分诊点击)新增 handleNavDockItemClick(event, anchor, item),挂在面板
   每个条目上(克隆与手工回退节点共用 attachNavDockItemClick):
   ① 修饰键/非主键/target=_blank → 交还浏览器原生(新标签页等);
   ② 目标已在页面上 → preventDefault + 瞬时定位(behavior:"auto",对应"立即");
   ③ 目标未渲染且原锚点**已被 React 接管** → preventDefault + 交还原锚点,由
      React 客户端路由原地换出内容(AJAX),再等目标出现后定位;
   ④ 未接管(注水前)或无可交还锚点 → 只等目标出现;始终没出现则退回条目 href,
      保持与改前一致的可达性(href === location.pathname 时**不重载**)。
8. React 接管探测 navDockAnchorIsReactManaged:检查 `Object.keys(el)` 里有无
   `__react*`。这既是"克隆点不动 React 路由"的根因,也是唯一可靠的就绪探针 ——
   未接管的 `href="#"` 锚点交还点击只会让浏览器跳到页首(空 fragment),必须先探测。
9. 作用域刻意收窄:仅概览文件类条目(isFileAreaTabLabel 命中,或已确认存在
   -ov-file 目标 id)。其余条目本来就是真实 URL、克隆 href 已被 Turbo 接管,
   不碰以免无谓扩大改动面。
10. 修复 2(页内目标求解)navDockInPageTarget(item),**优先取已存在的元素**:
    A) navDockOvFileAnchorIdFor(key) 扫页面 `a[href="#xxx-ov-file"]`,文本归一
       (navDockLabelKey 只留字母数字)后与面板标签同名即认领 —— 故 `Readme` ↔
       `README`、`MIT license` ↔ `MIT license` 均命中;再 getElementById。
    B) 该条目是文件区**当前选中**的概览 tab(aria-current/data-selected)时,认领
       文件区已渲染的正文块 navDockOverviewArticleEl()。**这一条覆盖 README**:
       正文就在页面上,无需渲染也无需导航。
11. 真实页面实测(diag-locate.js):README → id=readme-ov-file + el=正文块 ✅;
    Contributing/License/MIT license/Apache-2.0 license → id 分别为
    contributing-ov-file / License-1-ov-file / MIT-1-ov-file / Apache-2.0-1-ov-file;
    Code of conduct / Security → id=null(侧栏文本不匹配)→ 交还原锚点后按前缀等待
    `#…-ov-file`,等不到则退回条目 href(无回归)。
12. 修复 3(滚动回弹抑制):unlockPageScrollForHarvest 的 1.5s 宽限期回弹只认
    snapY,会把用户刚触发的定位拉回原处(表现为"点了 README 刚滚过去就被拉回")。
    新增 navDockScrollRebounceSuppressUntil,navDockScrollToTarget 置 now+1200ms,
    回弹窗口内直接 return。
13. 诊断日志:每次定位打一行
    `[MGGA] nav dock: locate "<label>" via=<in-page|delegate-ajax|await-render>
    id="…" href="…"` —— 真机点一下即可自证走了哪条路,无需再猜。
14. 回归:tools/smoke-load.js 新增场景 3d(5 项断言:README 就地定位到正文且
    URL 未变、目标 id 已渲染时认领官方锚点、未选中 tab 交还原锚点被点 1 次、
    非概览项 Issues 不被接管、Ctrl+点击不被接管)+ 夹具 overviewFilesHTML()。
    46/46 PASS。红绿对照:同一套断言喂给修复前版本
    (.workbuddy/probe/prev-before-locate-fix.js,取自快照 f76cc9e)⇒ 3 项 FAIL,
    修复后全 PASS。tools/verify-harvest-sim.js 10/10(未回归)。
15. 测试基建:jsdom 不实现导航,点真实链接会往 stderr 打 "Not implemented:
    navigation";smoke-load.js 新增 quietNavigation 选项(仅本场景用独立
    VirtualConsole 屏蔽,不影响 window.onerror 收集)。
16. 未验证:真机(登录态仓库页)。本机网络不通 github.com(curl SSL error 35、
    node fetch failed),仅能对已保存的真实 SSR 做验证。待确认客户端渲染后
    `#…-ov-file` 是否真的挂上 id。版本 2026.10.20 → 2026.10.21,面板结构版本
    12 → 13。回滚点 f76cc9e。
]

v2026.10.20 [2026-09-21]
nav dock 多余点击根因修复:面包屑栏(Breadcrumbs)被闸门永久放行 + 点击日志措辞纠正
[
1. 缘起:免点击版上线后用户复测登录态仓库页,控制台仍出现
   `[MGGA] nav dock: harvest click #1 ok on "?"`,提问"哪里触发了兜底"。
2. 取证一(版本锁定):该日志行号为 5967,与 v2026.10.19 工作副本逐字一致
   (改前快照 8772c63 同行为 5837)⇒ 跑的确是免点击版,不是旧代码残留。
3. 取证二("?"含义):recordClick 的标签回退链是
   `normalizedText(trigger) || aria-label || "?"`,"?" 即触发器**无文本、
   无 aria-label** —— 纯图标弹出按钮。全页扫描(真实 SSR + 注入)显示这类
   按钮共 4 个,只有 1 个落在 nav 内(仓库标签栏 action-menu),而该栏
   zeroClick=23 已被闸门拦住 ⇒ 被点的必然是匿名页面里不存在的那一栏。
4. 取证三(铁证,仓库内历史日志):.opensquilla/attachments/ 下 2026-09-20 的
   控制台存档第 87/91 行 ——
     [MGGA] scan "Breadcrumbs" vis=2 trig=icon-btn
     [MGGA] nav dock: harvest click #1 ok on "?"      ← 紧接着
     [MGGA] scan "Repository" vis=9 trig=More items   ← 下一栏才轮到
   ⇒ 被点的是 **nav[aria-label="Breadcrumbs"]**(登录态 AppHeader 的
   面包屑/上下文档)。
5. 根因:Breadcrumbs 栏的两个锚点是 `/owner` 与 `/owner/repo`,被
   isBreadcrumbish 全部剔除 ⇒ 该栏"零点击可得项"**恒为 0** ⇒ 只认
   zeroClick 的闸门对它**永久放行**:每会话必然点开它的无名图标按钮
   (仓库选择器 picker),picker 里的链接经 pushItem 直接入面板(不经
   面包屑过滤)。这正是 2026-09-20 起反复出现的重复/垃圾项来源 ——
   docs/fix-2026-09-20-dock-duplicate-tabs.md 记的"Breadcrumbs 栏 kebab
   收割成功入面板"当时只按去重压制,未堵点击入口，免点击改造让它复现。
6. 附带发现:日志措辞不实 —— `harvest click #N` 是**收割结论**而非"确实
   点过"。harvestMoreItemsLocked 在触发器自报 aria-expanded="true" 时跳过
   click 直接等菜单,命中预检菜单/全局兜底同样不点击。首轮排查因此被误导。
7. 修复 1(闸门补条件)新增 navDockBarClickAllowed(bar, trigger, zeroClick,
   barBuckets)作为**点击路径唯一判定入口**,navDockHasPendingTrigger /
   navDockEarliestRetryAt / 初次收割循环 / hasUndecided / missedBars 五处共用
   (此前四处各写一遍同样条件,漏一处即失守)。新增条件:锚点全被剔除
   (kept=0)且触发器**无可访问名**的栏一律不点 —— 点开只会拿到 picker 链接。
8. 修复 2(isDockEligibleBar)按 aria-label 正则
   /breadcrumb|面包屑|当前位置/i 排除面包屑/上下文档:既不索引也不点击。
   与既有 Global/Footer 排除同源,同一函数被索引与五处闸门共用。
9. 修复 3(isDockEligibleBar 之外的兜底活路保留):栏内**一个锚点都没有**
   (结构未知、菜单全靠 JS 注入,如登录态头部 react-partial)或触发器
   **有可访问名**(More / More items / Toggle navigation)时仍允许点击 ——
   不因噎废食。verify-partial-header-flow.js 的假头部("More" 文本)仍走
   该分支。
10. 诊断增强 1:collectRepoHomeNavItems 的 statsOut 新增 barBuckets
    (Map<Element, {total,kept,hidden,ariaHidden,outside,moreLabel,breadcrumb,
    prerendered,sampleRejected}>),逐条记录锚点被哪条规则剔除;按**栏元素**
    键而不用字符串键,免疫 React 对 className/aria-label 的改写(字符串键会
    因此查不到而把该栏误判成 zeroClick=0,闸门随之误放)。
11. 诊断增强 2:每次真正决定点击时打一行 console.info 决策日志(栏名、key、
    分桶明细、触发器名),并在 recordClick 的日志追加 clicks=(本轮真实点击
    次数)与 menu=(菜单容器),措辞改为 `harvest #N ...` —— 下次再出现多余
    点击,一行日志即可自证栏名与原因,不必再逐字比对历史存档。
12. 回归:tools/smoke-load.js 新增场景 3c(面包屑栏 + 无名图标按钮 +
    picker 菜单),3 项断言;并给 3b 的 More 触发器补尺寸桩 —— jsdom 无布局,
    harvestMoreItems 对零尺寸触发器会早退,不打桩则 "clicks=0" 是零尺寸
    凑出来的、验不到闸门本身。
13. 红绿对照:同一套断言喂给修复前版本(.workbuddy/probe/
    prev-before-breadcrumb-fix.js,取自快照 a93d092)⇒ 3 项 FAIL(面包屑按钮
    被点 1 次、Picker Repository/Branches 两个垃圾项入面板、条目数 9≠7);
    修复后 41/41 PASS(clicks=0、7 项)。
14. tools/verify-harvest-sim.js:补抓 navDockDescribeNode(诊断分支新增依赖,
    按名抽取的沙箱缺它会 ReferenceError),并新增 2 项诊断出参断言,10/10 PASS。
15. 未验证:登录态真机(本地无法登录 github.com,headless Chrome 直连超时)。
    请重启扩展后在仓库页确认控制台不再出现 "Breadcrumbs" 相关的
    click decision 行,且面板不含 Picker 类条目。
]

v2026.10.19 [2026-09-21]
nav dock 取数改为免点击:More 折叠项从预渲染 DOM 直读,模拟点击退出主路径
[
1. 缘起:上一版为压制"点击 More 引发焦点还原滚动跳动 / 无限重扫"引入了一整套
   复杂度(滚动锁定+回弹、每元素 2 次点击预算、全局 12 次上限、2.5s 重试窗口、
   1/20s 视口分桶、连续重建上限)。用户提问:有没有办法不模拟点击就拿到 More
   里的折叠项。
2. 取证一(GitHub 自身前端源码):githubassets/assets/behaviors-*.js 模块 G7
   (.js-responsive-underlinenav)逐字为 ——
     e.style.visibility = overflow ? "hidden" : "";
     document.querySelector(`[data-menu-item=${tab}]`).hidden = !overflow;
   它只切换可见性与 hidden,**从不插入或生成菜单项节点**;行为在 load 与
   resize 各跑一次。即点击 More 不产生任何新信息。
3. 取证二(现网 SSR 实测 6 仓库:vscode/node/iina/react/linux/kubernetes):
   对每栏分别算出"直扫所得集合 A"与"免点击预渲染读取所得集合 B",结果
   A ⊇ B 且"B 独有项"恒为空集 —— 溢出项自服务端首帧起就在 nav 内
   (li[data-menu-item][hidden],hidden 挂在 li 上、不在 a 上,故现有直扫
   早已命中)。另:文件区栏现恒为 data-overflow-mode="wrap",7 项全部外显,
   2026-09-19 那条 body portal 收割链路在现网已成死代码。
4. 结论:点击收割零净收益,却要付全部副作用成本。主路径改为**零点击读取**。
5. 修复 1 新增 readPrerenderedBarItems(bar):零点击读取本栏预渲染项,两类
   来源 —— ① 本栏 [data-menu-item] 锚点(溢出副本);② 本栏触发器
   aria-controls 指向的下拉容器(仅当其位于本栏之外时补取,覆盖"菜单被渲染
   到 nav 之外"的登录态头部结构)。
6. 修复 2 新增点击闸门:collectRepoHomeNavItems 增加 statsOut 出参,统计每栏
   "零点击即可取到"的项数;某栏 >0 即视为已覆盖,永久退出点击流程。闸门接入
   navDockHasPendingTrigger / navDockEarliestRetryAt / 初次收割循环 /
   hasUndecided / missedBars 五处。
7. 修复 3 新增 isDockEligibleBar(bar):页脚与全局 Marketing 头部栏既不索引
   也不允许点击,被 collectRepoHomeNavItems 与四处闸门共用 —— 否则非 dock 栏
   因"没有 zeroClick 计数"而被闸门漏放触发器。
8. 修复 4 点击路径降级为兜底:harvestMoreItems 与滚动锁定、点击预算、重试
   窗口全部保留但仅在"某栏零点击一项都取不到、且存在可见 More 触发器"时
   启用,为未知结构(登录态头部若既非预渲染在 nav 内、也无 aria-controls)
   留活路。现网 SSR 下该分支恒不触发。
9. 面板结构版本 v11 → v12,升级后旧面板强制重建一次。
10. 附带修复:tools/verify-harvest-sim.js 自 2026-09-19 起即崩(漏抓
    navDockAnchorLabel / HTMLElement / lockPageScrollForHarvest /
    harvestMoreItemsLocked),已补齐并打桩 jsdom 的 scrollTo,现 8/8 PASS。
11. 回归:tools/smoke-load.js 34 → 38 项全 PASS,其中新增 4 项为免点击改造
    的决定性回归 —— 用现网 SSR 响应式标签栏结构(js-responsive-underlinenav
    + [data-menu-item] 溢出副本,且 Wiki/Security/Insights 三项只存在于溢出
    副本里),断言 More 触发器 clicks=0、三个溢出独有项全部进入面板、去重后
    恰好 7 项无重复。node --check 通过。
]

v2026.10.18 [2026-09-21]
修复仓库页无限加载:nav dock 自激励重扫循环 + 选择器兜底越界(含上一版整改的真实回归)
[
1. 现象:打开 GitHub 仓库页后,DevTools 控制台被 [MGGA] scan 刷屏、看不到页面
   自身代码,页面观感"无限加载"、永不进入空闲态。
2. 根因 A(主因,非本次整改引入):buildNavDock 的 finally 无条件续排 200ms 后
   的下一轮;而 session.byBar 只在"收割成功"时才定稿 → "桌面全宽、所有导航项
   外显、根本无需下拉"这一常态下缓存永远写不上 → 每轮都走未命中分支重扫全部
   栏并打印 → 定时器自我重排,不设停止条件。真机实测 13.8~14.7 条/秒、永不停止,
   DOM 持续被创建,主线程被反复唤醒。
   附:签名短路写在重扫之后,白干并打完日志才 return。
3. 根因 B(本次整改的真实回归):queryAssetRows 兜底含裸
   ul[data-view-component] li.Box-row / section[data-testid] li,主选择器失配时
   把页面无关的 li.Box-row 也当资产行;queryAssetCell 末位兜底为 row 自身,使
   link.innerHTML = "" 直接清空无关行内容 → 触发 React 重渲染 → 观察器再调
   processAssets → 无限重试循环(本仓库第三次记录该形态)。
4. 修复 A1 早短路前置:新增 navDockCheapSignature(只读栏内锚点 href,零副作用)
   + navDockHasPendingTrigger,在**任何重扫/日志/DOM 写入之前**判定"本轮无事
   可做"并直接返回。
5. 修复 A2 空产物同样定稿:只要没有"从未点击过"的触发器就写 session.byBar
   (哪怕为空)。面板项本就由 collectRepoHomeNavItems 直读实时 DOM,缓存只补充
   被收进 More 的隐藏项,定稿空产物安全;晚现触发器仍由每轮独立重算的补收分支
   获得点击机会。
6. 修复 A3 续排收窄且自限:finally 只在 navDockDirty(构建期间到达的变更)/
   roundPending(分批或重试需求)/ roundProgress(本轮真重建了面板)时续排;
   连续"有进展"轮次也有上限(NAV_DOCK_MAX_REBUILD_STREAK=5),其余一律停表,
   交由 MutationObserver / resize / SPA 事件唤醒。同时引入 navDockDirty 记账,
   补回旧实现靠无条件续排遮盖的"构建期间注入被守卫吞掉"缺口。
7. 修复 A4 重试窗口独立排程:收窄续排后,空结果后的 2.5s 唯一重试会等不到轮次。
   新增 navDockEarliestRetryAt + scheduleNavDockRetry(一次性定时器,不参与自
   激励续排;每元素至多 2 次、全局至多 12 次,落地后即无待重试项)。
8. 修复 A5 日志降噪:每栏结构自诊断由 console.info 改为 console.debug
   (Chrome/Edge 默认不显示 Verbose),排查时切 Verbose 即可,不再遮住页面日志。
9. 修复 B:兜底严格收窄为"[data-testid=release-assets] 容器内"→"行内确有
   下载/归档链接特征";queryAssetLink 在主单元格类名失配时额外要求链接具备下载
   特征或位于可信容器内,宁可跳过也不误改;queryAssetCell 保留 row 兜底(安全性
   改由行选择收窄 + 链接可信度判定承担,兼顾 GitHub 改版时单元格类名整体更换)。
10. 验证(真机 Chrome,10s 稳态窗口,1280px 桌面全宽):
    scan 日志 141/147 条 → **0 条**;Script 时间 129~201ms → **3~5ms**;
    DOM 创建节点 +2110/+2248 → **+0**;dock 面板与导航项完好(9/11 项)。
    同日 400px 窄视口对照一致无回归,Script 59ms → 19ms。
    tools/smoke-load.js 34 项全 PASS;新增 3 版本对照与定点核查探针。
11. 回滚点:[snapshot] 116088274b815ba7563df977031dcbe1c7dafebe。
]

v2026.10.17 [2026-09-21]
代码质量整改:9 项静态审查问题(隐式全局/巨型函数/重复实现/元信息/命名漂移/选择器耦合)
[
1. 起因:对主脚本做了一次通读审查,列出 9 项问题。本次逐项修复,并新增本地
   jsdom 冒烟回归测试(tools/smoke-load.js)作为可重复验证手段。
2. 问题 1 隐式全局:L1355 `dialog = document.createElement("div")` 无声明,
   IIFE 非严格模式下泄漏为 window.dialog → 补 `const dialog`。
3. 问题 2 巨型函数:createColorPickerDialog 原 1458 行。抽出
   buildSettingsDialogHTML(模板)、bindFeatureToggleButtons(三个近乎逐字
   重复的开关绑定合并为一次实现)、createKeywordRulesController(关键词
   规则渲染/增删/持久化)、createColorPickerPanel + toggleColorPickerPanel
   (内置取色器子面板)。1458 → 303 行,落入 docs/SOP.md 的 350 行硬上限内。
   搬迁用脚本完成,对 9 个模板字面量做逐字比对 + 自由变量扫描,确认只依赖
   refreshRealtimeStyles 一个闭包变量并显式参数化。
4. 问题 3 重复实现:rgbToHex/hexToRgb/hslToHex/hexToHSL/rgbToHSL/hslToRGB
   原本各写了 2-4 份(其中面板内 hexToRgb/rgbToHex 为死代码),收敛为
   模块级颜色工具区,新增 cssColorToHex 统一三处"rgb() 字符串转 HEX"。
5. 问题 4 元信息:@name:en 与 @name 同值(英文本地化未生效)→ 改为
   "Make GitHub Great Again"。
6. 问题 5 版本号:L409 兜底硬编码 "4.1",与 @version 严重脱节 → 新增
   getScriptVersion() 单一来源,面板与 nav dock 共用。
7. 问题 6 命名漂移:nav dock 实现早已改为"所有设备可用"(L5834 注释自陈),
   但函数仍叫 applyMobileNavDock、ID 仍叫 mgga-mobile-nav-dock、i18n 键仍叫
   mobileNavDock → 统一为 applyNavDock / mgga-nav-dock / navDock,修正
   策略注释,NAV_DOCK_STRUCT_VER 10 → 11 强制重建一次。
8. 问题 7 冗余授权:删掉全脚本零引用的 @grant unsafeWindow。
9. 问题 8 选择器耦合:processAssets/regenerateHighlight/观察器根节点硬编码
   GitHub 内部类名(.Box.Box--condensed li.Box-row 等)→ 集中为
   ASSET_SELECTORS + queryAssetRows/queryAssetCell/queryAssetLink,主选择器
   失配时按 data-testid="release-assets" 与语义结构兜底;applyColors 的
   !important 规则同步并列兜底选择器。
10. 问题 9 无谓暴露:window.initializeArchStyles 无任何外部消费者 →
    收回 IIFE 内部成为普通函数声明。
11. 验证:node --check 通过;tools/smoke-load.js 34 项断言全 PASS(含
    改版形态兜底场景、开关持久化、颜色变更实时链路、window.dialog 无泄漏);
    新增测试文件本身即为本次交付的一部分。
12. 遗留(未在本次 9 项内):createColorPickerPanel 仍有 504 行 —— 它是一体
    的内置取色器控件,canvas 绘制/输入解析/预设色/事件绑定共享 5 个可变
    状态,继续拆分需改造成状态对象,属重写范畴,单独评估。
]

v2026.10.16 [2026-09-20]
目的地归一升级:绝对 URL 合并 + 当前页豁免白名单化
[
1. 用户复测(v2026.10.15,行号 5679/5658 铁证):仍重复;日志链路健康
   (无 MGGA 报错,长堆栈为广告拦截器挡 GitHub analytics 的异步归因)。
2. 残余漏洞:① More 菜单收割可能拿到绝对 URL,与直扫相对路径归一后
   不相等 → 目的地去重漏放;② 上一轮"当前页路径豁免"过宽,More 菜单
   里选中 tab 的别名副本(# + aria-current 落当前页)也借豁免入面板。
3. 修复:目的地改用 URL 解析归一(同源才合并,跨源/不可解析不合并);
   当前页豁免收紧为 code/readme 白名单,其余落到当前页的条目同样受
   目的地去重管辖。
4. 验证:专项探针注入绝对 URL 别名项被拦下;react 双视口 e2e、iina
   双视口探针无回归。
]

v2026.10.15 [2026-09-20]
目的地去重(别名拦截):同一真实路径只保留首个入口
[
1. 用户复测(v2026.10.14 登录态):重复更多 —— 日志新增 Breadcrumbs 栏
   参与收割且 Repository/files 栏首次点击即成功,三路收割产物同时入
   面板;且 GitHub 新旧导航对同一 tab 用不同名称("Security" vs
   "Security and quality"),按标签去重永远拦不住别名形态。
2. 修复:pushItem 增加目的地去重 —— 归一真实路径相同 → 只保留首个
   入口;当前页路径(Code/README 两真实 tab 共享)不参与目的地合并,
   由标签去重管辖。与 10.14 的同名去重构成双保险。
3. 验证:专项探针升级为同仓库路径+别名 "Security" 注入,PASS;
   react 双视口 e2e 无回归。
]

v2026.10.14 [2026-09-20]
统一标签提取与计数料尾:修复 Issues1.8k vs Issues 键不相等的漏网
[
1. 用户复测(v2026.10.13 登录态):Repository 分组下仍重复 Issues;
   控制台日志行号(5634/5655)确认已是 10.13 代码,去重保险丝仍未命中。
2. 根因:两条收录路径的标签提取不一致 —— 直扫用 navDockAnchorLabel
   (剔除计数器节点)得 "Issues",More 菜单收割用 normalizedText(不剔除)
   得 "Issues1.8k"(GitHub DOM 内无空白字符,空格由 CSS gap 渲染);
   旧去重正则要求"前导空格+纯数字"尾部,对无空格拼接/带 k 缩写计数
   均剥不掉 → 规范化键 "issues" vs "issues1.8k" 不相等,同名保险丝
   失效;克隆渲染后胶囊与文本视觉一致,面板上看到完全相同的两项。
3. 修复:extractMenuItems 标签提取改用 navDockAnchorLabel(与直扫一致);
   去重料尾正则升级为兼容 "1834" / "1.8k" / 无空格拼接 / 括号旧式。
4. 附加发现:旧截图面板标题显示 v2026.10.11(GM_info),但本次控制台
   日志行号铁证 10.13 —— 截图应为 10.11 时期的旧证据。建议顺手在
   Tampermonkey 仪表盘确认只装了一份 MGGA(双装会互相覆盖面板)。
]

v2026.10.13 [2026-09-20]
同名 tab 先到先得:面板内同名项(去计数后缀)无条件只出现一次
[
1. 上一轮目的地等价判定仍依赖 href 形态假设;登录态 React 双标签条若
   出现未观测过的 href 形态(如带 query/fragment 的落地形态),同名
   tab 仍可能漏网二次入面板。
2. 修复:pushItem 去重收敛为单一规则 —— 规范化标签(去计数后缀、
   小写)相同即视作同一 tab,先到先得,不再依赖 href 形态判定;同名
   项保证至多入面板一次。
3. 验证:react 与 iina 双视口 e2e 全部 PASS,同名项零重复;合成平行
   栏异形 href 注入探针确认同名只收一次。
]

跨栏目的地等价去重:修复双标签条并存导致的 Issues/PR/Security 重复
[
1. 用户复测(附 iina/iina 截图):show-whenNarrow 容器已不再误收,但
   Issues / Pull requests / Security and quality 三项重复;模拟移动端
   页面只重复 Issues 一项。
2. 取证(curl 抓取 iina/iina 服务端 HTML):页面同时存在两份仓库标签条
   —— 新版 React 条与旧版 js-repo-nav UnderlineNav(aria-label 均为
   "Repository"),两份的同一 tab 锚点 href 形态不同(React 条落地到
   当前路径/占位,旧条为真实 /issues 等路径),精确 href|label 去重键
   无法命中 → 双条同项并存。计数感知键也只在 href 完全相等时命中,
   跨栏形态差异仍漏。
3. 修复:pushItem 去重升级为"规范化标签(去计数后缀、小写)+ 目的地
   等价"跨栏去重 —— 标签等价 且 (归一 href 相等 / 仅差尾斜杠 /
   最后一段路径相同 / 任一为 "#" 或当前路径的歧义形态)即重复,先到
   先得(canonical 可见 tab 先索引);歧义 href 先到时仍可被后续真实
   目的地补记。面板仍显示原始标签。
4. 验证:真实 GitHub 双视口 e2e PASS(react 仓库移动 13 / 桌面 11,
   每项恰好一次);登录态头部模拟链路 1 次点击、3 溢出项入面板、
   scrollY=0;晚切换/振荡探针安静;node --check 通过。
]
v2026.10.11 [2026-09-20]
窄视口专用 chrome(show-whenNarrow)整树排除;计数感知去重
[
1. 用户复测:仓库头部内容区(HeaderContent/show-whenNarrow)的条目仍被
   收割,且 Issues/Pull requests/Security and quality 三个计数项重复。
2. 根因:该容器是 GitHub 的窄视口专用 chrome(show-whenNarrow 工具类
   由 CSS 控制显隐),里面渲染的是窄屏版仓库条 —— 计数 tab 快捷片 +
   "⋯" 元数据 kebab。canonical 导航一直在 DOM 中(直扫不过滤 CSS
   可见性),v2026.10.10 只排除了"触发器祖先扩展认领",没排除这个
   容器本身被 findRepoHomeNavBars 索引成栏 → 栏内直扫得到重复 tab,
   栏内 kebab 收割得到元数据项;计数副本与可见 tab 标签不同,去重
   未命中。
3. 修复(双层):
   a) 结构排除:findRepoHomeNavBars 把位于 show-whenNarrow 子树内的
      nav 整体排除(带空结果回退:全部被排除时不过滤,防 dock 消失);
   b) 计数感知去重:pushItem 去重键增加规范化形态(同 href 去尾部
      斜杠 + 标签去计数后缀),"Issues" 与 "Issues 857" 视作同一
      导航目标,先到先得(canonical 可见 tab 先索引);精确键并行保留,
      面板仍显示原始标签。
4. 验证:真实 GitHub 双视口 e2e PASS(移动 13 项 / 桌面 11 项,
   计数项各出现一次,无 kebab 条目);登录态头部模拟链路 1 次点击、
   3 溢出项入面板、scrollY=0;晚切换/振荡/无限重试探针全部安静;
   node --check 通过。
]
v2026.10.10 [2026-09-20]
排除仓库头部内容区"⋯"元数据菜单的误收割与 Issues 重复项
[
1. 用户反馈(附截图):收割成功后,面板多出 Repository 分组下的
   stars/forks/watching/branches/tags/Activity/Custom properties 等条目,
   且 Issues 重复出现。
2. 根因:仓库页头部内容区(PageLayout-HeaderContent / show-whenNarrow)
   的"⋯"元数据 kebab 也是纯图标弹出按钮,v2026.10.9 的触发器祖先扩展
   (向上 3 层)把它误认成仓库标签栏的溢出触发器,把统计链接收割成
   "导航项";其 Issues 链接与标签栏 Issues 因数据属性不同而未被去重。
3. 修复:触发器祖先扩展跳过头部内容区容器(matches
   HeaderContent/show-whenNarrow 不认领),位于该容器内的候选一律不
   作为触发器;仓库标签栏自身的 "More items" 在 nav 内部,不受影响。
4. 验证:真实 GitHub 双视口 e2e PASS(react 仓库移动 13 项 / 桌面
   11 项,无 kebab 误收条目);登录态头部模拟链路 1 次点击、3 溢出项
   入面板、scrollY=0;晚切换与振荡探针安静;node --check 通过。
]
v2026.10.9 [2026-09-20]
纯图标溢出触发器识别(汉堡菜单/无障碍名缺失按钮);导航坞收割结构自诊断日志
[
1. 用户复测:登录态头部 More 溢出项在模拟移动端下仍丢失。结构自诊断
   日志(每栏外显锚点数 + 触发器识别结果)取证发现:全局头部在窄视口
   下的溢出触发器是**纯图标汉堡按钮("Toggle navigation")**,无 More
   字样文本,全部旧识别路径(text/aria-label 前缀匹配)都无法命中 ——
   这正是用户选择器(全局头部 nav)里"More"的真身。
2. findMoreTrigger 新增纯图标弹出按钮识别:aria-haspopup + aria-expanded
   齐备且无文本 → 视为溢出触发器;isMoreLabel 语义放宽(toggle
   navigation / additional navigation 等可访问名);触发器查找向上扩至
   3 层容器(每层要求首个 nav 是本栏,防误认相邻栏)。
3. findRepoHomeNavBars 保留外显锚点数 ≤1 的 nav(窄视口下几乎全部项
   收进 More 的栏此前因"无可见链接"被过滤,收割机会随之丢失)。
4. 收割循环新增结构自诊断日志([MGGA] scan,定位后可移除):每栏的
   aria-label/键、外显锚点数、触发器识别结果,一次控制台输出即可定位
   任意结构差异,终结盲猜式修复。
5. 验证:登录态头部模拟链路(切窄后注入 + portal 延迟)恰好 1 次点击、
   3 溢出项入面板;模拟页真实 GitHub 仓库栏的纯图标触发器被正确识别;
   真实 GitHub 双视口 e2e PASS(移动 13 项 ≥ 桌面 11 项);振荡/无限
   重试/晚切换探针全部安静;node --check 通过。
]
v2026.10.8 [2026-09-20]
导航坞标题栏显示脚本版本号；登录态头部 More 溢出项丢失根因修复
[
1. 导航坞面板标题栏显示脚本版本号（GM_info），样式对齐设置面板的版本
   角标（小号、弱化色）。
2. 用户复测:模拟移动端下登录态头部（react-partial）More 溢出项仍丢失。
   控制台诊断日志逐轮取证,先后定位并修复四个叠加缺陷:
   a) findMoreMenu 预检 wrapper 假成功（主因）:头部 More 与 tab 列表同属
      一个容器,wrapper 分支把包含 nav 的整个头部容器当菜单,预检收割到
      本栏外显项即判定"成功"→ 永不点击 More,溢出项永久丢失。修复:
      含 nav 的容器一律拒绝作为菜单候选。
   b) harvestMoreItemsLocked 变量未声明:v2026.10.5 拆分函数时把
      menu/items 声明留在外层,读取未赋值变量抛 ReferenceError 被上层
      catch 静默吞掉,整栏收割失败（菜单未在 2.5s 内出现的场景必现）。
   c) 会话定稿封死收割机会:产物定稿后缓存命中分支不计算待补触发器,
      切 Responsive 后晚出现的头部 More 永不被点击。修复:missedBars
      每轮重算,与缓存命中无关 —— 定稿的是收割产物,不是收割机会。
   d) 收割状态机按栏键记录,React 重渲染重建的触发器会被旧状态封死。
      改为按触发器元素记录（WeakMap:每元素至多 2 次点击,空结果 2.5s
      后允许一次重试）,全局 12 次上限兜底。
3. harvestMoreItems 预跳过 display:none 的 wrap 模式 More 按钮（文件区,
   永不展开,点击无意义）;菜单查找新增最终通用兜底（触发器之后第一个
   可见含锚点列表,覆盖非标 portal 结构）;isMoreLabel 放宽语义匹配
   （additional navigation 等 aria-label 场景）。
4. 验证矩阵（真实 Chrome）:登录态头部结构模拟（切窄后 1.5s 注入 More +
   portal 延迟挂载 + primer 焦点行为）→ 恰好点击 1 次、3 溢出项全部
   入面板、scrollY=0;真实 GitHub 移动宽度收割到此前丢失的头部溢出项
   （react 仓库 Node/React Native,13 项 vs 桌面 11 项,e2e 断言语义
   相应更新）;34s 晚现假栏恰好 1 次点击入面板;振荡/无限重试探针安静;
   node --check 通过。
]
v2026.10.7 [2026-09-20]
晚切换 Responsive(打开 DevTools 后)头部溢出项丢失修复;收割改为每栏一次的状态机
[
1. 用户复测:等待打开 DevTools 后再切 Responsive,头部导航仍只剩外显 2 项。
   根因:上一版收割窗口(20s)从页面加载起算,用户切 Responsive 时窗口早已
   过期 —— 文件区栏在加载时(桌面宽度)已收割入缓存故正常;头部栏在桌面
   宽度下无 More 触发器(项全外显),切窄后重排出的头部 More 因窗口关闭
   永不被点击,溢出项永久丢失。
2. 收割时序改为每栏一次的状态机(无时间窗):每栏的 More 在页面生命周期内
   至多点击一次 —— 收割到条目即入缓存(此后面板与收割产物不再变化);
   点击后为空/异常记入失败名单,本页面内绝不再点击;晚出现的栏(切
   Responsive 后重排出的头部 More)首次出现时收割一次,无论过了多久。
   全局点击上限 12 次防御性兜底。保持"每页只收割一次"语义:视口变化
   重建一律只读缓存。
3. 解锁回弹:收割结束立即恢复锁定位置,并 1.5s 宽限期内有界回弹 ——
   覆盖在途平滑滚动动画(焦点还原触发),否则页面会残留在触发器位置。
4. 验证矩阵(真实 Chrome):晚切换时序(桌面加载等 25s → 切 Responsive)
   面板 11 项不缩水、总点击 1 次、无滚动;晚现假 More 栏(34s 注入、
   页首下方 1500px)恰好点击 1 次、2 溢出项入面板、全程 scrollY=0、
   之后无点击;全新加载双视口 11/11 项 PASS;振荡与无限重试探针安静;
   node --check 通过。
]
v2026.10.6 [2026-09-19]
收割节奏改为一次性会话；修复桌面切 Responsive 后头部溢出项丢失
[
1. 用户报告:DevTools 选 Responsive 缩窄视口(桌面 UA、不刷新)后,头部导航
   面板只剩外显 2 项,文件区 More 隐藏项反而正常。取证:重排流(桌面宽度
   加载后再缩窄)里 GitHub 对导航的处理与小视口全新加载不同,头部 More
   菜单注水/重渲染时机晚得多,上一版每栏 3 次预算在菜单就绪前耗尽即
   永久放弃该栏。
2. 一次性收割会话(用户建议落地):每次进入仓库页/刷新/SPA 跨路径开启
   新会话(loadRun 序号 + 路径),窗口期(20s)内每栏至多点击 More 2 次
   (初次 + 空结果补收一次);窗口过后与视口变化重建时一律只读缓存,
   绝不再点击。删除逐次预算簿记与无限补收机制。
3. 视口变化(桌面拖 Responsive、缩放)沿用同一会话:面板与收割产物
   完全不变,从根上杜绝重排流里的反复点击;若 GitHub 重排重建了某导航
   节点,仅对该新节点做一次有界收割(守卫:窗口内 + 每栏余量)。
4. 空收割不定稿:注水未完成的首轮空结果不再锁死会话,后续轮次可重扫,
   避免"空缓存 → 悬浮球消失";待补栏每轮重算,双守卫保证不超额点击。
5. 收割点击期间滚动锁定(snap-back)保留:锁定期间 scrollY 瞬时回弹,
   焦点还原滚不动页面。
6. 验证矩阵(真实 Chrome):桌面 1280 加载 11 项(1 次点击)→ 切
   Responsive 400 不刷新,面板保持 11 项、追加点击有界(4 次事件后
   安静)、scrollY ≤4px 无振荡;移动 400px + 桌面 1280px 全新加载
   双视口 11/11 项 PASS;振荡复现脚本静止;失败栏点击不再无限;
   node --check 通过。
]
v2026.10.5 [2026-09-19]
模拟移动端视口下页面在顶部与 README 区之间来回滚动(振荡)修复
[
1. 真机取证:模拟移动端视口进入仓库主页约半分钟后,页面开始在顶部与
   README 区之间平滑往复滚动(周期约 6.8s)。滚动源头不是脚本主动滚动,
   而是导航坞收割 More 菜单的副作用链:点击收割期间 primer-react 在
   Escape 关菜单后把焦点还原给触发器,浏览器平滑滚动使屏幕外的触发器
   可见;而"收割不到条目的栏"被无限重试(实测 ~2.6s/轮),两个失败栏
   (页首头部 More、README 区文件区 More)交替点击即形成振荡。
2. 收割窗口滚动锁定(snap-back):点击收割期间锁定 html/body overflow,
   并在 scroll 捕获阶段把 scrollY 瞬时拉回锁定位置 —— 程序化滚动
   (焦点还原)依规范可滚动 overflow:hidden 容器,必须双保险;
   引用计数支持嵌套,收割结束(含异常)立即恢复。
3. 每栏收割预算:同一栏点击 More 最多 3 次(主收割与补收共用预算),
   耗尽即静默放弃,失败栏不再无限重试;成功收割清零预算;缺触发器
   (注水未完成)的栏不点击、不耗预算,注水等待语义不变。
4. 签名短路前移:收割结果与现有面板一致且无待补栏时直接返回,
   任何 body 变更不再触发全量重扫与重复点击。
5. 面板结构版本 v10,升级后旧面板强制重建一次。
6. 验证矩阵(真实 Chrome 端到端):振荡复现脚本确认循环消失(锁定期间
   scroll 恒定、无第二周期);双视口 11/11 项收割完整无回归;失败栏
   点击 18 次 → 4 次后永久安静;node --check 通过。
]
v2026.10.4 [2026-09-19]
移动端模拟视口下头部导航 More 溢出项收割失效修复
[
1. 真机取证:DevTools 设备工具栏模拟手机（窄视口）进入仓库主页时，悬浮导航
   面板只剩 5 项，且缺失的正是头部导航 More 下拉里的溢出项；文件区导航的
   More 收割正常。未登录基线（同视口）面板 11 项完整，问题指向登录态头部
   导航（react-partial 渲染）的收割链路。
2. 预检假成功根因修复（findMoreMenu）：More 按钮与 tab 列表同处一个容器时，
   wrapper 分支会把本栏导航列表本身/内部节点（tab ul、溢出隐藏 li）当菜单
   返回，收割出与可见项重复/残缺的条目即被当作"成功"，此后不再点击 More，
   溢出项永久丢失。预检阶段现在一律拒绝本栏 nav 内部的候选菜单；真实菜单
   由点击后的全局兜底（仅收可见 portal）或 aria-controls / details 所有权
   路径提供。
3. 触发器查找加固（findMoreTrigger）：新版登录态头部可能把 More 触发器渲染
   为 nav 的兄弟节点（同属一个 header 容器），旧逻辑只在 nav 内部查找导致
   永远找不到触发器。现在向上扩大一层容器查找，并限定外层首个 nav 必须是
   本栏，避免误认相邻栏的 More。
4. 收割产物保真（extractMenuItems）：More 菜单内 href="#" 的 React 客户端
   路由溢出 tab 不再在收割层被丢弃，放行给 pushItem 的白名单/选中态判定
   （与文件区直扫同规则），溢出的 License/Contributing 类 tab 可正确落地。
5. 验证矩阵（真实 Chrome 端到端，移动 400px + 桌面 1280px 双视口）：react
   11/11 项（含 4 个社区文件 tab）、DeepLX 8 项（License ✓）、MGGA 9 项无
   假条目，双视口条目完全一致；jsdom 仿真 8/8；语法检查通过。
6. 面板结构版本 v9，升级后旧面板强制重建一次。
]
v2026.10.3 [2026-09-19]
文件区社区文件 tab（License/Contributing 等）在面板中缺失的根因修复
[
1. 真机复现与根因：新版 GitHub 文件区 nav 采用 data-overflow-mode=wrap（More 按钮
   常驻 display:none，永不展开），License/Contributing/Code of conduct/Security 以
   href="#" 的 React 客户端路由 tab 直接渲染在 nav 内；旧逻辑把它们当作无导航意义的
   占位锚点过滤，因此从未进入面板 —— 此前两轮的 More 菜单 portal 修复方向虽对，
   但该项根本不走收割流程。
2. 新增 resolveFileAreaTabHref：对白名单 tab（License/licence/Contributing/Code of
   conduct/Security/Citation/README，含 "MIT license" 等许可证类型前缀文案）按证据链
   解析真实落地路径 —— ① 页面已有 blob/tree 锚点（文件列表/侧栏）；② 内嵌 React
   flight 数据的 tabName+path+refName；③ 社区文件约定名 + blob/HEAD 兜底。
3. collectRepoHomeNavItems 放行上述占位 tab：isBreadcrumbish/pushItem 不再误杀，
   窄视口下 GitHub 隐藏的社区文件 li 也在面板保留（换行模式下页面上无任何入口，
   面板补充导航正是其价值）；带按 label 的解析缓存。
4. 回归矩阵（真实 Chrome 端到端）：react 桌面+移动 5/5（Code of conduct/Contributing/
   MIT license/Security/README，路径全部可达）、DeepLX License、MGGA 无假条目；
   语法检查通过。
5. 面板结构版本 v8，升级后旧面板强制重建一次。
]
v2026.10.2 [2026-09-19]
文件区 More 菜单收割落地与面板文本左对齐修复
[
1. 文件区 Contributing/License 根因落地：GitHub Primer 新版 ActionMenu 把菜单
   渲染到 body 下的 portal（anchored-position[data-target=action-menu.overlay]
   → .Overlay → ul[role=menu].ActionListWrap），不在 More 按钮容器内；
   findMoreMenu 新增 allowGlobalFallback 参数，预检（未点击）仅接受所有权
   明确的菜单（aria-controls/触发器容器），点击后等待才允许扫 body portal，
   且只收可见菜单 —— 消除假成功，同时让 portal 菜单真正可被收割。
2. 收割等待升级：1000ms 单轮等待改为总计 2.5s（250ms 步进），兼容 React
   异步创建 portal 的延迟；触发器本就展开时不重复点击。
3. 面板文本统一左对齐回推：克隆文本 span（data-content / data-component=text）
   与手工条目 label 不再 flex:1 拉伸，改 flex:0 1 auto（不拉伸、仅防溢出
   ellipsis），各项文本统一从行首开始。
4. 面板结构版本 v7，升级后旧面板强制重建一次。
]

v2026.10.1 [2026-09-19]
修复文件区 Contributing/License 缺失与面板假滚动条
[
1. 假成功收割修复：findMoreMenu 全局兑底曾抓到 React 关闭后仍挂载的隐藏旧菜单 portal，把其他栏的下拉项误认为本栏已收割，目标栏从此永不重试；现全局兑底与收割等待均只接受实际可见的菜单（isVisibleMenu：非 hidden、computedStyle 可见、有尺寸）。
2. 缺栏补收范围扩展：扫描时无触发器（注水未完成）的栏同样进入 missedBars；本轮新出现且不在缓存的栏增量纳入缺栏名单，由下一轮补收，消除“首轮时栏不存在 → 永不补收”。
3. 面板假滚动条修复：条目行 overflow hidden，克隆 nowrap 长文本不再横向撑开（Windows 上横向溢出会把 overflow-x 算成 auto，出现经典滚动条并挤压触发纵向滚动）；显式 overflow-x hidden；克隆文本节点（data-content / data-component=text）ellipsize，图标包装不受影响。
4. 面板结构版本 v6，升级后旧面板强制重建一次。
]

v2026.9.31 [2026-09-19]
缺栏补收与面板按栏分组
[
1. 修复文件区 More 溢出项永久缺失：首轮收割为空/失败的栏记录为 missedBars，后续每轮重点重试最多 2 栏，成功则入面板；不再因缓存命中而永远跳过。
2. 面板按栏分组：每条条目记录所属栏，跨栏时插入 1px 主题自适应分割线 + 11px 栏名小标题（首个条目前不加）。
3. 补收有界节奏：每轮最多重试 2 栏，不狂点触发器；视口桶变化仍走全量重收割。
4. 面板结构版本 v5，升级后旧面板强制重建一次。
]

v2026.9.30 [2026-09-18]
面板条目整体复用原控件，胶囊样式保真
[
1. 面板条目从重绘改为整体克隆原锚点：图标、文本、原生 .Counter 胶囊、主题配色全部原样保留，与页面无样式差异；不移动原节点（GitHub React 需要原节点留在原位），克隆是安全折中。
2. 克隆净化：去重复 id、热键/分析/框架接管属性；修正 # 占位 href（README 等落地为当前页路径）；仅保留首个非零计数器胶囊并移除 hidden 属性，响应式替换计数（形如 "(1.8k)"）不进入面板，避免读屏/视觉重复。
3. 图标剥离 d-none/d-sm-inline 等响应式隐藏类，窄面板下图标不再消失（此前 Security/Insights 缺图标的主因之一）。
4. 面板 CSS 职责收敛：布局由面板接管，克隆项视觉完全交给 GitHub 原生类；仅无源锚点可克隆时才用手工兑底项（独立类，维持原面板视觉）。
]

v2026.9.29 [2026-09-18]
导航条目图标兑底与计数器胶囊还原
[
1. 图标缺失修复：收割项（More 下拉）源锚点常无内联 svg，回退链改为源锚点 svg → 外层 li svg → 内置 octicon 路径映射（Security/Insights/Pull requests/Issues/Actions/Projects/Discussions/Code 等）；Security and quality 与 Insights 不再是裸文字。
2. 计数器重复修复：GitHub tab 的 textContent 形如 "Issues1.8k (1.8k)"（可见计数器 + 响应式替换计数器），收集时改用纯净标签提取 —— 先剔除 .Counter/[data-component=Counter]/.js-nav-count-replace 节点再取文本，标签不再混入计数。
3. 胶囊样式还原：优先克隆源锚点内的原生 .Counter 元素（同文档下原生主题样式自动生效，胶囊底色/圆角/边距与页面一致）；读取不到时从标签尾部 "1.8k (1.8k)" 形式提取并重建 .Counter，同时清理标签残留。
4. 面板内 .Counter 仅做布局补充（不缩水、不换行），视觉样式完全交给 GitHub 原生 CSS。
]

v2026.9.28 [2026-09-18]
收割项按栏归位排序；视口切换后重新收割，面板不缩水
[
1. 排序修复：收割不再统一追加在面板末尾，而是按栏归位 —— 每栏的 More 下拉溢出项紧跟在该栏可见项之后（Settings/Security 紧跟 Code/Issues/Pull requests，README 及其收割项属文件区栏殿后），还原 GitHub 侧真实导航顺序。
2. 缩水修复：收割缓存键从“路径”升级为“路径 + 视口宽度桶（100px）”。桌面切移动端调试时 GitHub 把放不下的项挪进 More（可见项 10 → 5），旧逻辑命中旧缓存只看到 5 项；现在桶变化触发重收割，溢出项重新收齐。
3. resize/orientationchange 监听已有，桶变化后经既有调度重建面板；签名由条目集决定，收齐后自动更新。
4. 按栏收割仍防重复点击：缓存命中时不再触碰触发器；空收割不写缓存，注水前轮次不污染后续收割。
]

v2026.9.27 [2026-09-18]
修复文件区导航 ul 内条目未进面板
[
1. 直接根因：文件区 README tab 的 href 为 "#"（React 客户端路由占位），收集函数入口把 # 锚点无条件丢弃，条目未到去重即被杀；现改为带 aria-current/data-selected 选中态的 # 锚点放行，并把 href 落地到当前页路径。
2. SSR 解析证实文件区 nav > ul 实际只有 README 一个 tab；更多项在其 More items 下拉里，由既有收割路径负责（上版已修触发器识别）。
3. 面包屑判定单测通过：README tab/Code tab 放行，owner/repo 面包屑剔除，isMoreLabel 不误伤导航项。
4. 面板结构版本 v4，升级后旧面板强制重建一次。
]

v2026.9.26 [2026-09-18]
悬浮球垂直居中、面板自适应尺寸、补齐文件区导航项
[
1. 悬浮球改为左侧垂直居中（top:50% + translateY(-50%)，left:1em），对齐 Release 悬浮按钮定位。
2. 面板同锚点垂直居中；宽度/高度随条目数自适应（fit-content），上限 max-width min(80vw,360px)、max-height calc(100dvh-1em)，绝不超出屏幕；超出时内部滚动。
3. 修复文件区导航项缺失的真正根因：其 More 按钮文本为 "More items"，精确匹配 ^more$ 不认，现改为前缀匹配且限长，仅识别 More 触发器不误伤导航项。
4. 条目过滤修正：README/Code 等真实 tab 的 href 虽为页内锚点或仓库根路径，但带 aria-current/data-selected 选中态标记，据此放行；面包屑链接无此标记仍被剔除。
5. 隐藏包装元素（UnderlineNav wrap spacer aria-hidden）内的内容不索引；收割项仍按仓库根路径正则过滤。
6. 面板结构版本号 v3：升级后旧面板强制重建一次。
]

v2026.9.25 [2026-09-18]
悬浮导航条目净化与过渡动画对齐 Release 设置面板
[
1. 剔除面板前面两个无关条目：面包屑/头部内指向 owner 与 owner/repo 的链接及页内锚点，按 href 正则识别后过滤。
2. 补齐仓库文件区导航（OverviewRepoFiles 内 UnderlineNav，含 README/English Version 等条目）：依赖上一版的全域 nav 扫描与注水重试，本轮验证收集过滤不再误杀。
3. 过渡动画对齐 Release 页悬浮按钮 → 设置面板：面板初始 opacity 0 + translateX(-100%) 屏外，加 .mgga-visible 后 0.3s ease 滑入；收起反向滑出。
4. 面板展开时悬浮球右移淡出（opacity 0 + margin-left 2em，0.4s ease），与 Release 悬浮按钮被设置面板接管时一致；面板关闭按钮恢复悬浮球。
5. 面板新增标题栏 + ✕ 关闭按钮，结构对齐设置面板 header；结构版本号 v2 确保旧面板强制重建一次。
]

v2026.9.24 [2026-09-18]
修复悬浮导航缺失头部导航与仓库文件区导航
[
1. 栏发现改为全域扫描 nav 容器：新版 React 仓库页的分栏/文件区 nav（如 OverviewRepoFiles）不在首个 main 内，原实现扫描不到；现排除页脚与自身 dock 后扫整个 body。
2. 取消锚点零尺寸过滤：React 注水前锚点可能暂无尺寸被误跳过；隐藏项仍由 [hidden] 属性过滤，重复项由去重收敕。
3. 空收割结果不再写入按路径缓存：注水前首轮收割不到 More 触发器时，旧逻辑会永久缓存空结果导致头部 More 下拉项永远缺失。
4. 空结果时有界重试（最多 6 次 x 500ms）等待注水完成，仍为空才输出诊断并放弃。
5. MutationObserver 监视范围从头部区域扩到整个 body：文件区注水也能触发重建；重建由签名短路去抖，自身 DOM 变更由守卫标记忽略。
]

v2026.9.23 [2026-09-18]
悬浮球常驻；油猴菜单改为仅展开/收起面板
[
1. 悬浮球不再受功能开关控制：仓库主页始终显示，任何设备（含桌面）均可用。
2. 移除设置面板「移动端左侧悬浮导航」开关行与对应存储键读取；悬浮球显隐仅由页面类型决定。
3. 油猴菜单项改为「展开/收起悬浮导航」：仅切换面板展开态，与点击悬浮球等效。
4. 菜单触发时若悬浮球尚未就绪会先即时构建；非仓库主页时系统通知提示。
5. 点击悬浮球与菜单共用同一展开态同步逻辑，aria 状态与提示文案保持一致。
]

v2026.9.22 [2026-09-18]
移动端仓库主页左侧悬浮导航（由「导航栏 More 多行开关」重做而来）
[
1. 仅在移动端手机设备访问 /:owner/:repo 仓库主页时启用；桌面端与其他页面不受影响。
2. 扫描主页所有含 More Toggle 的导航条形栏（全局头部 nav、仓库标签条 UnderlineNav、主内容区 nav 容器），逐栏索引既有导航项。
3. 定位各栏 More 触发器，收割其下拉面板内导航项（复用原 More 检测与收割逻辑），与既有项按顺序合并去重。
4. 渲染为左侧悬浮导航栏：悬浮球带导航项数徽标，点击展开/收起面板；支持触控与深浅色主题变量。
5. 不改动原生页面 DOM（原生 More 行为保持不变）；SPA 导航后按新路径重建，同一路径只收割一次避免反复点击触发器。
6. 功能默认开启，可在设置面板「移动端左侧悬浮导航」或油猴菜单关闭。
]

v2026.9.19
全局导航 More：首行末端开关 + 其余导航项绕过 More 自动换行
[
1. 将 header > nav 内 More 下拉项与既有导航项合并为有序列表，放进父级 nav 容器。
2. More 固定在第一行末端，不再隐藏：点击可展开/折叠首行以下的其余导航项。
3. 其余导航项按顺序排列并自动换行；DOM 顺序为「首行项 → More → 溢出项」，使其在视觉上绕过 More。
4. 按容器宽度贪心装入首行（为 More 预留末位），窗口缩放后重新布局。
5. 接管 More 点击，阻止原生下拉；SPA 重导航后重新收割/布局。
6. 功能默认开启，可在设置面板「导航栏 More 多行开关」或油猴菜单关闭。
7. 该功能对全站生效（不限 Release 页面）。
]

v2026.9.18 [2026-09-18]
修正仓库头操作按钮行在移动端溢出（导致右侧空白列）
[
1. 根因定位：仓库头 narrow 布局中 Watch/Fork/Star/Sponsor 等按钮所在 flex 行未按屏幕宽度换行/收缩，Sponsor 按钮顶出主列，撑宽文档后右侧出现空白列。
2. 改为针对性修正：只作用于该按钮行（.show-whenNarrow / .tmp-mb-3 / header .d-flex.gap-2），强制 flex-wrap，并允许按钮 min-width:0 / flex-shrink，不再做全页背景铺满或全局 overflow 裁剪。
3. 功能默认开启，可在设置面板「修正仓库头按钮溢出」或油猴菜单关闭。
4. 该修正对所有 github.com/*/* 仓库页生效（不限 Release），并跟随 Turbo/SPA 导航。
5. 先前基于「宽内容溢出」的通用方案已移除（实机效果不符合预期）。
]

v3.5 [2026-03-23 16:17:39 +0800]
重命名脚本并添加 SVG 图标替换 (融合新功能与UI优化)
[
1. 调整脚本名称。
2. 设置界面 UI 微调 (菜单标签与对话框标题)。
3. 在设置面板中增加 SVG 图标替换功能，且实时生效。
4. 在文件名中加入架构关键词的高亮显示。
5. 其他相关样式以及界面/样式的细节调整。
6. 更新说明文档 (中/英文)。
]

v3.1 [2025-06-21 17:17:54 +0800]
更新展示图片
[
1. 更新演示动图
]

v3.1 [2025-06-21 16:27:31 +0800]
更新支持面板在未关闭的情况下根据浏览器主题动态切换背景颜色和自定义颜色
[
1. 支持控制面板在不关闭的情况下，根据浏览器的深浅色主题动态无缝切换背景颜色与自定义色彩
]

v3.0 [2025-06-16 20:30:31 +0800]
更新 readme.md
[
1. 更新与调整文档内容
]

v3.0 [2025-06-15 01:41:49 +0800]
Make-GitHub-Great-Again!
[
1. 启用新名称
]

v3.0 [2025-06-15 01:36:33 +0800]
启用新名称
[
1. Make-GitHub-Great-Again! (变更项目名称)
]

v3.0 [2025-06-15 00:39:56 +0800]
更新 readme
[
1. 记录：为 Release Assets 列表添加交替的背景色
2. 记录：提高资源条目的可读性和可区分性
3. 记录：防止因视觉模糊导致的文件下载错误
4. 记录：适配 GitHub 的深色/浅色主题
5. 记录：支持设置暗色主题下和明亮主题下的颜色，两种主题的颜色互相独立
]

v3.0 [2025-06-14 23:17:52 +0800]
3.0
[
1. 面板增加重置按钮：与油猴脚本菜单"🔄 重置为默认颜色"功能一致，并且只会重置当前主题下的颜色。
2. 调色器面板调整并适配跟随 GitHub 页面主题
3. 支持设置暗色主题下和明亮主题下的颜色，两种主题的颜色互相独立
]

v2.0 [2025-06-13 13:05:17 +0800]
更新 readme.md
[
1. 更新 README 文档内容以匹配新功能
]

v2.0 [2025-06-13 01:52:50 +0800]
创建 README_en.md
[
1. 创建英文版 README 文档
]

v2.0 [2025-06-13 01:41:48 +0800]
更新 README.md
[
1. 更新 README 文档
]

v2.0 [2025-06-13 01:17:45 +0800]
更新 README.md
[
1. 更新 README 文档
]

v2.0 [2025-06-12 01:17:35 +0800]
2.0 增加调色板方式设置颜色
[
1. 增加调色板方式设置颜色功能
]

v1.0 [2025-05-31 20:26:03 +0800]
再次申明规范化
[
1. 修正并规范化用户脚本元数据声明
]

v1.0 [2025-05-31 20:18:49 +0800]
==UserScript== 申明规范化
[
1. 规范化 ==UserScript== 块内容
]

v1.0 [2025-05-31 19:53:49 +0800]
修改 @name 为 Assets-Distinguisher
[
1. 修改脚本代号名称为 Assets-Distinguisher
]

v1.0 [2025-05-31 19:38:26 +0800]
为注释添加英文翻译
[
1. 为代码注释添加英文翻译
]

v1.0 [2025-05-31 17:50:50 +0800]
创建 Assets-Distinguisher.js
[
1. 由于 Github 的 Release 的 Assets 不够美观，并且容易造成视觉疲劳以及容易下载错误
2. 打算使其看起来更加舒适以及每行每个 Asset 之间更容易区分，创建了主要逻辑代码
]

v1.0 [2025-05-31 17:35:29 +0800]
首次提交
[
1. 项目仓库初始化提交
]
