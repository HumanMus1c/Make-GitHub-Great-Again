v2026.9.23 [2026-09-23]
本批次汇总（2026-09-18 ~ 2026-09-23）：悬浮导航落地 + 两套面板标准统一 + 死代码清理（中英双语总览）
[
0. 本条目是「汇总索引」：把 2026-09-18 ~ 2026-09-23 的 15 个本地未推送提交重排为「7 个主题提交 + 1 个汇总提交」，并给出中英双语总览。每条改动的根因 / 取证 / 未验证项 / 回滚 SHA 仍以下面各条目与 docs/fixes/ 为准，本条目只做总览、不重复细节。
1. 闸门说明：本项目没有构建系统（交付物是单个油猴脚本，无 release/debug 分支），等价闸门 = node --check + 离线回归 ⇒ 本次 node --check 通过、tools/smoke-load.js 92/92 PASS。
2. 【EN】Code quality — the v2 architecture detector is wired into the icon fallback path, injected colours and HTML are sanitized, the missing i18n strings are completed, and the MutationObserver overhead is cut.
3. 【EN】Floating nav dock — the old "nav More" flattening became a repo-home left dock that indexes the header nav, the repo tab bar, the file area, the file-tree nav and the sidebar; the FAB is always visible and toggles only the panel.
4. 【EN】Harvest — per-bar grouping with dividers and per-bar retry, More read through the body portal, clickless harvest, ghost-menu and phantom-scrollbar filtering, page scroll locked during harvest with a retry budget, one harvest per page entry, and dedupe settled on normalized label plus destination.
5. 【EN】Navigation — in-page locate instead of a reload, no hard navigation, unselected tabs handed back to React so their AJAX still fires, and the file-area content pinned to the top after a tab switch.
6. 【EN】One panel standard — both title bars share padding / border / typography, the "visible title band" (panel top edge to divider) is 37.8px on both, every size is em-driven off a single clamp(vmin) font size, the scrollbar is immersive and shared through one generator, and the status glyphs are SVG from a single octicons-derived source.
7. 【EN】Dead weight removed — the "fix repo header button overflow" feature (proved inert by a live A/B run) and the three never-executing third-party colour-picker adapters are gone; the picker's doubled width on RGB/HSL is fixed with one definite-width declaration.
8. 【中文】代码质量：v2 架构检测器接进图标兜底路径；对注入的颜色与 HTML 做净化；补全缺失的 i18n 字符串；削减 MutationObserver 开销。
9. 【中文】悬浮导航：旧的「导航栏 More 多行开关」重做成仓库主页左侧悬浮导航，索引全局头部、仓库标签条、文件区、文件树与侧栏；悬浮球常驻，只负责切换面板。
10. 【中文】收割机制：按栏分组 + 分割线且漏栏可重试；More 改从 body 门户直读（免点击）；过滤幽灵菜单与假滚动条；收割期锁住页面滚动并给每栏重试预算；每进入一次页面只收割一次；去重收敛为「归一名 + 目的地」。
11. 【中文】导航行为：页内定位取代重载；不做整页硬导航；未选中的 tab 交还原锚点以触发 AJAX；切 tab 后对新正文吸顶、同页 tab 不再重载。
12. 【中文】面板标准统一：两处标题栏共用 padding / 边框 / 字重字号，「可视标题带」（面板顶边 → 分割线）两侧同为 37.8px，尺寸全 em 且只由一个 clamp(vmin) 字号驱动，滚动条沉浸式且抽成单一生成器，状态字形统一到 SVG 单一来源。
13. 【中文】清死重：真机 A/B 证明恒不生效的「修正仓库头按钮溢出」、以及三个从未执行的第三方取色器适配器一并删除（面板开关行 6 → 4、油猴菜单项 7 → 6）；取色器 RGB/HSL 宽度翻倍用一行定值宽度修掉。
14. 提交形态与回滚：15 个本地未推送提交 → 7 个主题提交（70344cc 代码质量 / 7b5f2c8 悬浮导航诞生与成型 / 999400c 收割机制重构 / 6c23ce1 导航行为去根因 / df50d19 来源扩展与面板重构 / 4cc7362 面板标准统一 / 7d548ac 清死重与收尾）+ 1 个汇总提交。动刀前打 tag snapshot-before-final-consolidation-20260923 保活旧 SHA；新链末端 tree 与旧 HEAD tree 逐字节一致（零内容差异）。整批回滚 git reset --hard df3f838（已发布 2026.9.17 基线）；只回滚本次重排 git reset --hard 56920cd。
15. 文档收尾：update_log_en.md 补本批次双语总览，并修正其中一条自相矛盾的 NOTE（原 NOTE 称「9.x 起只维护中文」，却在同一文件里镜像了 10.20–10.30）；README 中英补「悬浮球入口」与面板自适应 / 字号缩放 / 沉浸式外观条目；.opensquilla/attachments/ 的 3 个工具附件移出仓库（本地保留，已加入 .gitignore）。
]

v2026.9.23 [2026-09-23]
面板内 unicode 状态字形统一到 SVG（审计 §2.3 全量落地）
[
1. 需求（用户原话）：「§2.3（面板内 unicode 字形改 SVG）与 §2.4（抽面板外壳原语）按照当前项目整体完成度，是否可用开始实现了？」助手先取数判可行性再请用户拍板 —— 结论是 §2.3 可做（SVG 基建已成熟、悬浮球已有先例）、§2.4 不建议做；用户选「§2.3 全做（关闭/清除逐字同高）」+「§2.4 不做，只更正清单」。
2. 改前共 5 类 unicode 状态字形（全部由系统字体渲染，粗细/基线/字面大小都不可控，且与已 SVG 化的悬浮球、导航项图标不同源）：5 个开关按钮的 ✓/✕、关键词操作按钮的 ×（删除，U+00D7）与 ↩（恢复，U+21A9）、内置取色器「清除」的 ✕、两处面板关闭控件的 ✕。
3. 风险是分层的（决定改法）：开关按钮（.color-toggle-btn 是 width/height: 1.8em 定值 + flex 居中）与关键词按钮（父级 inline-flex + align-items:center）换图标零位移；而关闭控件与清除按钮**靠字形撑高**（关闭控件 14px × line-height 1.2 + padding 2px×2 = 20.8px），且关闭控件是各自标题栏里**最高的子项** ⇒ 动它就是动两处标题栏高度（这条线用户核对过两次，已被两条闸门锁死）。
4. 唯一真风险与对策：图标必须留在**行内盒**（只给 vertical-align: middle），绝不能用 display: block —— 否则行盒塌成图标自身的 1em，按钮与两处标题栏会一起矮 2.8px。
5. 基建（一处单一来源）：新增 UI_ICON_CHECK_PATH / UI_ICON_X_PATH / UI_ICON_UNDO_PATH（路径不手写，取自 @primer/octicons 官方 16px 数据 check-16 / x-16 / undo-16）+ UI_ICON_PATHS 映射表 + uiIconSvg(kind)。与 gearIconSvg 同范式：不写 width/height 属性，尺寸交给 CSS 的 1em ⇒ 一条规则跟随四处不同字号（0.8em 开关 / 14px 关闭 / 0.85em 清除 / 0.9em 关键词按钮）。
6. 调用点 11 处（用带命中次数断言的脚本批量替换，不手抄）：5 个开关按钮模板、设置面板关闭控件模板、取色器清除模板、bindFeatureToggleButtons 的 paint（on ? "✓" : "✕"）、updateToggleBtnUI 两个分支、关键词条目的 actionIcon（pendingDelete ? "↩" : "×" → uiIconSvg(pendingDelete ? "undo" : "x")）。导航面板关闭控件原本走 closeBtn.textContent，改 innerHTML（textContent 装不下 SVG，全文唯一一处）。样式加一条统一规则（5 个选择器 → width/height: 1em + vertical-align: middle），写在 GM_addStyle 里，两套面板一并命中，不必两处各写一份。
7. 注释清理：样式表里「原来是个 <span>×</span>」那段已过时，改写为现状 + 新约束（图标必须留行内）；注释里残留的 ✕/✓ 字面量一并清掉 —— 按项目既有教训，注释里留着字面量会让「全文不含某字形」这类最强断言失去意义，等于没删干净。
8. 回归与验证：node --check 通过；离线回归 **92/92 PASS**（新增 1 条总闸门，并改造 573 / 2015 两条成对闸门）；红绿对照旧版 58be158 → **89 PASS / 3 FAIL**，3 条恰为本轮判别器（关闭控件里没有 svg / 模板不是 uiIconSvg("x") / 源码里仍有 ✓ 字形）。
9. 真机取证（iina/iina，1280 宽；新探针 .workbuddy/probe/diag-glyph-svg-geometry.js，**两段式**：仓库主页量导航面板 + Release 页量设置面板与内置取色器；改前改后各跑一遍，三处几何在**同一帧**取齐）：承诺的「盒高逐字相同」成立 —— 两处关闭控件 20.8 → 20.8、面板顶边→分割线 36.8 → 36.8、header 29.8 → 29.8、设置面板盒 280×559.42 逐字相同、4 行行高 22.39×4 与各行 top 逐字相同、5 个开关按钮盒 20.16² 不变、取色器面板 274.38×331.28 不变、清除按钮盒高 26.98 不变、关键词条目盒高 25.17 不变、格式切换按钮（对照，不含图标）逐字不变。
10. 图标尺寸与身份均已核对：尺寸实测等于各处 1em（11.19 / 14 / 11.89 / 12.59）；身份按 path 前 24 字符分类 —— 5 个开关 → check-16，设置/导航关闭、取色器清除、关键词默认态 → x-16，关键词「待删」态 → undo-16（即开关态与待删态都验到了，不是只看默认态）。
11. 唯一变化是**宽度**：octicon 画在 16×16 网格、按 1em 渲染（关闭控件处 14px 见方），而原字形 ✕ 字面宽只有约 9.4px ⇒ 含图标的控件宽 +2~4px，其中**两处关闭控件同步 +2.56**（成对性未破）。要抹平只能把图标缩到 0.67em 上下，那样图标会明显小于所在文字，得不偿失，故不做。
12. §2.4 处置（不做）与清单更正：清单里「仍未共享：滚动条样式」**已过期** —— §2.2 已抽成 immersiveScrollbarCss() 生成器（导航面板 1 宿主 + 设置面板 2 宿主）。剩下的「面板外壳」与两套面板的**建面范式不同**（导航面板是 createElement 手搭 DOM + NAV_DOCK_STRUCT_VER + 三处版本校验触发重建；设置面板是 buildSettingsDialogHTML() 返回 HTML 串 + innerHTML 一次性灌入），抽原语得先统一范式，属重构而非整理，且会拆掉 4 条成对闸门的安全网 ⇒ 本轮只在清单里就地更正该条并记下三条判据。
13. 探针踩的两个坑（已写进文档，留给后续复用）：① eval(HELPERS) 在 page.evaluate 里必然失败 —— HELPERS 是 Node 侧变量，page.evaluate 只序列化函数本体，页面里没有该标识符 ⇒ 小工具函数必须**内联进每个被测函数体**；② **导航球只在仓库主页出现**（Release 页冒出的是设置球）⇒ 想量导航面板必须单独 goto 仓库主页并**重新注入脚本**（换了文档，之前注入的不会跟过去）。
14. 未验证：只测 Chrome（headless）+ iina/iina；未测 Firefox / Safari、手机真机；深色主题下的图标观感未单独目视（它走 currentColor，理论跟随文字色，但没做深色档体检）；关键词「待删」态只验了几何，未跑「点击返回能否正常撤销」的交互回归。另：油猴菜单 i18n 标签里的 ⚙️ emoji **故意保留**（menuSettings 等 4 条）—— 那是浏览器扩展菜单的文字标签，放不下 SVG，且不在面板范围内。
15. 版本号不变（沿用 2026.9.23）。回滚点 git reset --hard 58be158（tag snapshot-unicode-to-svg-20260923）。本轮未新增/删除任何存储键，Tampermonkey 侧无迁移。
]
v2026.9.23 [2026-09-23]
内置取色器：修掉「色值格式切到 RGB/HSL 时面板右侧多出一倍空白」
[
1. 需求（用户原话）：「取色器的色值类型切换到 RGB 和 HSL 时，取色器面板右侧会瞬间多出一倍空白区域，这是为什么？」→ 助手先只做诊断（真机三支探针 + 介入实验，见 docs/discussions/2026-09-23-picker-width-max-content.md），并列出四种修法（只改容器宽度 / 改容器+清理死声明 / 只补 size 属性 / 先不改），**用户选「只改容器宽度」**。
2. 根因（两个声明缺一不可）：① 取色器子面板 .custom-color-picker-panel 是 width: max-content，宽度由**内容固有尺寸**决定；② 取色容器 .builtin-color-picker-container 写的是 width: min(250px, 100%)，而在固有尺寸计算那一遍包含块宽度**不定**、百分比按 auto 处理 ⇒ 那个 100% 等于不存在，整条声明退化成「容器取内容固有尺寸」。再叠加 ③ <input type="text"> 不带 size 时固有宽按**默认 20 字符**计 —— 切到 RGB/HSL 一下多出**三个**数字框，各把 max-content 撑大 ≈165px。
3. 取证（真机 iina/iina，1280×896，探针 .workbuddy/probe/diag-picker-format-width.js）：改前 HEX 面板 281.17 / RGB 与 HSL **605.67**，而取色容器**恒 250**，右侧留白 6.78 → **331.28**；**关键判据**是三种格式下 .builtin-input-group 的实际布局**逐字相同**（227.63）⇒ 是「面板被撑宽」而不是「内容被挤开」。数字闭合：605.67 − 0.8em×2(22.4) − 边框 2 − 250 = **331.27**（实测 331.28）；HEX 档同式 256.77 − 250 = 6.77 ⇒ **HEX 档早就有同类毛病，只是小到看不出来**。
4. 介入实验定案（探针 diag-picker-format-width-fix-test.js：在真机页面就地改一处内联样式/属性，量完即还原）：容器内联 width:250px → 面板 **274.38**；三个数字框加 size="3" → **274.47**；**只**改第一个框 → 486.67（留白 212.28）⇒ 留白确实来自每个输入框各自的固有尺寸（每框约 119px）。另用 diag-picker-input-cascade.js 列出能匹配输入框的**全部规则 + 特异性**并取计算值对账。
5. 改动（一行）：.builtin-color-picker-container 的 width: min(250px, 100%) → width: 250px; max-width: 100%（窄屏收缩仍由后者负责）。定为定值后，固有尺寸那一遍拿到确定值，面板宽度恒等于「容器 + 0.8em×2 + 边框 2」= 274.4，与内部输入框的固有宽度**彻底解耦**。**不采用「只补 size 属性」**：那条路要动四处，且修完的 274.47 依赖「三个框固有宽恰好仍 ≥250px」这个巧合（实测 250.07），比改容器脆。
6. 回归与验证：node --check 通过；离线回归 **91/91 PASS**（新增源码闸门「取色器容器宽度是定值（不给 max-content 祖先留漏）」）；红绿对照旧版 c74b765 → **90 PASS / 1 FAIL**，唯一 FAIL 正是新闸门。真机：1280×896 三格式全部 **274.38 / 容器 250 / 留白 −0.01**（改前 RGB/HSL 是 605.67 / 250 / 331.28）；400×896 三格式同为 274.38（未触发收缩）；260×896 改前改后**逐字相同**（面板 244 / 容器 219.63）⇒ 把窄屏收缩从 min(250px,100%) 换成 max-width:100% **没有改变任何既有行为**。
7. 顺带查实（**本次未改**）：.builtin-color-value-input 的 width:0 / padding:0.3em 0.2em / font-size:0.85em / font-family:'Courier New'，与 .builtin-color-hex-input 的 padding:0.3em 0.5em / font-size:0.85em 等声明**从未生效** —— 被 .custom-color-picker-panel input[type="text"]（特异性 (0,2,1) > (0,1,0)，且更靠后）整条拿下；计算值对账：数字框实测 font-size 12.6px（= 0.9em×14px）、未渲染时 width 读作 100%。将来清理要注意这会带来**可见的字号与内边距变化**。
8. 未验证：只测 Chrome（headless）；未测 Firefox / Safari 与页面缩放档；400 档未触发收缩（未单独取证），真正逼出收缩的是 260 档（已对照）。
9. 版本号不变（沿用 2026.9.23）。回滚点 git reset --hard c74b765（tag snapshot-picker-width-fix-20260923）。
]
v2026.9.23 [2026-09-23]
整体删除「修正仓库头按钮溢出」（面板开关 + 油猴菜单项一并移除）
[
1. 需求（用户原话）：「为什么 Release 页的设置面板多了一项『修正仓库头按钮溢出』功能？」→「这项功能难道不是应该默认生效的吗？所以这个设置项存在的意义是什么？」助手给出四个收口方案（面板删行但留菜单逃生阀 / 保留面板行只修「关不彻底」/ 保留现状只修「关不彻底」/ 彻底删功能，并说明末者等于把已知 bug 放回去、不推荐），**用户选「彻底删掉这个功能」**。
2. 动手前先真机复测该补丁今天还值不值得留（新探针 .workbuddy/probe/diag-header-btn-fix-value.js：同一份脚本只改 GM 存储里该开关的初值，跑「开/关」两档 × 桌面 UA 与移动 UA × 480/760/1280 三视口 × 仓库主页与 Release 页）：结论是**已完全失效** —— ① 三个作用点选择器命中 0（GitHub 今天的仓库头 DOM 里已不存在 .show-whenNarrow；.tmp-mb-3 有 7/49 个元素，但从不与 .d-flex.gap-2 组合、也不在任何 .show-whenNarrow 内）；② 开/关两档的按钮行几何、Sponsor 右缘、documentElement.scrollWidth **逐字相同**（即该开关今天连一次实际差异都产生不了）；③ 原始症状（文档被撑宽、Sponsor 顶出主列、右侧空白列）不再出现（Sponsor 右缘距主列右缘 −116.78 ~ −556.78px）。⇒ 恒不生效的死补丁，删除零代价。
3. 顺带查清「为什么它出现在 Release 页设置面板」：面板是**全站唯一一份**（模板是纯函数、单一调用点、无按页分支），按页分档的只是**入口** —— 齿轮球在非 Release 页首行就 return，非 Release 路径还会主动 remove 掉已开的面板。故「Release 页多了一项」的真实来源是：面板装的是全局开关，而该功能的作用对象是仓库头而非 Release 页内容，是那组开关里唯一的异类。用户问的「难道希望导航栏项被收进 More」对应的是**另一行**（导航栏 More 多行开关，与它同批加入，已在 2026-09-22 重做成悬浮导航时删除）—— 现在脚本完全不碰原生 More 的收纳行为。
4. 讨论中还发现该开关的「关」路径**当页不彻底**：关闭时只摘样式表与 <html> 上的类、只断观察器，而此前打在行/子组/按钮上的内联样式与 dataset 标记全文没有任何回滚代码 ⇒ 点掉开关当页仍保持换行，必须刷新才真正回到原生布局。这个问题随本次整体删除一并消失（不再有开关）。
5. 删除范围（用**行界断言脚本**执行：删前逐条校验 13 个边界锚点全部命中才动手，8068 → 7862 行；不手抄 200 行 old_string）：i18n 键（中英）、设置面板整条开关行（开关行 6 → 4）、bindToggle 绑定、油猴菜单项（7 → 6）、实现区 200 行（样式注入器 / 行打标器 / 80ms 去抖 / 20×250ms 兜底轮询 / 头部 MutationObserver / 观察器拆除 / 开关读取器 / 总入口）、初始化块与两个视口事件监听（悬浮导航自己的两个监听保留）、SPA 导航里的重新应用调用；README 中英各删一条功能条目。
6. 删除处只留一段**中文描述**的说明：写在「已删除」注释里的标识符会让 grep 型检查继续命中（等于没删干净，§1.4 踩过同一个坑）—— 本次新闸门要做「全文不含」这种最强断言，就必须先把字面量洗干净。
7. 新增冒烟闸门「整套实现 + 面板开关 + 菜单项已整体删除」：① 源码全文不含 18 个标识符；② 运行期不注入样式表、不给 <html> 加修正类、不往按钮行打标；③ 模板切片里 .color-picker-row 恰好 4 条；④ 油猴菜单恰好 6 项。两处自伤已避开：**不能**拿 .show-whenNarrow / HeaderContent 当判据（悬浮导航仍在用它们做「排除 GitHub 窄屏 chrome」的反向过滤，属正当引用）；**不能**在静态区查 DOM（设置面板是按需创建的，静态区查「开关行数」恒得 0，第一版就这么红了一次），开关行数改走源码切片。
8. 回归：node --check 通过；node tools/smoke-load.js **90/90 PASS**（原 89 条：去掉 1 条开关断言、新增 1 条删除闸门）；红绿对照旧版 ebb88f3 → **89 PASS / 1 FAIL**，唯一那条 FAIL 正是本次新闸门。真机：tools/verify-live-navdock.js（主回归）**30/30 passed**；删除后复核（.workbuddy/probe/header-btn-fix-removed.json）四个目标全部 root=false / style=false / marked=0，Release 页设置面板仍正常（4 行开关 + 关键词块，无异常）。
9. 未验证：真机手机（本次为 headless Chrome + iPhone UA 仿冒，不是真设备）；只测了 iina/iina（无 Sponsor 的仓库未复测）；若 GitHub 将来重新输出 .show-whenNarrow，历史症状会复现 —— 但那属 GitHub 侧行为，删掉补丁只是回到原生布局。老用户 Tampermonkey 存储里的旧键残留、脚本已不再读取（无害）。
10. 版本号不变（沿用 2026.9.23，按既定要求不再改号）。回滚点：tag snapshot-drop-repo-header-fix-20260923（commit ebb88f3）。
]

v2026.9.23 [2026-09-23]
按设置面板审计清单落地：关键词列表补 overscroll-behavior:contain（滚到底不再把滚动接力给外层内容区）；模板内联样式下沉样式表（关键词容器尺寸 + .button-row 的 margin-top，改 CSS 从此生效）；删除三条恒不适用的外部取色库适配（JS 分支 + CSS 规则）；.color-picker-row 统一 min-height:1.6em 修掉 1.39px 行节奏差；三颗对话框按钮换 Primer 语义色并补深色档（确认=primary / 取消=neutral / 重置=danger）；面板基准字号改 clamp(vmin) 自适应（2560×1440 下 280px ⇒ 359.88px，与悬浮球同步生长）；滚动条规则抽成公共段 immersiveScrollbarCss 供两个面板共用（导航 1 宿主 + 设置面板 2 宿主）
[
1. 需求（用户原话）：「尝试按照"Release 设置面板（.color-picker-dialog）现状审计可优化处清单"继续执行落地，
   但是要求按照我曾规定的进行进度实时展示 progress.html 在右侧侧边栏。」另经一次拍板确认两处：范围 = §1 六项 +
   §2.1/2.2（§2.4 抽面板外壳原语本轮不做）；§1.3 按钮配色 = 换 Primer 语义色 + 深色适配。进度看板
   .workbuddy/progress.html（每 4 秒自动刷新，挂右侧预览面板，不入库）。
2. §1.1 + §1.6（同一元素，顺序不能反）：#customKeywordsContainer 的 max-height / overflow-y /
   margin-bottom 原本写在模板内联 style 里（内联优先级高于样式表 ⇒ 主题化、滚动条统一、响应式调整全都
   「改了没反应」）⇒ 下沉到样式表。下沉之后它才是一个可被样式表描述的**独立滚动宿主**，§2.2 的滚动条规则
   才有地方挂。再补 overscroll-behavior: contain（实测改前是 auto，而该容器**真的溢出**：内容 456px /
   视窗 168–224px；同脚本里导航面板条目区用的是 contain，两处本来就不一致）。
   **这里更正了审计文档的一处措辞**：原文写「接力给外层/页面」，实测页面那层根本轮不到 —— 祖先链是
   kw → 内容区 → 页面，而内容区自带 contain、已在中间截断。单独压视口（1280×520，逼面板限高、内容区
   必然溢出）量到的真承接者是**外层内容区**：scrollTop 0→7（改前）vs 0→0（改后），window.scrollY 两版
   都是 0。⇒ 这条的价值是「看关键词列表时不把整个面板的内容区滑走」，不是「防整页乱滚」。
3. §1.2：模板 <div class="button-row" style="margin-top: 1em;"> 与 CSS 的 margin-top: 0.75em 打架，
   内联胜出 ⇒ 改 CSS 调间距一直无效。删内联后**把那个 1em 收进 CSS**（不是顺手改成 0.75em —— 那是需求外的
   视觉改动），padding-top: 0.35em 保留 ⇒ 1.35em 与改前逐字一致（真机复测按钮行 gap 14px 未变）。
4. §1.4：panel._pickr / _huebee / _spectrum 全文只被读取、从未赋值，window.Pickr / Huebee / $ 也没有任何
   加载逻辑 ⇒ 三个 if 恒不执行；配套的 .pcr-app / .huebee / .sp-container 三条 CSS 同样永不生效。整段删除。
   踩到一个**自己给自己挖的坑**：第一版把这些标识符写进了「已删除」的注释里 ⇒ grep 型检查仍旧命中，等于
   死代码没删干净；改用中文描述后 11 个字面量全文 0 残留，闸门才能做「全文不含」这种强断言。保留
   #libraries-container —— 名字像「库容器」，实际是内置取色器的挂载点，不是死代码。
5. §1.5：行高由行内最高的子项决定（带颜色块的行走 .color-button = 0.8em 字号 × 2em ≈ 22.39px，不带色块的
   行走 .color-toggle-btn = 0.8em × 1.8em ≈ 20.16px）⇒ 真机 22.39 / 22.39 / 22.39 / 21 / 21。给
   .color-picker-row 加 min-height: 1.6em（正是颜色块那一档）⇒ 五行同高；刻意**不动按钮自身尺寸**
   （那会牵动标题栏/悬浮球那套成对闸门），align-items: center 保证内容仍垂直居中。代价是面板总高 +2.78px。
6. §1.3：确认 = primary（浅 #1f883d / 深 #238636）、取消 = neutral（浅 #f6f8fa / 深 #21262d）、
   重置 = danger（浅 #cf222e / 深 #da3633），与脚本里「添加」按钮（#2da44e 绿）同属一套语义。两个细节：
   ① 取消按钮的描边用 inset box-shadow 而非 border —— border 占盒模型，会让这颗按钮比另两颗高 2px
   （上一轮刚把面板间距调准，不做几何位移；真机复测三颗都是 27.98px）；② 配色**只写在两个
   prefers-color-scheme 块里**，写基座会盖住深色档（同权重时按源码顺序，而基座在前）。这也与对话框既有的
   「主题走媒体查询」机制一致 —— 它不能引 GitHub 变量，否则出现浅色对话框 + 深色变量错配。
7. §2.1：面板字号原是 --mgga-text-scale(1em) 定值 ⇒ 宽恒为 20em = 280px，而悬浮球上一轮已改成
   clamp(38px, 4.4vmin, 56px) ⇒ 4K 全屏下球长到 56px、面板纹丝不动，两者脱节。新增
   --mgga-panel-font: clamp(14px, calc(0.735vmin + 7.41px), 18px) 并让 .color-picker-dialog 用它；
   面板内所有尺寸都是 em ⇒ **只改这一个字号**，宽度/行高/间距/滚动条随之同比缩放。取值刻意让
   1280×896（vmin 896）落在 14px —— 与改前逐字相同，即「小屏观感零变化」，只在大屏上生长；1440p 及以上
   封顶 18px（面板 360px）。真机：2560×1440 → 359.88px / 17.994px，悬浮球 56px，两者同步。
8. §2.2：改前只有导航面板配了滚动条样式（10 余条手写规则，含 Firefox 的 @supports 兜底），设置面板一条都
   没有 ⇒ 在「始终显示滚动条」的环境（或 Firefox）里两处观感打架。抽成模块级生成器
   immersiveScrollbarCss(hosts, hoverHost)：导航 1 宿主 + 设置面板 2 宿主（内容区 / 关键词列表）。
   **规则搬进生成器必须同步搬断言**：规则一变成运行时生成，旧闸门在 injectNavDockStyle 切片里就找不到那段
   文本、直接假红；已改为「生成器里有没有 + 调用点传对宿主没有」，并加一条「切片内不得再出现手写
   ::-webkit-scrollbar」守卫单一来源。
9. 验证：离线 smoke **89/89 PASS**（新增 6 条：滚动条公共段 / §1.1+§1.6 / §1.2+§1.5 / §1.3 / §1.4 / §2.1）；
   红绿对照（MGGA_SCRIPT=.workbuddy/probe/prev-before-settings-audit.js = fd2495c）：**82 PASS / 7 FAIL**，
   7 条全是本次新改的判别器（分别点出：又出现手写 ::-webkit-scrollbar / 找不到公共段生成器 / 关键词容器又
   写回内联样式 / 按钮行又写回内联 margin-top / 还留着旧按钮色 #007bff / 死代码残留 window.Pickr /
   找不到 --mgga-panel-font 的 clamp 定义），既有 82 条一条没动。
10. 真机（iina/iina，两支探针各喂前后两版脚本对跑）：
    ① diag-settings-fix-verify.js → .workbuddy/probe/settings-fix-verify-{before,after}.json：
       关键词列表 overscroll auto ⇒ contain；五条设置行行高 22.39×3 + 21×2 ⇒ 22.39×5；三颗按钮
       #ff6b6b / #007bff / #ffa500 ⇒ #cf222e / #f6f8fa+inset / #1f883d（深色档 #da3633 / #21262d /
       #238636），三颗高度逐位相同（27.98px）；面板 1280×896 下 280×589.53 ⇒ 280×592.31（行高统一
       +2.78px）、2560×1440 下 280×589.53 ⇒ 359.88×749.53（字号 17.994px，球 56px）；滚动宿主
       scrollbar-width 保持 auto（守住 Chromium 121+ 那个坑）；按钮行 gap 14px 未变。
    ② diag-wheel-chain.js → .workbuddy/probe/wheel-{before,after}.json（只验 §1.1 的接力承接者，视口压到
       1280×520 逼出内容区溢出 —— 1280×896 下内容区并不溢出，主探针**测不出**这条，别据此认为它无效）。
    探针坑：主探针第一版把「滚轮接力」测试插在 1280 档之后，而它会清空关键词列表（塞占位条目让它溢出）
    ⇒ 后面几档的面板高度差出 165px（≈关键词列表在 600 高视口下的 max-height: 168px），纯属自伤；已把该步
    挪到所有测量之后 —— 破坏性步骤一律排在测量之后。
11. 未验证：滚动条**观感**未肉眼确认 —— headless Chrome 用 overlay 滚动条（offsetWidth − clientWidth
    恒为 0），根本不渲染经典滚动条与那对步进箭头 ⇒ 只能验到「声明同源 + 宿主正确 + 没写坏
    scrollbar-width」，观感需在「始终显示滚动条」的 Windows 环境或 Firefox 下目视；深色档只验了配色、
    未整体目视（hover 态、与面板边框的对比度）；§2.1 的系数只在两个端点取过证（1280→14px、1440p→18px），
    中间档位（1920×1080 → 15.35px）是算的、没逐档目视，4K 下 359.88×749.53 是否显得笨重也只有客观值；
    §1.1 只验了鼠标滚轮，触控板惯性滚动未单独验；Firefox / Safari、极窄视口（≤320px）、其它仓库未复测。
12. 回滚点：tag snapshot-settings-panel-audit-20260923（commit fd2495c）。审计清单 §2.3（面板内 unicode
    字形改 SVG）与 §2.4（抽「面板外壳」原语）本轮标注为不做。
]
v2026.9.23 [2026-09-23]
设置面板关闭按钮改用导航栏那套 <button>✕（补 button 复位三件套）；标题栏 → 第一行设置项间距由 2px 修正为 0.75em 行间节奏；两枚悬浮球改用共享的 clamp(38px,4.4vmin,56px) 尺寸与 --mgga-fab-icon 图标尺寸（设置球 31.36px / 导航球写死 44px ⇒ 两处同值且自适应），设置球图标由 unicode ⚙️ 改为 SVG（齿轮路径上提为 FAB_GEAR_PATH 单一来源）；新增两台球共享的温和入场动画（480ms，只动 opacity/scale）；导航球移除导航项数量蓝色气泡，并修掉「面板重建后新球不带隐藏类」的旧 bug
[
1. 需求（用户原话）：「Release页的设置面板的标题栏的关闭按钮请使用仓库页的导航栏的关闭按钮样式；
   标题栏和第一行 body > div.color-picker-dialog.visible > div.color-picker-content >
   div:nth-child(1) 设置项安全距离不正常。并将设置面板的悬浮球的图标改为SVG，不再使用unicode，
   并且做到与导航栏悬浮球一样跟随屏幕分辨率和比例自适应缩放尺寸，并保持同样大小。并增加共享的
   悬浮球弹出动画，页面刷新时触发，动画要求要温和不剧烈。导航栏的悬浮球的图标去除导航项数量蓝色气泡。」
   外加「再分析一下当前 Release 页设置面板有没有可优化处」。
2. 真机改前 → 改后（iina/iina，本次新建三支探针，原始数据 .workbuddy/probe/{fab-gap,fab-pop,
   settings-audit}.json）：关闭控件 SPAN× → BUTTON✕（hover 由 scale(1.1) 改为只换底色）；
   分割线 → 第一行 2px → 10.5px；两球尺寸 31.36 / 44（写死）→ 39.42@1280×896、47.52@1920×1080
   （两球逐位相同）；图标 unicode ⚙️ → SVG 16.16 / 19.47；蓝色气泡（原显示 15）已无；
   标题栏可视区仍 37.8px 未变（关闭控件高度 20.8 未动 ⇒ 标题栏标准没被牵连）。
3. 关闭按钮不是「抄 CSS」而是「换控件」：<button> 不继承页面字体、自带灰底与 2px 凹陷边框，
   所以除尺寸四件套（14px / line-height 1.2 / padding 2px 6px / radius 6px）外还必须补
   background: transparent、border: none、font-family: inherit。padding 刻意不动 —— 它同时是
   「两处标题栏共用标准」的一部分，改它会重新拉开两个标题栏的高度。
4. 第一行间距的真实来源：那 2px 不是内容区给的，是**标题栏自己的 margin-bottom**；而
   .color-picker-row 没有自身 padding（实测 0/0）⇒ 第一行紧贴分割线，与它下面各行的
   10.5px(0.75em) 不是一个节奏。修法写在**内容区**：padding: calc(0.75em - 2px) 0.35em 0 ——
   用 calc 表达「补足差额」，谁动了标题栏的 margin 它就自动跟着补，同时不碰两处共用标准；
   滚动时这段 padding 随内容滚出，与 GitHub 自身滚动区行为一致。
5. 悬浮球同源：:root 新增 --mgga-fab-size: clamp(38px, 4.4vmin, 56px)（vmin 同时吃宽高
   ⇒ 分辨率与比例都跟）与 --mgga-fab-icon: calc(var(--mgga-fab-size) * 0.41)（0.41 = 原来的
   18/44）。两处 width/height、两处 > svg 都写同一变量；并显式补 box-sizing: border-box
   （设置球是 div、导航球是 button，UA 对 button 默认 border-box，不写这句两球差 2px 边框）。
6. 设置球图标改 SVG：齿轮路径原本只存在于 buildNavDockFallbackIcon 的 ICON_PATHS.gear，现上提为
   模块级 FAB_GEAR_PATH 并让 ICON_PATHS.gear 引用它（与 GITHUB_MARK_PATH 同一套「路径只存一份」，
   2323 字符的路径出现次数已断言为 1）。SVG 不写 width/height 属性，尺寸交给 --mgga-fab-icon。
7. 入场动画（两台球共享一段 keyframes，页面刷新时各一次）：0%{scale:.9,opacity:0} →
   60%{scale:1.015,opacity:1} → 100%{scale:1}，480ms。**只能动 opacity 与 scale**：导航球的
   垂直居中靠 transform: translateY(-50%) !important，而 !important 在层叠里高于 CSS 动画
   ⇒ 动画一碰 transform 就被整条忽略（表现为动画名生效、球纹丝不动）；scale 是个体变换属性，
   与 transform 正交，缩放绕中心发生、居中不受影响。也不用 both/forwards 填充（终帧会永久接管
   opacity，「展开时把球隐藏」就再也压不回去）。JS 侧 triggerFabPop 只在确实新建了一枚球时挂
   class、animationend 摘掉、隐藏态跳过播；另加 prefers-reduced-motion 兜底。真机采样（挂钩装在
   脚本注入之前，记录 class 出现那一刻）：0.9/0 → 0.988/0.767 → 结束回到 none/1，刷新后重跑同曲线。
8. 蓝色气泡：徽标更新函数 + 2 处调用 + 整段 CSS 一并删除，smoke 新增「源码里再不许出现这两个
   标识符」的闸门防只删一半。**顺带修掉一个旧 bug**：面板重建（SPA/视口变化）时旧实现只在菜单与
   点击时同步展开态 ⇒ 面板开着时重建，新的悬浮球不会带隐藏类、会不该出现地冒出来；现在重建后
   补一次 setNavDockExpanded(navDockExpanded)。
9. 验证：离线 smoke 83/83 PASS；红绿对照（MGGA_SCRIPT=.workbuddy/probe/prev-before-fab-close.js
   = 16f8e69）：77 PASS / 6 FAIL，6 条全是本次新增的判别器（分别点出 SPAN / 没有 svg / 气泡还在 /
   缺 background: transparent / 不是 calc 形式 / 没有 --mgga-fab-size），既有 77 条一条没动。
   真机几何与动画见第 2、7 条。
10. 未验证：Firefox/Safari 未测（scale 属性 Chrome 104+/Firefox 72+/Safari 14.1+，更老的浏览器
   只会「没有入场动画」，不影响功能）；深色主题未跑真机；动画「温和不剧烈」是主观项（客观只有
   480ms 与峰值 scale 1.015）；极窄视口未复测；4K 全屏会顶到 56px 上限，未肉眼确认是否偏大。
11. Release 设置面板的可优化处另出一份清单（docs/discussions/2026-09-23-settings-panel-audit.md，
   真机三档视口体检）：优先项是关键词列表嵌套滚动的 overscroll 为 auto（会接力给页面，与导航
   面板的 contain 不一致）、.button-row 的 margin-top 有 CSS 0.75em 与内联 1em 两份（改 CSS 无效）、
   三条外部取色库适配分支恒不执行（_pickr/_huebee/_spectrum 全文无赋值）可删；另有面板宽度在
   2560 宽下仍 280px、三颗按钮配色硬编码且无深色变体、滚动条风格与导航面板不一致（本机 overlay
   滚动条量不到观感差异）等，均已列证据与取舍。
12. 回滚点：tag snapshot-fab-and-close-20260923（commit 16f8e69）。
]
v2026.9.23 [2026-09-23]
导航面板与 Release 设置面板的标题栏统一到导航栏那套标准（高度 52.09px ⇒ 29.8px 对齐），标题文本按标题栏宽度自适应缩小，导航栏标题栏补上设置面板的 GitHub 印记；追加修正：设置面板的**可视标题栏**（面板顶边 → 分割线）也统一到 37.8px
[
1. 需求（用户原话）：「将导航栏和 release 页的设置面板的标题栏统一一下，将高度改为导航栏的
   标准，标题文本自适应缩小，在导航栏的标题栏基础上再补上 Release 页设置面板的
   Github SVG icon 图标」。同时把 @version 由 2026.10.30 改为 2026.9.23。
   注：2026.9.23 是**降版**且该号历史上用过（见下同号条目 [2026-09-18]）——
   已装 2026.10.30 的用户不会自动收到本次更新；其余改动都不依赖这个字面量。
2. 改前差距（真机实测，不是估的）：导航栏标题栏 29.8px / padding 2px 4px 6px /
   margin-bottom 2px，设置面板 52.09px / padding 0 0 7px / margin-bottom 14px /
   标题 17.5px bold。**高度差的真正来源不是 padding，而是最高的那个子项**：
   标题栏高度 = max(子项高) + 上下 padding + 下边框，而设置面板的关闭按钮是
   1.5em（24px）+ .3em 上下 padding ≈ 43px 高，比标题文本高出一大截 ——
   只拉平 padding 而放着它不管，真机上两处仍然差 23px。
3. 修复（两处逐项对齐到导航栏那套）：padding 2px 4px 6px、margin-bottom 2px、
   border-bottom 1px solid、标题字号 13px、字重 600、标题色取 muted、关闭按钮统一为
   14px / line-height 1.2 / padding 2px 6px。设置面板那条下边框用**主题无关**的中性灰
   rgba(125,125,125,.25)：它的配色走 prefers-color-scheme 媒体查询，与导航栏的
   --borderColor-muted（跟随 GitHub 主题）是两套体系，直接引用变量会出现
   「浅色对话框 + 深色变量」的错配。
4. 标题文本自适应缩小：标题栏加 container-type: inline-size，标题字号写成
   「13px 兜底 + clamp(11px, 6.5cqi, 13px)」—— 兜底声明必须在 clamp 之前，因为 cqi
   在旧浏览器里是非法单位、整条声明会被丢弃。6.5% 让内容宽 ≥200px 时都停在 13px：
   两处标题栏常态下都在这条线以上（真统一），只有挤到 200px 以下才逐档下降，11px 封底。
   图标宽高用 em，跟着标题一起缩（真机 14.16px → 12.7px → 12.09px）。省略号保留作最后
   兜底（min-width:0 + overflow:hidden + ellipsis），缩到底仍放不下时退到截断，
   绝不把关闭按钮挤出去。
5. 导航栏补 GitHub 印记：顺手把这枚 16px octicon 收敛成单一来源 —— 它原先在设置面板里
   内联了两份（buildSettingsDialogHTML 初始模板 + updateDialogColors 重绘），本次导航栏
   又要接同一枚，三处各存一份必然改漏。改为 GITHUB_MARK_PATH 常量 + githubMarkSvg(em)，
   三处调用。导航栏用 insertAdjacentHTML("afterbegin") 插在文字**之前**，所以
   title.textContent 仍是纯 "MGGA"（静态闸门按 NAV_DOCK_BRAND 断言，无障碍名走面板的
   aria-label，都不受影响）；同时补上 aria-hidden="true" focusable="false"
   （改前设置面板那枚没有，真机实测 ariaHidden=null）。
6. 验证（三层）：
   ① 离线 smoke：76/76 PASS。新增「导航面板标题栏：补上设置面板的 GitHub 印记」
      （印记是标题首个子节点 + viewBox 16 + aria-hidden + path 与 GITHUB_MARK_PATH
      逐字符同源 + textContent 仍为 MGGA）、「版本号：导航面板角标取自 @version 单一来源」
      （设置面板那一半在「打开设置面板」场景断言），以及源码闸门「两处标题栏：高度与字号
      标准成对一致 + 标题字号按标题栏宽度自适应缩小」—— 两处 padding/margin-bottom/
      border-bottom/container-type/字号兜底与 clamp 的先后/字重/ellipsis/关闭按钮尺寸
      逐项对齐，印记路径全仓只 1 份、调用点恰好 3 处。
   ② 离线红绿：新断言喂给修复前版本 ⇒ 共 76 项，PASS 74，FAIL 2
      （缺 GitHub 印记 svg、设置面板缺高度标准）。既有 73 条一条没动。
   ③ 真机几何（.workbuddy/probe/diag-titlebar-live.js，iina/iina，1280/320/200 三个视口）：
      标题栏高度 29.8px vs 52.09px ⇒ **29.8px vs 29.8px**，且三个视口下都纹丝不动
      （高度由关闭按钮决定，与标题字号解耦 ⇒ 自适应缩小不会把标题栏高度带跑）；
      导航栏标题字号 12.87 → 11.56 → 11px（下限），印记同步缩到 12.09px，标题溢出恒 0；
      设置面板 13px（320px 视口仍有余量，不该缩就不缩）→ 11px（200px 极窄视口）；
      两处版本号都显示 v2026.9.23。
      另外实测**排除**了一个推断风险：container-type 带来的尺寸包含会让标题栏不再参与面板的
      width: fit-content，面板有塌到 min-width 的风险 —— 实测两版面板宽逐字相同
      （1280px 下 220px、320px 下 199.8px），宽度始终由条目区决定，无回退。
 8. 追加修正（同版本号，不再改版本）：用户反馈「Release 页面设置面板的标题栏高度仍然和导航栏
    标题不一致，并且没有在标题栏内垂直居中」。真机细粒度探针（.workbuddy/probe/diag-titlebar-fine.js）
    量出真相 —— 两处 .header 的 border-box 高度**上一版就已经一样**（29.8px vs 29.8px），
    差距在它**上方**：导航面板要 border 1px + padding 6px 才到标题栏顶边，而设置对话框自己
    还有 padding 1.25em(17.5px)。用户眼里的“标题栏”是「面板顶边 → 分割线」这段可视区：
    设置面板 49.3px vs 导航栏 37.8px，标题在这段里还偏下 6.25px —— 两个症状同一个根因。
    修法：.color-picker-dialog 的 padding 由 1.25em 改为 6px 1.25em 1.25em（顶部与导航面板的
    面板内边距一致；左/右/下保持 1.25em，内容区的呼吸不变）。
    修后三项指标与导航栏逐字相同：顶边→标题栏顶边 7px、可视标题栏高 37.8px、
    标题相对可视区中心 +0.5px（导航栏 +0.49px）；.header 仍为 29.8px。
    一个刻意保留的取舍：标题栏的上下 padding 继续用导航栏那套 2px/6px，**不**改成对称的
    4px/4px —— 眼睛判的是相对“可视区”中心的偏差，2/6 恰好把内容摆在可视区中心（+0.5px），
    改成对称反而会让两处一起偏下 3.5px。
 9. 闸门补强：上一版的静态闸门只锁 .header 自己的声明，所以它对这次的差异**全绿** —— 这正是它
    漏掉的原因。现新增一条锁**面板自身的顶部内边距**（两处必须相等且为 6px）。红绿可证：
    新断言喂给修复前版本 = 76 PASS / 1 FAIL（失败信息直接点出 1.25em vs 6px）；修复后 77/77。
    回滚点：tag snapshot-titlebar-vcenter-20260923（commit b5e4689）。
7. 回滚点：tag snapshot-titlebar-unified-20260923（commit 32dd2cb）。
]

v2026.10.30 [2026-09-23]
nav dock 标题栏移出滚动容器，滚动条只覆盖条目区、不再涵盖标题栏（真机实测宿主 39–213px vs 标题栏下沿 37px）
[
1. 需求（用户原话）：「那么滚动条应该排除标题栏区域，不再涵括标题栏
   （#mgga-nav-dock > div.mgga-nav-dock-header）」。
2. 根因：上一版结构是「面板自己既是容器又是滚动口」—— 标题栏靠 position:sticky 钉住，
   只是让它"不跟着滚走"；但**滚动条是滚动容器绘制的**，必然覆盖容器整个 border-box
   纵向范围，而 webkit 自定义滚动条也没有"从第 N px 开始画"的能力（track / thumb
   都不接受纵向偏移约束）。⇒ 只要滚动容器还是面板本身，滚动条就一定画过标题栏那一行，
   sticky 治不了它。
3. 修复：改结构，把标题栏移出滚动容器 —— 面板 flex 纵向排列 + overflow:hidden
   （自己不再滚），条目与分割线下沉进新的滚动区 .mgga-nav-dock-body
   （flex:1 1 auto + min-height:0 + overflow-y:auto + overscroll-behavior:contain）。
   滚动条伪元素从 #mgga-nav-dock::-webkit-scrollbar* 全部改挂到该滚动区上，
   Firefox 的 @supports(-moz-appearance:none) 兜底同样改挂。
   上一版为 sticky 配的四件套（position:sticky / top:0 / z-index / 不透明背景 /
   同色 box-shadow 补边）**全部删除** —— 它们解决的是"滚动内容从标题底下穿过"，
   而现在滚动内容与标题根本不在同一层，那个前提没了；其作用由 flex:0 0 auto 取代
   （面板被压短时只压缩滚动区，标题栏不被压缩）。
4. DOM 结构变更的副作用：面板直接子节点从「header + 全部条目」变成「header + body」
   两段，条目与分割线下沉一层 ⇒ 按 div:nth-child(N) 定位分割线要改写成
   #mgga-nav-dock > .mgga-nav-dock-body > div:nth-child(N)。NAV_DOCK_STRUCT_VER
   由 16 升到 17，旧面板强制重建一次。
5. 验证（三层）：
   ① 离线 smoke：73/73 PASS（重写滚动条闸门与标题栏闸门、面板标题栏 DOM 断言增加
      "标题栏不得落在滚动区里"、侧栏分组断言改从滚动区取子节点）；红绿把新断言喂给
      改动前脚本 ⇒ 69/73、FAIL 4，四条全部是本次触及的断言。
   ② 真机功能：verify-live-navdock.js 场景 7.5 重写为「量滚动条宿主的纵向范围」——
      改后 30/30 PASS，宿主 = .mgga-nav-dock-body、纵向 39–213px、标题栏下沿 37px
      ⇒ 零重叠；改前 29/30，宿主 = #mgga-nav-dock、纵向 0–220px ⇒ 必然画过标题栏。
      两版 scrollTop 0→160、标题相对面板顶边 7→7px、首条目 39→-121px 完全一致
      ⇒ 本次没有回退上一版"标题钉住"的成果。
   ③ 探针踩坑（第二次栽在测量时机）：7.5 第一版把宿主 rect 取在设置 max-height 之前、
      面板 rect 取在之后，面板居中位置移动了 162px，两个坐标系混在一起 ⇒ 宿主量成
      -124→376px、误报 FAIL。新增的 INFO 7.5d 布局诊断
      （bodyRectH/bodyClientH/flex/minHeight）立刻指出脚本侧正常、问题在探针。
      修法：宿主 rect 必须与面板 rect 在同一时刻取。
6. 未验证：真机只跑了浅色主题；headless Chrome 用 overlay 滚动条（本场景"滚动条占位
   0px"即其证据），所以 Windows 经典滚动条下的实际观感未实测 —— 滚动条距面板右边框
   6px、而关闭按钮距 10px，可能有轻微不对齐，必要时给滚动区加 scrollbar-gutter:stable；
   Firefox / Safari 未实测。
]


v2026.10.29 [2026-09-23]
nav dock 标题栏改为 position:sticky 钉住，滚动时不再被推出容器裁掉（真机实测零位移）
[
1. 需求（用户原话）：「导航栏的标题栏（#mgga-nav-dock > div.mgga-nav-dock-header）
   应该固定不参与滚动，不再因为滚动而导致导航栏的标题超出容器被截断隐藏」。
2. 根因：面板自己就是滚动容器（overflow-y:auto + max-height:calc(100dvh - 1em)，
   见上一版沉浸式滚动条），而标题栏只是它的**第一个普通流子节点** ⇒ 跟条目一样参与滚动，
   滚一段就被推出滚动口、连关闭按钮一起被容器裁掉。面板高度锁在 100dvh，长仓库页 /
   小视口下必然溢出，所以这是必然而非偶发。
3. 修复：给 .mgga-nav-dock-header 加 position:sticky + top:0。但 sticky 一条不够，
   另有三处配套缺一不可：① background 不透明（否则滚上来的条目从标题底下透出来、
   字叠字）② z-index:2（条目/分割线是普通流元素，显式压住）③ 同色 box-shadow
   `0 2px 0 0` 补边（填平 margin-bottom 那 2px 缝，否则缝里漏出滚动内容 ——
   它不是阴影，是背景的向下延伸）。背景取与面板同色是刻意的：标题钉住时会被面板
   border-radius:12px 圆角裁切，同色 ⇒ 裁切看不出来，不会"缺一个角"。
4. **实测关键事实（真机量的，不是推断）**：面板 border 1px + padding 6px，
   Chromium 把 sticky 钉在**内容盒顶边** ⇒ 标题停在距面板顶边 7px 处，
   连那 6px 内边距都保住了，静止→滚动是**零位移**（不是"先滑 6px 再钉住"）。
5. 新增真机场景 7.5（tools/verify-live-navdock.js）：内联 max-height:220px!important
   把面板压到必然溢出（只改约束、不碰被测样式），设 panel.scrollTop 前后各测一次
   标题与首条目相对面板顶边的位置。归一化到"面板顶边"而非视口顶边，因为面板是
   position:fixed + translateY(-50%)。
6. 真机红绿（同一次运行）：改后 **30/30 PASS**，7.5 PASS —— position=sticky，
   标题 7→7px 不动、首条目 39→-121px 滚走；改前 **29/30**，7.5 FAIL —— position=static，
   标题 7→**-153px**（位移恰好 -160px = 滚动距离，正是用户报的"被推出容器裁掉"原样复现）。
   其余 29 条两版一致 ⇒ 本次改动没波及既有行为。
7. 离线：新增源码级闸门五条（sticky / top:0 / z-index / 不透明背景 / 同色补边）
   + DOM 级断言"标题栏必须是 panel.firstElementChild"（它才是被钉住的那个，
   分割线的 div:nth-child 编号也依赖这个位置）。smoke 72 → **73/73 PASS**；
   红绿旧版 **72/73、1 FAIL**，红的恰是本次那条。
   为什么必须用源码闸门：jsdom 没有排版层也不实现 sticky，运行期验不了"钉住"，
   只能源码锁声明 + 真机场景 7.5 验它真的生效，两者缺一不可。
8. 判据踩坑：7.5 第一版写成 `deltaTop ≈ 0`（想当然认为钉在面板顶边），实测 7px ⇒ 误报 FAIL。
   正确判据是「标题相对面板顶边**前后一致**」而不是钉到某个绝对值。
   又一次印证：写推断时必须同时写下能证伪它的观测点。
9. 未验证：真机只跑了默认浅色主题（深色下两个 CSS 变量是否都命中、圆角裁切是否露馅未实测，
   可加判据 `getComputedStyle(header).backgroundColor === getComputedStyle(panel).backgroundColor`）；
   面板不溢出时 sticky 无视觉作用属正常；Firefox / Safari 未实测。
10. 回滚点 `b261c00770a44f800d39e537583d764604a64a2b`；取证与复现见
    docs/fixes/2026-09-23-navdock-sticky-header.md。
]

v2026.10.28 [2026-09-23]
nav dock 滚动条改为沉浸式：干掉 Windows 经典滚动条的上下步进箭头，轨道透明、滑块悬停显形，并隔离滚动接力
[
1. 需求（用户原话）：「有没有更沉浸的滚动条？我想导航栏的滚动条再沉浸一些，
   起码不再显示滚动条上下顶端底端的步进箭头」。
2. 定性：改前样式表里 "scrollbar" 出现 0 次 ⇒ 面板走浏览器默认滚动条；面板自己带
   overflow-y:auto（max-height: calc(100dvh - 1em)）⇒ 它自己就是滚动容器。Windows 版
   Chrome/Edge 默认渲染的是**经典滚动条**，用户看到的那对箭头是
   ::-webkit-scrollbar-button 伪元素，不是内容也不是我们的元素，只能 CSS 关掉
   （overflow:overlay 早已废弃）。
3. 改动一：基座规则补 overscroll-behavior: contain —— 面板滚到两端不再把滚动接力给
   整页（"沉浸"体感最强的一条），与设置对话框里 .color-picker-content /
   .custom-color-picker-panel 的既有做法一致。
4. 改动二：新增滚动条块 —— ::-webkit-scrollbar 8px；track / track-piece 全透明去边框；
   ::-webkit-scrollbar-button 四组状态 + scrollbar-corner 一律 display:none 且尺寸归零；
   thumb 用 rgba(127,127,127,.28) + 2px 透明描边 + background-clip:padding-box（视觉厚度
   只有 4px），悬停面板 .5、悬停滑块本身 .72。**没有**把滑块做成"完全隐形只悬停出现"：
   面板高度常常溢出，静默不可见会让人发现不了下面还有内容 —— 折中留一抹淡灰。
   颜色用两极中点灰而非主题变量，明暗主题同一份对比度。
5. Firefox 兜底：@supports (-moz-appearance: none) 里给 scrollbar-width:thin +
   scrollbar-color（Gecko 本来就不画箭头，只缺细条）。该探测在 Chromium 恒 false，
   不污染 webkit 规则。
6. **最大的坑（无声失败）**：Chromium 121+ 里只要某元素的 scrollbar-width 不是 auto，
   该元素上整组 ::-webkit-scrollbar* 规则会被**直接忽略** —— 箭头原封不动回来，且不报错、
   DevTools 里规则看着"有效"。也就是说"顺手补个 scrollbar-width:thin 兼容一下"恰好会
   毁掉本次全部改动。⇒ 特意用 @supports 把它关在 Firefox 专属块里，并在源码注释写明原因。
7. 第二个坑：样式表整体是 JS 模板字符串，注释里写反引号包裹的标识符（`::-webkit-scrollbar-button`）
   会让模板串提前闭合 ⇒ node --check 直接 SyntaxError。注释里一律改用中文引号「…」。
8. 验证：新增源码级闸门断言（滚 5 条）—— ①::-webkit-scrollbar-button 必须 display:none；
   ②**基座规则体内不得出现 scrollbar-width**（防 6 的无声失效）；③基座规则体内仍有
   overflow-y:auto；④仍有 overscroll-behavior:contain；⑤@supports 块与 scrollbar-width:thin
   都在。闸门只取 injectNavDockStyle→removeNavDock 之间的切片，不误伤页面别处。
   smoke：71 → **72/72 PASS**；红绿旧版（87ad71b）**71/72、1 FAIL**，红的恰是本次那条。
9. 未验证：真机未跑且跑不出结论 —— 验收对象是 ::-webkit-scrollbar-button 的**渲染**，
   而唯一能自动截图的是 **headless Chrome，它用 overlay 滚动条、根本不渲染箭头**，
   改与不改截图一样 ⇒ 需用户在自己浏览器里目视确认（右侧不再有上下带三角的按钮、
   轨道无浅灰底色、滑块变细且淡）。滑块静止透明度 0.28 是估的不是量的，嫌显眼就调到 0
   （即"完全隐形、只悬停出现"）。
10. 回滚点 `87ad71bb87a3435dee474135a8ac14b2b701b92f`；取证与复现见
    docs/fixes/2026-09-23-navdock-immersive-scrollbar.md。
]

v2026.10.27 [2026-09-23]
nav dock 面板标题改为品牌名「MGGA」，并去掉各分区的小标题（只留分割线）
[
1. 需求（用户原话两条）：① 把 #mgga-nav-dock > div.mgga-nav-dock-header >
   span.mgga-nav-dock-header-title 的文案改成「MGGA」；② 去掉三个分区各自的小标题。
2. 先取证再动手：用户给的两个选择器（#mgga-nav-dock > div:nth-child(11)、
   div:nth-child(15)）到底指向哪个元素，用留档的真实（注水后）DOM 跑主脚本数出来 ——
   #mgga-nav-dock 的直接子节点里，除首个子节点 .mgga-nav-dock-header 外**只有**
   .mgga-nav-dock-divider 是 div（条目全是 <a>）。iina 注水页实测子节点 18 个：
   header(1) → 仓库 tab ×8(2..9) → 分割线(10，小标题 "Repository files") →
   文件区 tab ×3(11..13) → 分割线(14，小标题 "Sidebar") → 侧栏 ×4(15..18)。
   用户页上编号整体 +1（即仓库 tab 多一项）⇒ 他给的两个 div 就是这两条**分割线**
   （小标题是分割线内的 span）。2 条分割线 ⇒ 3 个分区，与"三个分区"吻合。
3. 改动：标题文案改用新增常量 NAV_DOCK_BRAND = "MGGA"（品牌名不是可本地化文案，
   与同一 header 里 verSpan.title = "Make-GitHub-Great-Again" 同理），面板的
   无障碍名仍是 panel.setAttribute("aria-label", i18n.t("navDock"))，未动。
4. 分区小标题：buildNavDockPanel 不再创建 .mgga-nav-dock-divider-caption，
   分割线本身**保留**（只画线）—— 用户要的是"去掉小标题"，不是"去掉分组线索"，
   所以不动分组的视觉结构；样式表里 caption 规则同步删除，divider 规则去掉
   只为承载文字而存在的 display:flex / align-items / gap / padding-top。
   item.barLabel 继续采集（点击决策日志 statsOut.barBuckets 的证据链要用），
   只是不再渲染 —— 已在代码注释里写明，防止后来者当死字段删掉。
5. NAV_DOCK_STRUCT_VER 15 → 16：DOM 结构变了（少一个 span），旧面板强制重建一次。
6. 验证：jsdom 冒烟 71/71（新增 2 项 + 改写 1 项）。红绿对照：同一套断言喂修复前
   版本（MGGA_SCRIPT=.workbuddy/probe/prev-before-panel-titles.js）⇒ 71 项中 3 项
   FAIL，恰好是"标题=MGGA / caption 零残留 / 分割线不带文字"这三项，其余 68 项不变。
   另在留档的真实注水 DOM（.workbuddy/probe/hydrated-{desktop,mobile}.html）上就地
   复验：标题 = "MGGA"、caption 文本 = []、分割线 2 条、锚点仍 15 条。
   详见 docs/fixes/2026-09-23-nav-dock-panel-titles.md。
]
v2026.10.26 [2026-09-22]
nav dock 新增「页面外露探测」：页面上没被收纳进 More 的项直接定位到它自身，被收纳进 More 的项不再定位、直接跳转对应 URL
[
1. 需求：用户要求"增强导航栏对页面上没有收纳进 More 中外露出来的项的探测 ——
   如果项在页面上依然存在（没被折进 More）就直接定位而不是直接跳转 url；反之被
   收纳折叠进 More 就直接跳转对应 URL 不再立即定位"。开工前先与用户确认两个边界：
   ① 规则只作用于"本页有落点"的项（文件区 tab / 侧栏区块 / 当前页自身），跨页项
   （Issues / Actions / Releases…）保持一键导航；② 定位落点取**页面上该项自身**
   （点面板里的 Code → 滚到页面上 Code 那个入口），不再是笼统的"回内容区顶部"。
2. 新增探测层 navDockSourceVisibility(item) → {state, el}，四类状态：
   detached（源锚点不在文档里 / 该条目根本没有源锚点）、gone（被 `[hidden]` 或 CSS 的
   display/visibility/opacity 藏起来）、more（**已被收纳进 More**：最近的 aria-hidden
   祖先是 li 且其内唯一锚点就是它，或几何上被单行 overflow 容器裁到栏外）、
   exposed（外露可见）。几何判据加了 `cr.width && ar.width` 这道门：没有排版层时
   （jsdom / display:none）两侧 rect 都是 0，"无交集"是假象而不是剪裁证据。
   探测在**点击时实时**做、不依赖面板重建 —— 因此"剪裁只改 aria-hidden / tabIndex、
   不改 href、廉价签名不变、面板不重建"这条已知特性不会干扰判定。
3. 分诊（handleNavDockItemClick 路径 4：落地路径 == 当前页的项）由"同页就回内容区
   顶部"改为二分诊：外露 ⇒ 接管 + 定位到该项自身（navDockScrollToTarget(vis.el)），
   一次导航都不发（via=page-item）；被收纳进 More ⇒ 页面上没有可见落点，一次定位
   都不做，放行这次点击让真实（Turbo / React 软）导航走完（via=page-item-hidden）。
   `?tab=<x>-ov-file` 例外**优先于**外露探测（否则用户会"点了 Code 却还看着
   License"），该例外本身未改动。
4. 一次被真机推翻的实现（**已回退，别再试**）：第一版把"收纳即放行导航"也套到了
   路径 3（文件区概览 tab：License / Contributing / "MIT license"）。真机 400px 立刻
   证伪 —— 点 vscode 的 MIT license 走 file-tab-hidden 后 docId 从 16058363578639023
   变成 4421299704736088（**整页重载**），URL 落到 /microsoft/vscode/blob/HEAD/license。
   根因：这些 tab 的 href 是 React 路由占位 `#`，面板上的落地路径是
   resolveFileAreaTabHref 从页面证据**反推**的，反推失败时用兜底猜的文件名
   （entry.names[0] = "license"），而 vscode 的真实文件叫 LICENSE.txt ⇒ 落到不存在的
   路径 ⇒ 301 ⇒ 整页重载。旧版从没暴露是因为它走"切 tab"（React 客户端路由），
   根本不用那个 href。⇒ 路径 3 维持原样（无论是否被收纳都切 tab），并留一条断言
   （tools/smoke-load.js 场景 3h-3）把"别再套用放行规则"钉住。
5. 真机取证（新增探针通道：验证工具在闭包出口前把判定函数挂到 window.__mggaProbe，
   直接调用**真实函数**取真值，而不是靠肉眼判断）。页面 nav 入口可见性统计 ——
   iina 桌面 1280：exposed 79 / more 0；iina 400px：exposed 18 / more 0；
   iina 320px：exposed 16 / **more 2**（Contributing、License）；vscode 桌面：
   exposed 21 / more 0；vscode 400px：exposed 17 / **more 3**（Contributing、
   MIT license、Security）。⇒ 判定确有区分度（不是恒值），剪裁样本与
   probe-mobile-more-structure.js 早先的 320px 结论一致。
6. 真机点同页 Code：iina 320/400px 下 INFO 2.0 显示页面上 Code 入口判定为
   "exposed,gone" ⇒ 走 via=page-item，实测 top=132 y=132 off=0 elTop=0（定位到页面上
   Code 入口自身并吸顶），docId 全程不变（无整页重载）。
7. 验证：jsdom 冒烟 69/69（新增 3 条断言）；**红绿对照** —— 同一套断言喂修复前版本
   （MGGA_SCRIPT=.workbuddy/probe/prev-before-page-exposed.js）得 67/69，红的恰是两条
   新能力断言（"未定位到页面上该项自身：elTop = -16"、"页面上已看不到这一项，却仍被
   接管定位"）；真机五组：iina 400px 28/29、iina 320px 28/29、vscode 400px 28/29
   （该组回退前为 21/22 且带一次整页重载）、iina 桌面 29/29、vscode 桌面 29/29。
   唯一 FAIL 恒为 8.1（跨页条目走软导航）：via=pass-through 说明脚本侧放行正确，是页面侧
   没接住这次点击 —— 修复前版本跑真机同样 FAIL，属**既有偶发**。
8. 工具同步：tools/verify-live-navdock.js 新增 MGGA_SCRIPT（红绿对照）与 --width
   （`--width 320` 复现折进 More 的形态）；locateScenario 支持"零定位"与"放行后确实
   跳走"两种新断言；0.8 场景把可见性真值打进日志。取证细节与"未验证项"见
   docs/fixes/2026-09-22-navdock-page-exposed-probe.md。
]
v2026.10.25 [2026-09-22]
nav dock 修掉移动端首帧初始化时「收纳进 More 的项」丢失(Primer UnderlineNav 剪裁项被 aria-hidden 规则误杀)
[
1. 缘起:用户报告"当脚本首次就在移动端页面初始化时还是会仍然丢失收纳进 More
   (#_R_1afl_)的项,而其它栏收纳进 More 的项却正常显示"。拆成三条可验证判据:
   ① 只有某一栏丢,不是全丢;② 只在**首帧就在窄视口**时丢;③ 该栏 More 的
   aria-controls 指向的运行时 id 形如 _R_1afl_。
2. 根因:取数链里这条规则的判据太粗 ——
   `if (!isFileTab && a.closest('[aria-hidden="true"]')) return reject(a,"ariaHidden")`。
   [aria-hidden=true] 在这套 DOM 里承担两种**相反**语义,而规则只看其一:
   ① 装饰/重复包装层(wrap spacer 空 li / 含多锚点的包装 div)⇒ 该剔除;
   ② **剪裁项**:当前放不下、已折进 More 的导航项(li[aria-hidden] 内唯一锚点)
   ⇒ **必须索引**。混为一谈的后果就是后者整批丢。
3. 组件源码取证(@primer/react@38.40 dist/UnderlineNav/UnderlineNav.js +
   UnderlineNavItem.js):`isOverflowing = useIsClipped(ref)`(IntersectionObserver,
   root=nav)⇒ `<li aria-hidden={isOverflowing || undefined}><a href={href}
   tabIndex={isOverflowing ? -1 : undefined}>`。即**剪裁项本体仍在 DOM 里、href
   完整**,只是所在 li 被标 aria-hidden;More 菜单是 ActionMenu.Overlay,**只在
   展开时渲染**,里面那几份是同一批项的**副本**,不是唯一来源。可见性走 CSS:
   MoreButtonContainer 的 --UnderlineNav_moreButton-display 由
   [data-has-overflow=true] 切成 flex。
4. 版本对齐证据(证明 GitHub 现网就跑这一支):该版本 CSS 模块导出的类名与本地
   留档 SSR **逐字一致** —— prc-UnderlineNav-UnderlineWrapper-GWONT /
   ItemsList-oj8gN / WrapSpacer--aLgz / MoreButtonContainer-Dnrq6,SSR 上还带
   data-overflow-mode="wrap"(该版本为硬编码)、data-hide-icons-breakpoint="medium"。
5. 真机结构取证(新探针 tools/probe-mobile-more-structure.js,逐栏量化"零点击可读"
   与"只能靠点击才拿到"):同一仓库 iina/iina 只改视口宽度 —— 400px 时
   Repository files 栏 3 锚点全可见、aria-hidden 祖先 0;320px 时同一栏 3 锚点
   只剩 1 个可见、**aria-hidden 祖先 2 个**,被剪裁的正是 Contributing / License,
   且两项都符合"li[aria-hidden] 内唯一锚点",同时 More items 触发器出现。
   ⇒ 机制在真机 + 真 Primer 构建上复现。
6. 为什么只在"首帧就在窄视口"暴露:剪裁是**布局驱动**的,改变的是
   aria-hidden / tabIndex,**不改 href**;navDockCheapSignature 只统计栏内锚点
   href ⇒ 桌面首帧加载后再缩小,签名不变、下轮走早短路、面板沿用桌面那次收好的
   条目,看起来"正常"(一旦别的原因触发重建同样会掉)。首帧就在窄视口时,第一次
   构建读到的就已是剪裁态 ⇒ 直接丢。
7. 代码内另有史证:文件区那条豁免正是为同一现象加的 ——
   "文件区白名单占位 tab:即使 GitHub 在窄视口下隐藏了所在 li,也在 dock 中保留"。
   文件区 tab 靠 isFileAreaTabLabel 白名单绕过了 ariaHidden 过滤(所以用户看到
   "其它栏正常"),**仓库标签栏没有这条豁免**,于是整批丢。
8. 修复:新增 isClippedNavItemAnchor(a, ariaHiddenHolder),判据三重收紧 ——
   ① 最近的 aria-hidden="true" 祖先是 `<li>`(项容器,不是包装 div/ul);
   ② 该容器内 a[href] 恰好 1 个;③ 那个锚点就是本锚点。带构建哈希的模块类名
   (-syRjR)不可依赖,故只用结构与 href 判定。直扫过滤改为
   `ariaHiddenHolder && !isClippedNavItemAnchor(a,holder) ⇒ reject`。放行后仍走
   pushItem 的同名/同目的地去重链,重复项不会因此泄漏。**零点击设计不变** ——
   剪裁项本来就在 DOM 里、href 完整,无需点开 More 取数。
9. 回归:tools/smoke-load.js 新增夹具 repoHomeHTMLPrimerOverflow()(剪裁项形态,
   类名含哈希后缀,用来证明修复**不依赖类名**)+ decorativeAriaHiddenNavHTML()
   (反向样本:多锚点包装 div、非 li 容器)+ 场景 3e 共 5 条断言。
10. 验证:node --check(主脚本 + 两个探针)通过;node tools/smoke-load.js
    **67/67 PASS**;红绿对照(MGGA_SCRIPT=.workbuddy/probe/prev-before-primer-clip.js)
    **FAIL 2** —— "剪裁溢出项全部进入面板"(Pull requests missing; got Code/Issues)、
    "条数与去重正确"(收到 2 项而非 7 项),断言确实命中真问题;反向闸两条 Decoy
    均未进面板(规则没被放宽成"aria-hidden 一律放行");真机移动端 iina
    **28/28 PASS**、真机桌面端 microsoft/vscode **28/28 PASS**。
11. 真机首跑出现过 8.1「跨页条目走软导航」单条 FAIL。对照留档(live-d4 /
    live-diag-iina-mobile / live-iina-desktop / live-vscode-mobile 等)该条**历史
    多轮同样偶发 FAIL**,工具源码注释也已自述"实测 6 次里 2 次没触发";复跑同参数
    即 28/28。判定为既知偶发,与本次改动无关。
12. 未验证/边界:**登录态真机未复跑**(用户报的那一栏在登录态新版 React 仓库头部,
    本机无凭据)。替代证据是"同版本 Primer 组件源码 + 真机 320px 剪裁分支 +
    版本类名逐字对齐 + jsdom 红绿"四段闭合。若登录态仍丢,下一步取证点已在
    docs/fixes/2026-09-22-navdock-primer-clipped-items.md 写明:看
    `[MGGA] nav dock: click decision` 的 bar= / ariaHidden= 分桶计数,若某栏
    ariaHidden 仍 >0 且触发器可见,说明还有第二种剪裁形态(如 hidden 挂在锚点
    本身、或容器不是 li),届时按同一判据放宽。
13. 新增 tools/probe-mobile-more-structure.js(支持 --url/--mode/--width/--out):
    按栏输出锚点数/可见数/aria-hidden 祖先数/[data-menu-item] 数/剪裁项清单/
    aria-controls 目标存在性与"点开 More 后新出现的锚点"。它把"零点击可读性"
    从推断变成可量化,以后遇到同类"某项为什么没进面板"先跑它。
14. 版本号 → 2026.10.25。
]

v2026.10.24 [2026-09-22]
nav dock 新增「侧栏」来源(Releases/Sponsor/Contributors/Languages) + 修掉 ?tab= 残留 + 打通真机验证通道
[
1. 缘起:用户要求把仓库侧栏区块接进 dock,并同时确认了三件事 —— ① 每个区块
   只出一条主链接(不是把区块里的每条子链接都铺开);② 面板位置放在文件区 tab
   之后;③ 顺手修掉"在 License 视图下点 Code 内容还停在 License"。
   另一条并行诉求是:上一版的 4 个 nav-dock 修复要做真机验证。
2. 前置取证(见 docs/fixes/2026-09-22-sidebar-pane-dom-evidence.md)已给出结论:
   侧栏区块**不是 `<nav>`**(四视口场景实测 nav 恒 4 个,PaneWrapper 内 nav 数 = 0),
   findRepoHomeNavBars() 永远收不到它们 —— 这是结构空缺,不是可以靠放宽选择器
   绕过的,要进 dock 必须新增一条独立来源。本次即其实现。
3. 取数:新增三个函数。repoHomeSidebarGrid() 定位 PaneWrapper 内的
   [class*="borderGrid"];repoHomeSidebarHeadingLabel(h2) 剥离 CounterLabel +
   VisuallyHidden 得纯名;repoHomeSidebarSectionEntries() 一个区块一条主链接。
   **选择器只用 [class*=] 前缀与 data-component**(GitHub 设计系统标记),
   不用带构建哈希的完整模块类名(SidebarSection-module__sectionHeading__TG36m
   那类 —— 哈希一变即失效)。
4. 主链接三级兜底:① h2 a[href](标题即链接:Releases/Contributors/Languages);
   ② section a[href^="/sponsors/"]("Sponsor this project" 没有标题链接,但必然
   含出资页链接;**必须带尾斜杠**,否则页脚那条"了解更多"的 /sponsors 会被误收);
   ③ section a[href*="/search?l="](Languages 备选)。三级全落空 = About(纯文本
   h2,正文是描述文本)⇒ **按设计跳过,不伪造锚点**。
5. 两条硬过滤:① `href` 为空或以 `#` 开头则丢 —— #contributing-ov-file 这类是
   React 路由键(**不是元素 id**,见 v2026.10.23 第 2 条),侧栏不该把它当独立
   目的地重复提供;② 同源校验,仓库官网(homepage)、ko-fi / liberapay 这类
   **站外**链接不进面板(进了就要接管点击,接管外站导航没有意义且会丢上下文)。
6. 标签与计数:h2.textContent 是拼接串("Releases53 (53)"),括号来自
   visually-hidden 读屏副本。标签取 h2 > span[class*=headingLinkWrapper] > a 的
   纯文本;计数取 [data-component='CounterLabel'] 的 textContent(即 "53",无括号)。
7. 接进数据源:collectRepoHomeNavItems 在既有 navList 循环**之后**追加,
   barKey="repo-sidebar"、barLabel=i18n.t("navDockSidebar")(新增键 zh"侧栏"/
   en"Sidebar")。条目走**无源锚点**路径(pushItem(href,label,null)),由
   buildNavDockPanel 手工绘制 + 内置 octicon + 计数胶囊 —— **刻意不克隆侧栏
   标题链接**:克隆会带上 data-muted 等标题专用样式,反而与面板其它条目不一致。
   barKey 换了 ⇒ 与仓库 tab 之间自然形成一条分割线,无需额外标记。
8. 计数胶囊:计数是标题链接的**兄弟节点**,cloneNode 带不出来,所以新增
   appendNavDockCounterText(el,item) 补一个 .Counter 胶囊,克隆路径与回退路径
   **都**调它。去重仍走 pushItem 原有链(标签归一 + 目的地归一):若仓库 tab 里
   已有同一 href(如 Releases 在头部菜单也出现过),侧栏不会产生第二条。
9. 图标:buildNavDockFallbackIcon 的 ICON_PATHS 新增 4 条 16px 真实 octicon 路径,
   **取自 @primer/octicons 官方包,不手写**:release→tag、contributor→people、
   language→globe、sponsor→heart。
10. 签名必须补侧栏,否则**早短路卡死**:侧栏不属于任何 `<nav>`,而
    navDockCheapSignature 只比 navBars —— 第一次构建时侧栏还是 SSR 骨架
    (a[href] 数 0,只有 SkeletonText),注水后条目才出现,签名却判定"没变化"
    直接返回 ⇒ 侧栏条目**永远补不进来**。现在把侧栏区块(标题文本 + 标题链接
    href)拼进签名。注水数据来自 GET /{owner}/{repo}/_sidebar,需
    Accept: application/json(无 Accept → 400,Accept: text/html → 406)。
11. 修 ?tab= 残留:v2026.10.23 第 13 条曾把"同页条目不清 ?tab="写成**显式取舍**
    (清参数要走 React Router 的 navigate,那正是当时要避免的重载)。本次动作很小
    —— **不跟页面抢**:新增 navDockHasFileTabParam()(判 /-ov-file$/ 的 tab 参数),
    handleNavDockItemClick 路径 4 加例外:不带该参数时维持原行为(接管 + 滚回内容
    顶部,via=same-page-top);带该参数时**不接管**(via=same-page-cleartab),放行
    这次点击作为一次真实导航走完。安全性:此时**路径**虽是仓库首页但**正文**停在
    License/Contributing 上,目标 URL 与当前 URL 不同 ⇒ 正常访问,**不是整页重载**。
12. 为什么"不接管"就够了(真机点击取证,MGGA_DIAG=1,三条观测):
    ① 面板 Code 锚点确实被真实鼠标点中(target=a.UnderlineNav-item[al=Code],
    anchorHref=/iina/iina,inPanel=true,trusted=true);
    ② **我们这条分支没有 preventDefault,记录里 defaultPrevented 却是 true** ⇒
    另有一层(文档级)拦截器接住了它;
    ③ 随后有**页面锚点**被合成点击(target=a,anchorHref=https://github.com/iina/
    iina,inPanel=false,trusted=false),URL 一步直达规范路径且不是整页导航
    (["/iina/iina?tab=License-1-ov-file","/iina/iina"],hardNav=false,docId 不变)。
    ⇒ 这次导航**由页面自己完成**,我们唯一正确的动作就是别跟它抢。
    **但"是哪一层接的"没定位到**:我最初的推断是"React Router 靠 data-discover 属性
    认领克隆锚点",为此在 6.0 里加了两个观测点,结果**推翻**了它 —— 实测面板 Code
    锚点 {"raw":"/iina/iina","hasTab":false,"dataDiscover":null,"hasReactKey":false},
    既无 data-discover 也无 __react* 自有键;那条 trusted:false 的页面锚点点击也
    **不是脚本发的**(脚本里的 .click() 只有四处:路径 3 的两处回放 + 点击闸门的
    两处 trigger)。究竟是谁、按什么条件接管,仍是未解,只留下"存在这样一层"的实证。
    这个未解点直接决定判据取在哪:既然无法从脚本侧保证它一定发生,就不能把
    "参数被清掉"写成断言。
13. 试过又被回退的一版,记下来免得下次再踩:曾按路径 3 的做法改成
    preventDefault + 把导航**委派给页面自己的锚点**(item.source),复用同一个
    canDelegate 守卫(源锚点存在 + 已连接 + navDockAnchorIsReactManaged)。
    **已回退**,理由是真机实测:面板 Code 条目的 item.source **不带** __react*
    自有键 ⇒ canDelegate 恒为 false ⇒ 该分支**从未在真机上执行过**(日志里区分出的
    via=same-page-cleartab-pass 就是它在真机上的唯一归宿);它只在 jsdom 夹具里
    手工盖章时才跑得动。既无收益、又多带一次合成导航,且那一版观测里出现过一次
    Execution context was destroyed(整页导航)。留 v1(放行),删掉这条死代码 ——
    也是"先写测试再改"的反面教材:当初那条 jsdom 场景是**为了迁就实现而手工造出
    条件**才变绿的。
14. 可靠性与判据:"参数最终被清掉"是**页面侧**行为,真机 17 次观测里 10 次成功
    (约 3/5),失败表现为 URL 与 docId 都不动(既没软导航、也没整页导航)。分视口
    差异明显:移动端 11 次 8 成功(约 3/4),桌面端 6 次 2 成功(约 1/3)。因此断言
    只压**脚本自己的决策**(via=same-page-cleartab,确定、可红绿对照),"参数被清掉"
    只作 INFO 观测(6.0/6.0s/6.0d/6.2),并在 6.2 里给出 URL 采样序列,方便一眼看出
    是"页面没出手"还是"导航被回滚"。给用户的诚实结论:这条修复去掉了"点了 Code
    却还看着 License"这个**错误行为**(不再只滚回顶部),并把清参数交还页面,但这一步
    **不是每次都会发生**(桌面端尤其明显)—— 要 100% 可靠得能调用 React Router 的
    navigate,超出用户脚本可控范围。另加两项默认开启的稳健性改进,都是被整页导航
    逼出来的:URL 采样序列(6.0s)、把点击后的测量包在 try/catch 里并把硬导航记成
    FAIL(此前 Execution context was destroyed 会让工具 EXIT=2 整个挂掉)。
15. 真机验证通道打通(此前 MEMORY.md 里"真机验证只能交给用户"的结论作废)。
    三个坑:① GitHub 的 CSP script-src github.githubassets.com 'sha256-…' 会拦
    page.addScriptTag({content}) —— 报 "Executing inline script violates…",脚本
    根本不跑;必须改用 page.evaluate(脚本字符串),走 CDP Runtime.evaluate,
    与 DevTools 控制台同级、不受页面 CSP 约束。GM_* 用 page.evaluateOnNewDocument
    在 goto 前打桩。② page.on('load') **不能**判"整页重载"(子框架延迟加载也会
    触发,桌面视口凭空 loads=0->1);改用文档标识 window.__mggaDocId(随机值,
    整页重载才换新)。③"吸顶"判据**不是** scrollY===0
    (#repos-split-pane-content 本身就在文档 171px 处),正确判据是脚本埋点
    y==top 且 elTop≈0。
16. 真机回归 tools/verify-live-navdock.js:22 → **28 项**,新增 0.5(按模式取真实
    标签 —— 各仓库许可 tab 命名不同,iina="License"/vscode="MIT license"),
    0.7–0.11(侧栏来源 5 项),6.1(断言**我们的决策**:放行软导航而非接管,
    via=same-page-cleartab),8(跨页条目软导航 pass-through,带 2 次重试并把 click
    方式与 via 记入证据)。四组组合(iina/vscode × desktop/mobile)**全部 28/28
    通过**,docId 全程不变 ⇒ 零整页重载。另新增 MGGA_DIAG=1 点击诊断(默认关闭):
    在 window 冒泡阶段(最后一个看到事件的监听器)记录每次点击的目标 / 锚点 href /
    是否在面板内 / 最终 defaultPrevented / 是否可信事件 / 所属 nav,并对点击坐标做
    一次 elementFromPoint —— 用来回答"这条锚点被点到了吗"与"默认行为是谁拦的"。
17. 离线回归 tools/smoke-load.js:55 → **62/62 PASS**。新增 3i(侧栏来源进面板,
    5 项断言:条目存在/顺序/标签纯净/计数胶囊/About 缺席)、3j(侧栏骨架→注水后
    重建,签名必须变)、3k(?tab= 例外:带参数时不接管(defaultPrevented=false、
    不自滚)、不带参数时仍接管)。配套夹具 sidebarGridInnerHTML /
    sidebarSectionsHTML / sidebarRepoHTML / sidebarSkeletonHTML。
18. 红绿对照:同一套断言喂给改动前版本(MGGA_SCRIPT 指向
    git show 6094098:Make-GitHub-Great-Again.js)⇒ **62 项中 6 项 FAIL**:
    ① 1 项 ?tab 例外("带 ?tab= 时仍被接管 ⇒ 只滚回顶部,正文继续停在概览文件
    上");② 5 项侧栏来源(条目缺失 / 主链接解析 / 计数徽章 / 分割标题 /
    骨架→注水重建)。注意"About 不进面板"在旧版会**空过**(旧版没有侧栏来源,
    本来就没有 About),它本身不构成对本次改动的检验,起作用的是上面 6 项。
19. 结构版本 NAV_DOCK_STRUCT_VER 14 → 15(侧栏来源改变了面板结构)。
]

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
