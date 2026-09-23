v2026.9.23 [2026-09-23]
Batch consolidation (2026-09-18 - 2026-09-23): floating nav dock, one panel standard, dead-code removal (bilingual overview)
[
0. This entry is an index: it regroups the 15 local unpushed commits of 2026-09-18 - 2026-09-23 into 7 thematic commits plus 1 consolidation commit, and gives a bilingual overview. Per-change root cause / evidence / unverified items / rollback SHAs stay in the individual entries below and in docs/fixes/, which this entry does not duplicate.
1. Gate: this project has no build system (the deliverable is a single Tampermonkey userscript, and there are no release/debug branches), so the equivalent gate is node --check plus the offline regression: both passed this round, node --check OK and tools/smoke-load.js 92/92 PASS.
2. [EN] Code quality: the v2 architecture detector is wired into the icon fallback path, injected colours and HTML are sanitized, the missing i18n strings are completed, and the MutationObserver overhead is cut.
3. [EN] Floating nav dock: the old "nav More" flattening became a repo-home left dock that indexes the header nav, the repo tab bar, the file area, the file-tree nav and the sidebar; the FAB is always visible and toggles only the panel.
4. [EN] Harvest: per-bar grouping with dividers and per-bar retry, More read through the body portal, clickless harvest, ghost-menu and phantom-scrollbar filtering, page scroll locked during harvest with a retry budget, one harvest per page entry, and dedupe settled on normalized label plus destination.
5. [EN] Navigation: in-page locate instead of a reload, no hard navigation, unselected tabs handed back to React so their AJAX still fires, and the file-area content pinned to the top after a tab switch.
6. [EN] One panel standard: both title bars share padding / border / typography, the "visible title band" (panel top edge to divider) is 37.8px on both, every size is em-driven off a single clamp(vmin) font size, the scrollbar is immersive and shared through one generator, and the status glyphs are SVG from a single octicons-derived source.
7. [EN] Dead weight removed: the "fix repo header button overflow" feature (proved inert by a live A/B run) and the three never-executing third-party colour-picker adapters are gone (panel toggle rows 6 -> 4, menu items 7 -> 6); the picker's doubled width on RGB/HSL is fixed with one definite-width declaration.
8. [中文] 代码质量：v2 架构检测器接进图标兜底路径；注入的颜色与 HTML 做净化；补全缺失的 i18n 字符串；削减 MutationObserver 开销。
9. [中文] 悬浮导航：旧的「导航栏 More 多行开关」重做成仓库主页左侧悬浮导航，索引全局头部、仓库标签条、文件区、文件树与侧栏；悬浮球常驻，只负责切换面板。
10. [中文] 收割机制：按栏分组 + 分割线且漏栏可重试；More 改从 body 门户直读（免点击）；过滤幽灵菜单与假滚动条；收割期锁住页面滚动并给每栏重试预算；每进入一次页面只收割一次；去重收敛为「归一名 + 目的地」。
11. [中文] 导航行为：页内定位取代重载；不做整页硬导航；未选中的 tab 交还原锚点以触发 AJAX；切 tab 后对新正文吸顶、同页 tab 不再重载。
12. [中文] 面板标准统一：两处标题栏共用 padding / 边框 / 字重字号，「可视标题带」两侧同为 37.8px，尺寸全 em 且只由一个 clamp(vmin) 字号驱动，滚动条沉浸式且抽成单一生成器，状态字形统一到 SVG 单一来源。
13. [中文] 清死重：恒不生效的「修正仓库头按钮溢出」与三个从未执行的第三方取色器适配器一并删除；取色器 RGB/HSL 宽度翻倍用一行定值宽度修掉。
14. Commit shape and rollback: 15 local unpushed commits -> 7 thematic commits (70344cc code quality / 7b5f2c8 nav dock born and shaped / 999400c harvest rework / 6c23ce1 navigation root causes / df50d19 sources and panel rework / 4cc7362 one panel standard / 7d548ac dead-code removal) plus 1 consolidation commit. Tag snapshot-before-final-consolidation-20260923 was created first to keep the old SHAs alive; the new chain's tip tree is byte-identical to the old HEAD tree. Whole batch rollback: git reset --hard df3f838 (the published 2026.9.17 baseline). This consolidation only: git reset --hard 56920cd.
15. Docs: this file gains the batch overview above and its stale NOTE is corrected; the READMEs gain the floating-ball entry point and the adaptive/immersive panel bullets; the 3 tool attachments under .opensquilla/attachments/ are removed from the repo (kept locally, now git-ignored).
]

v2026.9.23 [2026-09-23]
Panel unicode status glyphs unified into SVG (audit item 2.3, done in full)
[
1. Request (user's words): "Are 2.3 (replace the panel's unicode glyphs with SVG) and 2.4 (extract a panel-shell primitive) ready to implement, given the project's overall state?" The assistant measured first and then asked the user to decide. Verdict: 2.3 is ready (the SVG infrastructure is mature and the floating ball already set the precedent), 2.4 is not advisable. The user chose "2.3 in full, with the close control and clear button kept byte-identical in height" and "2.4 not now, just correct the list".
2. Five kinds of unicode status glyph existed before, all rendered by the system font (weight, baseline and glyph size are beyond control, and they are not the same visual language as the already-SVG'd floating ball and nav item icons): the five switch buttons' check/cross, the keyword action button's multiplication sign (delete, U+00D7) and hooked arrow (restore, U+21A9), the built-in picker's Clear cross, and the two panel close controls' cross.
3. The risk is layered, which determined the approach: the switch buttons (.color-toggle-btn is a fixed width/height: 1.8em box with flex centring) and the keyword buttons (parent is inline-flex + align-items:center) shift by zero when the icon changes; the close controls and the clear button, however, derive their height from the glyph (close control: 14px x line-height 1.2 + padding 2px x 2 = 20.8px), and the close control is the TALLEST child of its title bar - so touching it means touching both title bar heights (a line the user has verified twice and that two gates lock down).
4. The one real risk and its mitigation: the icon must stay in an inline box (only vertical-align: middle), never display: block - otherwise the line box collapses to the icon's own 1em and the buttons plus both title bars all shrink by 2.8px together.
5. Infrastructure (a single source): added UI_ICON_CHECK_PATH / UI_ICON_X_PATH / UI_ICON_UNDO_PATH (paths not hand-written; taken from @primer/octicons official 16px data: check-16 / x-16 / undo-16), plus a UI_ICON_PATHS map and uiIconSvg(kind). Same pattern as gearIconSvg: no width/height attributes, sizing handed to the CSS 1em, so one rule follows four different font sizes (0.8em switch / 14px close / 0.85em clear / 0.9em keyword button).
6. Eleven call sites (replaced by a script with per-site hit-count assertions rather than hand-editing): the five switch button templates, the settings close control template, the picker clear template, bindFeatureToggleButtons' paint, both branches of updateToggleBtnUI, and the keyword item's actionIcon (pendingDelete ? a hooked arrow : a multiplication sign -> uiIconSvg(pendingDelete ? "undo" : "x")). The nav dock close control used closeBtn.textContent; that became innerHTML (textContent cannot hold SVG) - the only such change in the file. One shared style rule (five selectors -> width/height: 1em + vertical-align: middle) lives in GM_addStyle so both panels are covered without writing it twice.
7. Comment cleanup: the stale "used to be a span with a multiplication sign" comment in the stylesheet was rewritten to describe the current state plus the new constraint (the icon must stay inline); leftover glyph literals in comments were removed too - per the project's existing lesson, a literal left in a comment makes the strongest kind of assertion ("the file contains no such glyph") meaningless, i.e. the removal was not clean.
8. Regression: node --check passes; offline regression **92/92 PASS** (one new aggregate gate, plus two existing paired gates, 573 and 2015, reworked); red-green against the previous revision 58be158 gives **89 PASS / 3 FAIL**, the three being exactly this round's discriminators (no svg in the close control / the template is not uiIconSvg("x") / the source still contains a check glyph).
9. Live verification (iina/iina at 1280 wide; new probe .workbuddy/probe/diag-glyph-svg-geometry.js, in two stages - the repo home page for the nav dock and the Release page for the settings panel and built-in picker; run once before and once after, all three sets of geometry sampled within the same frame): the promised "byte-identical box heights" holds - both close controls 20.8 -> 20.8, panel top edge to divider 36.8 -> 36.8, header 29.8 -> 29.8, settings panel box 280x559.42 byte-identical, the four row heights 22.39 x 4 and each row's top byte-identical, the five switch button boxes 20.16 squared unchanged, the picker panel 274.38x331.28 unchanged, the clear button's height 26.98 unchanged, the keyword item box height 25.17 unchanged, and the format toggle button (a control without an icon, used as a control group) byte-identical.
10. Icon sizes and identities were both verified: measured sizes equal each site's 1em (11.19 / 14 / 11.89 / 12.59); identity classified by the first 24 characters of each path - the five switches to check-16, the settings and nav closes, the picker clear and the keyword default state to x-16, and the keyword pending-delete state to undo-16. So both the toggled state and the pending-delete state were exercised, not just the default one.
11. The only thing that changes is width: octicons are drawn on a 16x16 grid and rendered at 1em (14px square at the close control), whereas the old cross glyph was only about 9.4px wide, so controls that contain an icon get 2-4px wider - and the two close controls get **+2.56px in lockstep** (the pairing is intact). Flattening that width would require shrinking the icon to about 0.67em, which would make it visibly smaller than the text around it, so it was deliberately not done.
12. Item 2.4 (not done) and a correction to the list: its line "still not shared: scrollbar styling" is **out of date** - item 2.2 already hoisted that into the immersiveScrollbarCss() generator (one host for the nav dock, two for the settings panel). What remains, the "panel shell", sits on two different construction patterns (the nav dock builds DOM with createElement and carries NAV_DOCK_STRUCT_VER plus three version checks that trigger a rebuild; the settings panel returns an HTML string from buildSettingsDialogHTML() and pours it in with innerHTML), so extracting a primitive would mean unifying those patterns first - a refactor, not a tidy-up - and would tear down the safety net of four paired gates. This round therefore only corrected that line in the list and recorded the three criteria behind the decision.
13. Two probe pitfalls (written into the doc for reuse): (a) eval(HELPERS) inside page.evaluate always fails - HELPERS is a Node-side variable and page.evaluate only serialises the function body, so the identifier does not exist in the page; the small helper functions must be inlined into every measured function body. (b) The nav dock's floating ball only appears on the repo home page (on the Release page the one that shows up is the settings ball), so measuring the nav dock requires a separate goto to the home page and re-injecting the script, since the previously injected copy does not follow across documents.
14. Not verified: only Chrome (headless) with iina/iina; Firefox and Safari untested, as is a real phone; the icon's appearance in dark mode was not inspected separately (it uses currentColor so it should follow the text colour, but no dark-mode check was run); the keyword pending-delete state was only measured geometrically, without an interaction regression on whether clicking restores it. Also, the gear emoji in four Tampermonkey menu i18n labels is **deliberately kept** - those are browser-extension menu text labels, they cannot hold SVG, and they are outside the panel.
15. Version unchanged (still 2026.9.23). Rollback point: git reset --hard 58be158 (tag snapshot-unicode-to-svg-20260923). No storage keys added or removed this round, so nothing to migrate on the Tampermonkey side.
]
v2026.9.23 [2026-09-23]
Built-in colour picker: fixed the doubled blank area on the right when the value format is switched to RGB/HSL
[
1. Request (user's words): "When the colour picker's value type is switched to RGB and HSL, the colour picker panel instantly gains a doubled blank area on the right. Why?" The assistant first produced a diagnosis only (three live probes plus intervention experiments, see docs/discussions/2026-09-23-picker-width-max-content.md) and listed four fixes (definite container width / definite width plus dead-declaration cleanup / add size attributes only / leave it alone). **The user chose "definite container width only".**
2. Root cause (two declarations, neither sufficient alone): (a) the picker sub-panel .custom-color-picker-panel is width: max-content, so its width is derived from the content's intrinsic size; (b) the picker container .builtin-color-picker-container declares width: min(250px, 100%), but during intrinsic sizing the containing block is indefinite and percentages resolve as auto => that 100% does not exist, and the declaration degrades into "container takes its content's intrinsic size". Add (c): a text input without a size attribute carries a default intrinsic width of 20 characters. Switching to RGB/HSL adds three such inputs, each inflating max-content by about 165px.
3. Measurements (live on iina/iina, 1280x896, probe .workbuddy/probe/diag-picker-format-width.js): before the fix HEX showed a panel of 281.17 while RGB and HSL showed **605.67**, yet the picker container stayed at **250** in all three, with the right-hand gap going 6.78 -> **331.28**. The decisive signal is that .builtin-input-group's real layout is **byte-identical** across all three formats (227.63) => the panel is being inflated, not the content displaced. The arithmetic closes: 605.67 - 0.8em x 2 (22.4) - 2px border - 250 = **331.27** (measured 331.28); HEX follows the same formula with 256.77 - 250 = 6.77 => **HEX already had the same flaw, just too small to notice**.
4. Causality pinned down by intervention experiments (probe diag-picker-format-width-fix-test.js: mutate one inline style/attribute on the live page, measure, then revert): setting an inline width:250px on the container brought the panel to **274.38**; adding size="3" to all three inputs gave **274.47**; changing **only** the first input gave 486.67 (gap 212.28) => the gap does come from each input's own intrinsic width (about 119px each). diag-picker-input-cascade.js additionally enumerates every rule that matches the inputs, with specificity, and cross-checks against computed values.
5. Change (one line): .builtin-color-picker-container's width: min(250px, 100%) -> width: 250px; max-width: 100% (the latter still handles narrow-viewport shrink). With a definite value the intrinsic-sizing pass gets a determinate number, so the panel width is always exactly "container + 0.8em x 2 + border 2" = 274.4, fully decoupled from the intrinsic widths of the inputs inside. The "add size attributes only" option was **not** taken: it touches four places and its result (274.47) depends on the coincidence that the three inputs' intrinsic widths still come to >= 250px (measured 250.07), which is more fragile than fixing the container.
6. Regression and verification: node --check passes; offline regression **91/91 PASS** (with a new source-level gate, "the picker container width is a definite value (leaves no leak to a max-content ancestor)"); red-green against the previous revision c74b765 gives **90 PASS / 1 FAIL**, the single FAIL being exactly the new gate. Live: at 1280x896 all three formats now read **274.38 / container 250 / gap -0.01** (RGB and HSL were 605.67 / 250 / 331.28 before); 400x896 gives 274.38 for all three (no shrink triggered); 260x896 is **byte-identical** before and after (panel 244 / container 219.63) => replacing the narrow-viewport shrink from min(250px,100%) with max-width:100% **did not change any existing behaviour**.
7. Also established (and **left untouched** this round): several declarations never applied - .builtin-color-value-input's width:0 / padding:0.3em 0.2em / font-size:0.85em / font-family:'Courier New', and .builtin-color-hex-input's padding:0.3em 0.5em / font-size:0.85em - all outranked by .custom-color-picker-panel input[type="text"] (specificity (0,2,1) > (0,1,0), and later in the sheet). Computed values agree: the number inputs measure font-size 12.6px (= 0.9em x 14px), and while unrendered their width reads as 100%. Cleaning this up later would bring a **visible change in font size and padding**.
8. Not verified: Chrome (headless) only; Firefox/Safari and page zoom levels untested; the 400px run did not trigger shrinking (not separately evidenced) - the 260px run is the one that actually forces it (and was compared).
9. Version unchanged (still 2026.9.23). Rollback: git reset --hard c74b765 (tag snapshot-picker-width-fix-20260923).
]
v2026.9.23 [2026-09-23]
Remove "Fix repo header button overflow" entirely (panel toggle and Tampermonkey menu item included)
[
1. Request (user's words): "Why does the Release page settings panel have an extra 'Fix repo header button overflow' item?" -> "Isn't this feature supposed to be on by default? So what is the point of this setting?" Four options were offered (drop the panel row but keep the menu escape hatch / keep the row and only fix the "incomplete off" bug / keep the status quo and only fix that bug / delete the feature outright, with a note that the last one puts a known bug back and is not recommended). **The user chose to delete the feature outright.**
2. Before touching anything, the patch was re-measured live to see whether it was still worth keeping (new probe .workbuddy/probe/diag-header-btn-fix-value.js: one and the same script, only the switch's initial value in GM storage differs, run in an on/off pair x desktop UA and mobile UA x 480/760/1280 viewports x repo home and Release page). Conclusion: it is **completely inert today** - (a) the three hit points match nothing (GitHub's repo header DOM no longer contains .show-whenNarrow at all; .tmp-mb-3 exists on 7/49 elements but never combines with .d-flex.gap-2 nor sits inside any .show-whenNarrow); (b) the button row geometry, Sponsor's right edge and documentElement.scrollWidth are **byte-identical** between the on and off runs (the switch cannot produce a single observable difference today); (c) the original symptoms (widened document, Sponsor pushed out of the main column, blank strip on the right) no longer reproduce (Sponsor's right edge sits -116.78 to -556.78px inside the main column). => a permanently ineffective patch, so deleting it costs nothing.
3. Also pinned down "why it showed up in the Release page panel": the panel is the script's **single global** settings dialog (the template is a pure function with one call site and no per-page branching); what varies per page is only the **entry point** - the gear ball returns on its first line on non-Release pages, and non-Release paths actively remove an already-open panel. So the real source of "the Release page has an extra item" is that the panel hosts global switches while this feature targets the repo header rather than Release page content - it is the only odd one out in that group. The user's "do you want nav items folded into More?" refers to **a different row** (the nav bar "More multiline" switch, added in the same batch, already removed on 2026-09-22 when that feature was reworked into the floating nav dock) - the script now leaves GitHub's native More folding completely alone.
4. The discussion also uncovered that the switch's **off** path was incomplete within the same page: turning it off removed only the stylesheet and the class on <html> and disconnected the observer, while the inline styles and dataset markers previously written onto the row/child groups/buttons had no rollback code anywhere => toggling it off kept the wrapping until a reload. That problem disappears with the deletion (there is no switch any more).
5. Scope of the deletion (executed with a **line-boundary-asserting script**: 13 boundary anchors had to all match before it fired; 8068 -> 7862 lines; no hand-copied 200-line old_string): the i18n key (zh/en), the whole settings-panel toggle row (toggle rows 6 -> 4), the bindToggle line, the Tampermonkey menu item (7 -> 6), the 200-line implementation block (style injector, row marker, 80ms debounce, 20x250ms bootstrap polling, header MutationObserver, observer teardown, switch reader, top-level entry), the init block and two viewport event listeners (the nav dock's own two listeners stay), and the re-application call inside SPA navigation; one feature bullet removed from each of README.md and README_en.md.
6. Only a **Chinese prose** note is left at the deletion site: identifiers written into a "removed" comment keep grep-style checks matching (i.e. the dead code is not really gone - the same trap as in 1.4). The new gate needs a strongest-form "absent from the whole file" assertion, so the literals had to be washed out first.
7. New smoke gate "implementation + panel toggle + menu item all removed": (a) the source contains none of 18 identifiers; (b) at runtime no stylesheet is injected, no fix class is added to <html>, no row is marked; (c) the template slice contains exactly 4 .color-picker-row; (d) the Tampermonkey menu has exactly 6 items. Two self-inflicted traps avoided: `.show-whenNarrow` / `HeaderContent` **must not** be used as evidence (the nav dock still uses them as a reverse filter to skip GitHub's narrow-viewport chrome - a legitimate reference), and **DOM must not be inspected in the static section** (the settings panel is created on demand, so counting toggle rows there always yields 0 - the first version went red exactly like that); the row count now comes from a source slice.
8. Regression: node --check passes; node tools/smoke-load.js **90/90 PASS** (was 89: one switch assertion removed, one deletion gate added); red-green against the previous revision ebb88f3 -> **89 PASS / 1 FAIL**, the single FAIL being exactly the new gate. Live: tools/verify-live-navdock.js (main regression) **30/30 passed**; post-deletion re-check (.workbuddy/probe/header-btn-fix-removed.json) shows root=false / style=false / marked=0 on all four targets, and the Release page settings panel still behaves (4 toggle rows + keyword block, no errors).
9. Not verified: a real phone (this run used headless Chrome with an iPhone UA spoof, not a real device); only iina/iina was measured (repos without a Sponsor button were not re-checked); if GitHub ever emits .show-whenNarrow again the old symptoms would return - but that is GitHub's side, and dropping the patch merely restores the native layout. The stale storage key left in existing users' Tampermonkey storage is no longer read (harmless).
10. Version number unchanged (stays 2026.9.23, per the standing request not to bump it any more). Rollback point: tag snapshot-drop-repo-header-fix-20260923 (commit ebb88f3).
]

v2026.9.23 [2026-09-23]
The settings-panel audit list lands: the keyword list gains overscroll-behavior:contain (scrolling to the end no longer chains to the content area); inline template styles sink into the stylesheet (keyword container sizing and .button-row's margin-top, so editing the CSS finally works); the three never-executing third-party colour-picker adapters are deleted (JS branches plus CSS rules); .color-picker-row gets a uniform min-height:1.6em, fixing a 1.39px row-rhythm gap; the three dialog buttons move to Primer semantics with a dark variant (confirm=primary / cancel=neutral / reset=danger); the panel base font-size becomes clamp(vmin)-driven (280px => 359.88px at 2560x1440, growing together with the floating ball); scrollbar rules are hoisted into a shared immersiveScrollbarCss generator used by both panels (1 host for the nav dock, 2 for the settings panel)
[
1. Request (the user's own words): "Continue landing the Release settings panel (.color-picker-dialog) audit list,
   but show progress live in progress.html in the right sidebar as I specified before." Two decisions were
   confirmed in the same turn: scope = section 1 (all six items) plus 2.1/2.2 (2.4, extracting a panel-shell
   primitive, is out of scope); and item 1.3 button colours = switch to Primer semantics and add a dark variant.
   The progress board lives at .workbuddy/progress.html (auto-refresh every 4s, opened in the right preview
   panel, not committed).
2. 1.1 + 1.6 (same element, and the order matters): the keyword container's max-height / overflow-y /
   margin-bottom used to live in the template's inline style (inline beats the stylesheet, so theming, shared
   scrollbars and responsive tweaks were all "changed but nothing happened") => sunk into the stylesheet. Only
   after that is it a scroll host the stylesheet can describe, which is what 2.2's scrollbar rules need. Then
   overscroll-behavior: contain (it measured "auto" before, and the container really does overflow: 456px of
   content in a 168-224px viewport; the nav dock's list already used contain, so the two behaved differently).
   **This also corrects a wording in the audit doc**: it said the scroll "chains to the outer area / the page",
   but the page never comes into play - the ancestry is kw -> content area -> page, and the content area already
   carries contain, which cuts the chain in the middle. A dedicated probe (viewport squeezed to 1280x520 so the
   panel is height-capped and the content area must overflow) shows the real receiver is the **content area**:
   scrollTop 0 -> 7 before, 0 -> 0 after, while window.scrollY stayed 0 in both revisions. So this item keeps
   the panel's content area from sliding away while you read the keyword list; it never was about the whole page.
3. 1.2: the template's <div class="button-row" style="margin-top: 1em;"> fought the stylesheet's
   margin-top: 0.75em and the inline one won => tuning the gap in CSS never worked. The inline declaration is
   removed and **that 1em value is folded into the CSS** (not casually reduced to 0.75em, which would be an
   unrequested visual change), keeping padding-top: 0.35em => 1.35em, bit-for-bit identical to before (live
   re-check: the button-row gap is still 14px).
4. 1.4: panel._pickr / _huebee / _spectrum are only ever read and never assigned, and window.Pickr / Huebee / $
   have no loading logic anywhere => the three if-branches never run; the matching .pcr-app / .huebee /
   .sp-container CSS rules can never apply either. Deleted wholesale. One self-inflicted pitfall: the first
   version wrote those identifiers into the "removed" comments => grep-style checks still hit them, i.e. the dead
   code was not really gone; the comments now describe them in prose, all 11 literals scan clean, which is what
   lets the gate assert "absent from the whole file". #libraries-container is kept: despite its name it is the
   built-in picker's mount point, not dead code.
5. 1.5: row height is decided by the tallest child (a row with a swatch uses .color-button = 0.8em font x 2em
   about 22.39px, one without uses .color-toggle-btn = 0.8em x 1.8em about 20.16px) => measured
   22.39 / 22.39 / 22.39 / 21 / 21. .color-picker-row gains min-height: 1.6em (exactly the swatch tier) => all
   five rows match; the button sizes are deliberately untouched (they are indirectly locked by the paired
   title-bar gates) and align-items: center keeps content centred. Cost: the panel grows 2.78px taller.
6. 1.3: confirm = primary (light #1f883d / dark #238636), cancel = neutral (light #f6f8fa / dark #21262d),
   reset = danger (light #cf222e / dark #da3633) - the same semantic family as the existing "Add" button
   (#2da44e green). Two details: (a) the cancel button's outline is an inset box-shadow rather than a border,
   because a border takes part in the box model and would make it 2px taller than the other two (the panel
   spacing was just dialled in, so no geometry shifts; live re-check: all three measure 27.98px); (b) the
   colours live **only inside the two prefers-color-scheme blocks** - put them on the base rule and they mask
   the dark tier (equal specificity follows source order, and the base rule comes first). That also matches the
   dialog's existing mechanism: it goes through media queries and must not reference GitHub variables, or a
   light dialog would pick up dark-theme values.
7. 2.1: the panel's font-size was the fixed --mgga-text-scale (1em) => a constant 20em = 280px width, while the
   floating ball had already become clamp(38px, 4.4vmin, 56px) => on a 4K screen the ball grew to 56px and the
   panel did not move at all. Added --mgga-panel-font: clamp(14px, calc(0.735vmin + 7.41px), 18px) and pointed
   .color-picker-dialog at it; since every size inside the panel is in em, **changing that one value** scales
   width, row height, gaps and scrollbars together. The numbers are chosen so 1280x896 (vmin 896) lands on 14px
   - bit-for-bit identical to before, i.e. zero visual change on small screens - and the panel only grows on
   large ones, capped at 18px (360px) from 1440p up. Measured: 2560x1440 -> 359.88px / 17.994px with the ball at
   56px, both in step.
8. 2.2: only the nav dock had scrollbar styling (10-odd handwritten rules plus the Firefox @supports fallback)
   and the settings panel had none => in a "always show scrollbars" environment, or on Firefox, the two looked
   inconsistent. Hoisted into a module-level generator immersiveScrollbarCss(hosts, hoverHost): 1 host for the
   nav dock plus 2 hosts for the settings panel (content area and keyword list). **Moving rules into a runtime
   generator means moving the assertions too**: once the rules are generated, the old gate looked for that text
   inside the injectNavDockStyle slice, found nothing and went red for no reason; it now asserts "the generator
   contains it" plus "each call site passes the right host", with an extra guard that the slice contains no
   handwritten ::-webkit-scrollbar at all, which keeps the single-source property.
9. Verification: offline smoke **89/89 PASS** (6 new checks: shared scrollbar section / 1.1+1.6 / 1.2+1.5 /
   1.3 / 1.4 / 2.1); red-green against the previous script
   (MGGA_SCRIPT=.workbuddy/probe/prev-before-settings-audit.js = fd2495c): **82 PASS / 7 FAIL**, all seven being
   this round's new or rewritten discriminators (they point out: handwritten ::-webkit-scrollbar is back / no
   shared-section generator found / keyword container writes inline styles again / button row writes inline
   margin-top again / legacy button colour #007bff still present / dead code window.Pickr still present / no
   --mgga-panel-font clamp found), while the pre-existing 82 checks did not move.
10. Live (iina/iina, two probes each run against both script revisions):
    (a) diag-settings-fix-verify.js -> .workbuddy/probe/settings-fix-verify-{before,after}.json: keyword list
        overscroll auto => contain; the five settings rows 22.39 x3 + 21 x2 => 22.39 x5; buttons
        #ff6b6b / #007bff / #ffa500 => #cf222e / #f6f8fa+inset / #1f883d (dark: #da3633 / #21262d / #238636)
        with all three the same height to the pixel (27.98px); the panel goes 280x589.53 => 280x592.31 at
        1280x896 (row rhythm, +2.78px) and 280x589.53 => 359.88x749.53 at 2560x1440 (font 17.994px, ball
        56px); scroll hosts keep scrollbar-width: auto, dodging the Chromium 121+ trap; the button-row gap is
        still 14px.
    (b) diag-wheel-chain.js -> .workbuddy/probe/wheel-{before,after}.json, which only measures who receives the
        chained scroll for item 1.1, with the viewport squeezed to 1280x520 so the content area must overflow -
        at 1280x896 it does not, so the main probe **cannot** detect this item; do not read that as "no effect".
    Probe pitfall: the main probe's first version inserted the wheel-chaining test right after the 1280 step,
    and since that test empties the keyword list (filling it with placeholders so it overflows) the later steps
    measured a panel 165px shorter (about the keyword list's max-height: 168px at 600px viewport height) -
    self-inflicted; the step now runs after every measurement, i.e. destructive steps always come last.
11. Not verified: the scrollbar **look** has not been eyeballed - headless Chrome uses overlay scrollbars
    (offsetWidth - clientWidth is always 0) and never renders the classic bar or its stepper arrows, so this
    round can only prove "same declarations, right hosts, scrollbar-width not broken"; the look needs a Windows
    box set to always show scrollbars, or Firefox. The dark tier was only checked for colours, not viewed as a
    whole (hover states, contrast against the panel border). The 2.1 coefficient was only sampled at both ends
    (1280 -> 14px, 1440p -> 18px); the middle steps (1920x1080 -> 15.35px) are computed, not eyeballed, and
    whether 359.88x749.53 looks bloated on 4K is only a number so far. Item 1.1 was only tested with a mouse
    wheel; trackpad momentum scrolling was not tested separately. Firefox / Safari, very narrow viewports
    (<=320px) and other repositories were not re-tested.
12. Rollback point: tag snapshot-settings-panel-audit-20260923 (commit fd2495c). Audit items 2.3 (turn the
    panel's unicode glyphs into SVG) and 2.4 (extract a panel-shell primitive) are explicitly out of scope this
    round.
]
v2026.9.23 [2026-09-23]
The settings panel close control now uses the nav dock's <button>✕ (with the button resets); the divider-to-first-row gap goes from 2px to the 0.75em row rhythm; both floating balls share clamp(38px,4.4vmin,56px) plus --mgga-fab-icon (settings ball 31.36px vs nav ball hard-coded 44px => now identical and adaptive); the settings ball icon moves from the unicode gear to SVG (the gear path is hoisted to FAB_GEAR_PATH, single source); both balls gain one shared gentle entrance animation (480ms, opacity/scale only); the nav ball loses its blue item-count bubble, and a pre-existing "rebuilt ball forgets its hidden state" bug is fixed
[
1. Request (the user's own words): "Use the repo nav dock's close button style for the Release settings panel title bar;
   the safe distance between the title bar and the first row
   body > div.color-picker-dialog.visible > div.color-picker-content > div:nth-child(1)
   is wrong. Also change the settings floating ball icon to SVG instead of unicode, make it scale with screen
   resolution and aspect ratio exactly like the nav dock ball and keep both the same size, and add a shared
   floating-ball entrance animation triggered on page refresh, gentle rather than abrupt. Remove the blue
   item-count bubble from the nav dock ball." Plus: "analyse what could be improved in the Release settings panel".
2. Live before -> after (iina/iina, three new probes, raw data in .workbuddy/probe/{fab-gap,fab-pop,
   settings-audit}.json): close control SPAN× -> BUTTON✕ (hover changed from scale(1.1) to a background only);
   divider -> first row 2px -> 10.5px; ball sizes 31.36 / 44 (hard-coded) -> 39.42@1280x896 and 47.52@1920x1080
   (both balls bit-for-bit identical); icon unicode gear -> SVG 16.16 / 19.47; blue bubble (showed 15) gone;
   the visible title band is still 37.8px, unchanged (the close control's 20.8px height did not move).
3. The close control is not a CSS copy but a control swap: a <button> does not inherit the page font and brings
   its own grey background plus a 2px inset border, so besides the four size declarations
   (14px / line-height 1.2 / padding 2px 6px / radius 6px) it needs background: transparent, border: none and
   font-family: inherit. The padding is deliberately untouched - it is part of the shared two-bar standard,
   and changing it would re-open the height difference between the two title bars.
4. Where the first-row gap really came from: the 2px was the title bar's own margin-bottom, not the content
   area's; and .color-picker-row carries no padding of its own (measured 0/0), so the first row hugged the
   divider while every row below it is 10.5px (0.75em) apart. The fix lives in the content area:
   padding: calc(0.75em - 2px) 0.35em 0 - calc expresses "top up the difference", so whoever changes the
   header margin is followed automatically, and the shared standard stays untouched.
5. Floating balls now share their size: :root gains --mgga-fab-size: clamp(38px, 4.4vmin, 56px) (vmin eats
   both axes, so resolution and aspect ratio both apply) and --mgga-fab-icon: calc(var(--mgga-fab-size) * 0.41)
   (0.41 is the old 18/44). Both width/height pairs and both > svg rules use the same variables, plus an
   explicit box-sizing: border-box (the settings ball is a div, the nav ball is a button whose UA default is
   border-box; without it the two balls differ by the 2px border).
6. Settings ball icon is now SVG: the gear path used to exist only as ICON_PATHS.gear inside
   buildNavDockFallbackIcon; it is hoisted to the module-level FAB_GEAR_PATH and ICON_PATHS.gear references it
   (the same single-source approach as GITHUB_MARK_PATH; the 2323-character path is asserted to appear once).
   The SVG carries no width/height attributes - sizing belongs to --mgga-fab-icon.
7. Entrance animation (one shared keyframes, once per ball per page load): 0%{scale:.9,opacity:0} ->
   60%{scale:1.015,opacity:1} -> 100%{scale:1}, 480ms. It may only touch opacity and scale: the nav ball's
   vertical centring relies on transform: translateY(-50%) !important, and !important outranks CSS animations
   in the cascade, so animating transform is ignored wholesale (the animation name applies, the ball does not
   move). scale is an individual transform property, orthogonal to transform, so it scales around the centre
   and centring is unaffected. No both/forwards fill either (a filled final frame would keep overriding opacity
   and the hidden state could never win). JS triggerFabPop attaches the class only when a ball is genuinely
   created, removes it on animationend and skips hidden states; prefers-reduced-motion is honoured. Live
   sampling (hook installed before the script, recording the instant the class appears): 0.9/0 -> 0.988/0.767
   -> back to none/1, the same curve after a reload.
8. Blue bubble: the badge update function, its two call sites and the whole CSS block are gone, and smoke now
   asserts the identifiers can never reappear (no half-deletions). A pre-existing bug was fixed along the way:
   on panel rebuilds (SPA navigation / viewport changes) the old code only synced the expanded state from the
   menu and clicks, so a rebuilt ball kept no hidden class and popped up when it should not; the rebuild path
   now re-applies setNavDockExpanded(navDockExpanded).
9. Verification: offline smoke 83/83 PASS; red/green against the previous script
   (MGGA_SCRIPT=.workbuddy/probe/prev-before-fab-close.js = 16f8e69): 77 PASS / 6 FAIL, all six being the new
   discriminators (SPAN / no svg / bubble still there / missing background: transparent / not the calc form /
   no --mgga-fab-size), with all 77 existing checks untouched. Live geometry and animation in items 2 and 7.
10. Not verified: Firefox/Safari untested (the scale property needs Chrome 104+/Firefox 72+/Safari 14.1+;
   older browsers merely lose the entrance animation); dark theme not run live; "gentle rather than abrupt"
   is subjective (objectively 480ms and a 1.015 peak); very narrow viewports not re-run; 4K full screen hits
   the 56px cap and has not been eyeballed for being too large.
11. A separate list covers what could be improved in the Release settings panel
   (docs/discussions/2026-09-23-settings-panel-audit.md, audited live at three viewport sizes). Priorities:
   the keyword list's nested scrolling uses overscroll: auto (it chains to the page, unlike the nav dock's
   contain), .button-row carries two margin-top values (CSS 0.75em plus inline 1em, so editing the CSS does
   nothing), and three dead external colour-picker branches (_pickr/_huebee/_spectrum are never assigned) can
   be deleted; also the panel width stays 280px even at 2560 wide, the three dialog buttons hard-code their
   colours with no dark variant, and the scrollbar styling differs from the nav dock's (overlay scrollbars
   here mean the visual difference cannot be measured). Each item lists its evidence and trade-offs.
12. Rollback: tag snapshot-fab-and-close-20260923 (commit 16f8e69).
]
v2026.9.23 [2026-09-23]
The nav dock and the Release settings panel now share one title-bar standard (height 52.09px => 29.8px, matched), the title text shrinks adaptively to the bar width, and the nav dock header gains the settings panel's GitHub mark; follow-up: the settings panel's visible title band (panel top edge => divider) is unified to 37.8px as well
[
1. Request (the user's own words): "Unify the title bars of the nav dock and the Release
   settings panel, take the height from the nav dock standard, shrink the title text
   adaptively, and on top of the nav dock title bar add the GitHub SVG icon from the
   Release settings panel." The @version is also bumped from 2026.10.30 to 2026.9.23.
   Note: 2026.9.23 is a DOWNGRADE and that number was already used historically (see the
   same-numbered entry dated 2026-09-18 below), so users on 2026.10.30 will not receive
   this update automatically. Nothing else in the change depends on that literal.
2. Measured gap before the fix (live, not estimated): nav dock header 29.8px with
   padding 2px 4px 6px and margin-bottom 2px, settings panel 52.09px with padding 0 0 7px,
   margin-bottom 14px and a 17.5px bold title. **The real source of the height gap is not
   the padding but the tallest child**: a title bar's height is max(child height) + padding
   + bottom border, and the settings panel's close control was 1.5em (24px) with .3em of
   vertical padding, i.e. roughly 43px tall - far taller than the title text. Levelling
   only the padding and leaving that control alone still leaves a 23px difference live.
3. Fix (both bars aligned item by item to the nav dock standard): padding 2px 4px 6px,
   margin-bottom 2px, border-bottom 1px solid, title font-size 13px, weight 600, title
   colour muted, close control normalised to 14px / line-height 1.2 / padding 2px 6px.
   The settings panel's bottom border uses a **theme-agnostic** neutral grey
   rgba(125,125,125,.25): its palette follows prefers-color-scheme media queries, whereas
   the nav dock uses --borderColor-muted (which tracks GitHub's own theme). Those are two
   different theme systems, so referencing the variable there would produce a light dialog
   with dark-theme values.
4. Adaptive title shrinking: the title bar becomes container-type: inline-size and the
   title declares "13px fallback + clamp(11px, 6.5cqi, 13px)". The fallback must come
   first, because cqi is an invalid unit on older browsers and the whole declaration would
   be dropped. The 6.5% coefficient keeps both titles at 13px whenever the content box is
   at least 200px wide - both bars sit above that line in normal use, so the unification is
   literal - and only scales down below that, flooring at 11px. The icon is sized in em so
   it shrinks with the title (live: 14.16px -> 12.7px -> 12.09px). Ellipsis is kept as the
   last resort (min-width:0 + overflow:hidden + ellipsis) so a very narrow bar truncates
   instead of pushing the close button out.
5. GitHub mark added to the nav dock title bar: the 16px octicon is now a single source of
   truth. It used to be inlined twice inside the settings panel (the initial template in
   buildSettingsDialogHTML and the redraw in updateDialogColors), and this change needed a
   third copy, so three literals would inevitably drift. Now there is GITHUB_MARK_PATH plus
   githubMarkSvg(em), called from all three places. The nav dock inserts it with
   insertAdjacentHTML("afterbegin") before the text, so title.textContent stays exactly
   "MGGA" (the static gate asserts on NAV_DOCK_BRAND and the accessible name comes from the
   panel's aria-label, both unaffected). It also gains aria-hidden="true"
   focusable="false"; the settings panel's copy lacked that (live: ariaHidden=null).
6. Verification (three layers):
   (1) Offline smoke: 76/76 PASS. New checks: "nav dock title bar carries the settings
       panel's GitHub mark" (the mark is the title's first child, viewBox 16,
       aria-hidden, its path identical to GITHUB_MARK_PATH, textContent still MGGA) and
       "the version badge comes from the single @version source" (the settings panel half
       is asserted in the open-settings scenario), plus a source-level gate "both title
       bars share one height and font-size standard and the title shrinks to the bar width"
       that pins padding / margin-bottom / border-bottom / container-type / fallback-before-
       clamp ordering / font-weight / ellipsis / close-control size on both bars, and
       asserts exactly one mark path with exactly three call sites.
   (2) Offline red/green: feeding the new assertions to the pre-fix build gives 76 checks
       with 74 PASS and 2 FAIL (missing mark svg, missing height standard on the settings
       panel). The 73 pre-existing checks are untouched.
   (3) Live geometry (.workbuddy/probe/diag-titlebar-live.js, iina/iina, viewports
       1280/320/200): title-bar height 29.8px vs 52.09px -> **29.8px vs 29.8px**, and it
       does not move across all three viewports (the height is decided by the close control,
       decoupled from the title font, so adaptive shrinking cannot drag the bar height
       around). The nav dock title goes 12.87 -> 11.56 -> 11px (floor) with the mark
       shrinking in step to 12.09px and zero title overflow; the settings panel stays 13px
       at 320px (still roomy, so it must not shrink) and drops to 11px at a 200px viewport.
       Both bars report v2026.9.23.
       One inferred risk was ruled out by measurement: inline-size containment stops the
       title bar from contributing to the panel's width: fit-content, which could have
       collapsed the panel to its min-width. The measured panel width is byte-identical
       before and after (220px at 1280px, 199.8px at 320px) - the width is still driven by
       the items area.
 8. Follow-up fix (same version, no version bump): the user reported that "the Release settings
    panel's title bar height still does not match the nav dock, and it is not vertically centred
    inside the title bar". A fine-grained live probe (.workbuddy/probe/diag-titlebar-fine.js)
    showed the truth: the two .header elements were ALREADY equal (29.8px vs 29.8px) - the gap is
    ABOVE them. The nav panel needs border 1px + padding 6px to reach the header, while the
    settings dialog adds its own padding of 1.25em (17.5px). What the user measures as "the title
    bar" is the visible band from the panel's top edge to the divider: 49.3px for the settings
    panel vs 37.8px for the nav dock, with the title sitting 6.25px too low - two symptoms, one
    root cause.
    Fix: .color-picker-dialog padding changed from 1.25em to 6px 1.25em 1.25em (the top now
    matches the nav panel's own padding; left/right/bottom stay 1.25em).
    After the fix all three metrics match the nav dock exactly: gap 7px, visible band 37.8px,
    title 0.5px off the band centre (nav dock 0.49px); .header is still 29.8px.
    One deliberate trade-off: the header keeps the nav dock's asymmetric 2px/6px padding instead
    of a symmetric 4px/4px - the eye judges the offset from the visible band's centre, and 2/6
    puts the content exactly there (0.5px), while symmetric padding would sit 3.5px low in both.
 9. Stronger gate: the previous static gate only locked the .header declarations, so it stayed
    green through this defect - which is exactly why it was missed. A new check now locks the
    PANEL's own top padding (both panels must be equal and 6px). Red/green proven: the new
    assertion against the pre-fix build gives 76 PASS / 1 FAIL (naming 1.25em vs 6px); after the
    fix 77/77. Rollback point: tag snapshot-titlebar-vcenter-20260923 (commit b5e4689).
7. Rollback point: tag snapshot-titlebar-unified-20260923 (commit 32dd2cb).
]

v2026.10.30 [2026-09-23]
The nav dock header is moved out of the scroll container; the scrollbar now covers only the items area and never the header (measured live: host 39-213px vs header bottom edge 37px)
[
1. Request (the user's own words): "So the scrollbar should exclude the header area, no
   longer covering the header (#mgga-nav-dock > div.mgga-nav-dock-header)."
2. Root cause: the previous structure made the panel both the container and the scrollport.
   Pinning the header with position:sticky only stops it from visually scrolling away, but
   the **scrollbar is painted by the scroll container** and therefore spans the container's
   entire border-box vertically - and webkit custom scrollbars have no way to "start at the
   Nth pixel" (neither track nor thumb accepts a vertical offset constraint). So as long as
   the panel itself is the scroll container, the scrollbar will always be drawn across the
   header row. sticky cannot fix that.
3. Fix: change the structure and move the header out of the scroll container - the panel
   becomes a flex column with overflow:hidden (it no longer scrolls), while items and
   dividers sink into a new scroll area .mgga-nav-dock-body
   (flex:1 1 auto + min-height:0 + overflow-y:auto + overscroll-behavior:contain).
   All scrollbar pseudo-elements move from #mgga-nav-dock::-webkit-scrollbar* to that
   scroll area, and the Firefox @supports(-moz-appearance:none) fallback moves with them.
   The four sticky companions from the previous release (position:sticky / top:0 / z-index /
   opaque background / same-colour box-shadow edge fill) are **all removed**: they solved
   "scrolling content passing under the header", and that premise is gone now because the
   scrolling content is no longer in the same layer. flex:0 0 auto takes over their job:
   when the panel is squeezed, only the scroll area shrinks.
4. Side effect of the DOM change: the panel's direct children changed from "header + every
   item" to "header + body", so items and dividers moved down one level. Locating a divider
   via div:nth-child(N) must now be written as
   #mgga-nav-dock > .mgga-nav-dock-body > div:nth-child(N). NAV_DOCK_STRUCT_VER is bumped
   16 -> 17 so old panels are rebuilt once.
5. Verification (three layers):
   (1) Offline smoke: 73/73 PASS (the scrollbar gate and the header gate were rewritten, the
       panel-header DOM assertions gained "the header must not sit inside the scroll area",
       and the sidebar-group assertion now reads children from the scroll area). Red/green:
       feeding the new assertions to the pre-change script gives 69/73 with 4 FAILs, all of
       them assertions touched by this change.
   (2) Live functional run: scenario 7.5 of verify-live-navdock.js was rewritten to
       "measure the scroll host's vertical extent" - after the change 30/30 PASS with the
       host = .mgga-nav-dock-body spanning 39-213px against a header bottom edge of 37px,
       i.e. zero overlap; before the change 29/30 with the host = #mgga-nav-dock spanning
       0-220px, i.e. necessarily drawn across the header. Both versions agree on
       scrollTop 0->160, header 7->7px and first item 39->-121px, so this change does not
       regress the previous "header stays put" work.
   (3) Probe pitfall (the second time a measurement-timing mistake bit us): the first
       version of 7.5 read the host rect before setting max-height and the panel rect after,
       so the 162px shift of the centred panel mixed two coordinate systems and produced a
       bogus -124->376px host, i.e. a false FAIL. The new INFO 7.5d layout diagnostics
       (bodyRectH/bodyClientH/flex/minHeight) immediately showed the script itself was fine
       and the probe was wrong. Fix: read the host rect and the panel rect at the same moment.
6. Not verified: live testing covered the light theme only; headless Chrome uses overlay
   scrollbars (the "scrollbar gutter 0px" reading in this very scenario is the evidence), so
   the actual look under the Windows classic scrollbar was not tested - the scrollbar sits
   6px from the panel's right border while the close button sits 10px from it, which may look
   slightly misaligned; add scrollbar-gutter:stable to the scroll area if needed.
   Firefox / Safari not tested.
]


v2026.10.29 [2026-09-23]
The nav dock header is now position:sticky, so scrolling no longer pushes it out of the container to be clipped (measured on a live page: zero displacement)
[
1. Request (the user's own words): "The nav dock's title bar
   (#mgga-nav-dock > div.mgga-nav-dock-header) should be fixed and not take part in
   scrolling, so that scrolling no longer pushes the title outside the container where it
   gets truncated and hidden."
2. Root cause: the panel IS the scroll container (overflow-y:auto + max-height:calc(100dvh - 1em),
   see the immersive scrollbar entry above), and the header is merely its **first normal-flow
   child** - so it scrolls like any item: a little scrolling pushes it out of the scrollport and
   the container clips it, close button included. The panel's height is pinned to 100dvh, so on
   long repo pages or small viewports overflow is guaranteed rather than occasional.
3. Fix: position:sticky + top:0 on .mgga-nav-dock-header. Sticky alone is not enough; three
   companions are all required: (a) an opaque background (otherwise items scrolling up show
   through the header and text overlaps text); (b) z-index:2 (items and dividers are normal-flow
   elements, so make the stacking explicit); (c) a same-colour box-shadow `0 2px 0 0` bleed to
   fill the 2px gap left by margin-bottom (otherwise scrolling content leaks through the seam -
   it is not a shadow, it is the background extended downwards). The background deliberately
   matches the panel colour: while pinned, the header is clipped by the panel's
   border-radius:12px, and a matching colour makes that clipping invisible instead of
   "missing a corner".
4. **Key measured fact (measured live, not inferred)**: with the panel at border 1px +
   padding 6px, Chromium pins sticky to the **content box top edge**, so the header sits 7px from
   the panel's top edge and keeps all 6px of that padding. From rest to scrolled it moves
   **zero pixels** (it does not "slide 6px then pin").
5. New live scenario 7.5 (tools/verify-live-navdock.js): an inline max-height:220px!important
   forces the panel to overflow (constraint only, the code under test is untouched), then the
   header's and the first item's positions relative to the panel's top edge are measured before
   and after setting panel.scrollTop. Everything is normalised to the panel's top edge rather
   than the viewport's because the panel is position:fixed + translateY(-50%).
6. Live red/green (same run): after the change **30/30 PASS**, 7.5 PASS - position=sticky,
   header 7 -> 7px unmoved while the first item goes 39 -> -121px (scrolled away); before the
   change **29/30**, 7.5 FAIL - position=static, header 7 -> **-153px** (exactly -160px = the
   scroll distance, reproducing the user's "pushed out and clipped" verbatim). The other 29
   checks agree in both versions, so this change does not disturb existing behaviour.
7. Offline: a new source-level gate with five clauses (sticky / top:0 / z-index / opaque
   background / same-colour bleed) plus a DOM-level assertion that the header must be
   panel.firstElementChild (it is the pinned one, and the dividers' div:nth-child numbering
   depends on that position too). smoke 72 -> **73/73 PASS**; red/green against the old script
   gives **72/73, 1 FAIL**, and the red one is exactly this new assertion.
   The source-level gate is mandatory because jsdom has no layout engine and does not implement
   sticky at all: "pinned" cannot be verified at runtime there. The source gate locks the
   declarations, live scenario 7.5 proves they actually take effect - neither is optional.
8. Judgement trap: the first version of 7.5 asserted `deltaTop ≈ 0` (assuming it would pin to the
   panel's top edge); the measurement returned 7px and it **reported a false FAIL**. The correct
   criterion is "the header's offset from the panel's top edge is unchanged", not "equal to some
   absolute value". Another reminder: whenever you write an inference, write down the observation
   that could falsify it.
9. Not verified: the live run only covered the default light theme (whether both CSS variables
   resolve in dark mode, and whether the rounded-corner clipping shows, is untested; a possible
   criterion is `getComputedStyle(header).backgroundColor === getComputedStyle(panel).backgroundColor`);
   when the panel does not overflow, sticky has no visible effect, which is expected; Firefox and
   Safari are untested.
10. Rollback point `b261c00770a44f800d39e537583d764604a64a2b`; evidence and reproduction in
    docs/fixes/2026-09-23-navdock-sticky-header.md.
]

v2026.10.28 [2026-09-23]
Nav dock scrollbar is now immersive: the step arrows of the Windows classic scrollbar are gone, the track is transparent, the thumb reveals itself on hover, and scroll chaining is contained
[
1. Request (the user's own words): "Is there a more immersive scrollbar? I'd like the nav
   dock's scrollbar to be more immersive - at the very least it should no longer show the
   step arrows at the top and bottom ends of the scrollbar."
2. Diagnosis. Before the change "scrollbar" appeared 0 times in the stylesheet, so the panel
   used the browser default scrollbar. The panel itself carries overflow-y:auto
   (max-height: calc(100dvh - 1em)), i.e. it IS the scroll container. Chrome/Edge on Windows
   render the **classic scrollbar**, and the pair of arrows the user saw is the
   ::-webkit-scrollbar-button pseudo-element - not content, not one of our elements. It can
   only be switched off with CSS (overflow:overlay has long been dropped).
3. Change 1: the base rule gains overscroll-behavior: contain, so reaching either end of the
   panel no longer hands the scroll over to the whole page (the strongest "immersion" win).
   This matches what the settings dialog already does in .color-picker-content /
   .custom-color-picker-panel.
4. Change 2: a new scrollbar block - ::-webkit-scrollbar 8px; track / track-piece fully
   transparent with no border; ::-webkit-scrollbar-button (all four states) plus
   scrollbar-corner set to display:none with zero size; thumb rgba(127,127,127,.28) with a
   2px transparent border and background-clip:padding-box (4px of visual thickness), 0.5 on
   panel hover, 0.72 when the thumb itself is hovered. The thumb is deliberately **not**
   "invisible until hover": the panel overflows often, so a silent scrollbar would hide the
   fact that there is more content below - a faint grey remains. The colour is the midpoint
   of both themes rather than a theme variable, so light and dark get the same contrast.
5. Firefox fallback: @supports (-moz-appearance: none) carries scrollbar-width:thin +
   scrollbar-color (Gecko never draws arrows anyway, it only lacked the thin bar). That probe
   is always false in Chromium, so it cannot pollute the webkit rules above.
6. **The big trap (silent failure)**: in Chromium 121+, as soon as scrollbar-width on an
   element is anything but auto, the whole set of ::-webkit-scrollbar* rules for that element
   is **ignored outright** - the arrows come back untouched, with no error and with DevTools
   still showing the rules as "valid". In other words "just add scrollbar-width:thin for
   compatibility" is exactly what would destroy this entire change. It is therefore fenced
   inside the Firefox-only @supports block, with the reason spelled out in a source comment.
7. Second trap: the stylesheet is one big JS template literal, so a backtick-quoted
   identifier in a comment (`::-webkit-scrollbar-button`) closes the template early and
   node --check reports SyntaxError. Comments now use the CJK quotes "...".
8. Verification: a new source-level gate assertion (5 clauses) - (a) ::-webkit-scrollbar-button
   must be display:none; (b) **the base rule body must not contain scrollbar-width** (guards
   against the silent failure in 6); (c) the base rule body still has overflow-y:auto;
   (d) it still has overscroll-behavior:contain; (e) the @supports block and
   scrollbar-width:thin are both present. The gate only slices between
   injectNavDockStyle and removeNavDock so it cannot hit scrollbars elsewhere on the page.
   smoke: 71 -> **72/72 PASS**; red/green against the old script (87ad71b) gives
   **71/72, 1 FAIL**, and the red one is exactly this new assertion.
9. Not verified: no live run, and a live run could not decide anything - the acceptance target
   is the **rendering** of ::-webkit-scrollbar-button, and the only environment we can
   screenshot automatically is **headless Chrome, which uses overlay scrollbars and therefore
   never renders arrows at all**: with and without the change the screenshot is identical.
   So this needs the user's own eyes (no up/down triangular buttons on the right, no grey
   track, a thinner paler thumb). The resting thumb opacity of 0.28 is a guess rather than a
   measurement - set it to 0 for a fully hidden, hover-only thumb.
10. Rollback point `87ad71bb87a3435dee474135a8ac14b2b701b92f`; evidence and reproduction in
    docs/fixes/2026-09-23-navdock-immersive-scrollbar.md.
]

v2026.10.27 [2026-09-23]
Nav dock panel title is now the brand name "MGGA", and the per-section captions are gone (dividers remain)
[
1. Request (the user's two points): (a) change
   `#mgga-nav-dock > div.mgga-nav-dock-header > span.mgga-nav-dock-header-title` to "MGGA";
   (b) remove the caption of each of the three sections.
2. Evidence first. Which element the two selectors the user supplied
   (`#mgga-nav-dock > div:nth-child(11)` / `div:nth-child(15)`) actually point at was measured by
   running the script inside the archived **hydrated** DOM: among the direct children of
   `#mgga-nav-dock`, apart from the first child `.mgga-nav-dock-header`, only
   `.mgga-nav-dock-divider` is a `div` (every item is an `a`). The iina hydrated page has 18
   children: header(1) -> repo tabs x8(2..9) -> divider(10, caption "Repository files") ->
   file-area tabs x3(11..13) -> divider(14, caption "Sidebar") -> sidebar x4(15..18). The user's
   page is shifted by +1 (one extra repo tab), so the two `div`s are those two **dividers**
   (the caption is a `span` inside the divider). Two dividers => three sections, matching "three
   sections".
3. Change: the title now uses a new constant `NAV_DOCK_BRAND = "MGGA"` (a brand name is not
   localisable copy, same rationale as `verSpan.title = "Make-GitHub-Great-Again"` in the same
   header). The panel's accessible name is untouched:
   `panel.setAttribute("aria-label", i18n.t("navDock"))`.
4. Section captions: `buildNavDockPanel` no longer creates `.mgga-nav-dock-divider-caption`, while
   the divider itself is **kept** (a bare line) -- the user asked to remove the captions, not the
   grouping cue, so the grouping visuals stay. The caption rule was dropped from the stylesheet and
   the divider rule lost the `display:flex` / `align-items` / `gap` / `padding-top` that only
   existed to carry text. `item.barLabel` is still collected (it is part of the evidence chain in
   the click-decision log, `statsOut.barBuckets`) but is no longer rendered -- stated in a code
   comment so nobody deletes it as a dead field.
5. `NAV_DOCK_STRUCT_VER` 15 -> 16: the DOM structure changed (one `span` fewer), so an old panel is
   force-rebuilt once.
6. Verification: jsdom smoke 71/71 (2 new checks + 1 rewritten). Red/green: the same assertions fed
   to the pre-fix version (`MGGA_SCRIPT=.workbuddy/probe/prev-before-panel-titles.js`) give
   3 FAILs out of 71, exactly "title == MGGA / zero caption leftovers / dividers carry no text",
   with the other 68 unchanged. Also re-checked in place on the archived real hydrated DOM
   (`.workbuddy/probe/hydrated-{desktop,mobile}.html`): title == "MGGA", caption texts == [],
   2 dividers, still 15 anchors. See docs/fixes/2026-09-23-nav-dock-panel-titles.md.
]
v2026.10.26 [2026-09-22]
Nav dock: new "page-side exposure probe" -- an item still exposed on the page is located in place, an item folded into More now navigates to its URL without any locating
[
1. Request: the user asked to "strengthen the nav dock's probing of the items that are still
   exposed on the GitHub repo page instead of folded into More -- if an item still exists on the
   page without being folded into More, locate it directly rather than navigating to a URL; and
   conversely, if it has been folded into More, navigate straight to the URL and do not locate".
   Two boundaries were confirmed with the user before coding: (a) the rule only applies to items
   whose landing spot is on the current page (file-area tabs / sidebar sections / the current page
   itself) while cross-page items (Issues / Actions / Releases...) keep one-click navigation;
   (b) the locate target is **the item itself on the page** (clicking Code in the panel scrolls to
   the Code entry on the page), no longer the vague "back to the top of the content area".
2. New probe layer `navDockSourceVisibility(item) -> {state, el}` with four states: `detached`
   (source anchor is not in the document / the item has no source anchor at all), `gone` (hidden by
   `[hidden]` or CSS display/visibility/opacity), `more` (**already folded into More**: the nearest
   aria-hidden ancestor is an `li` whose only anchor is this one, or it is geometrically clipped out
   of a single-row overflow container), `exposed` (visibly exposed). The geometric criterion is
   gated by `cr.width && ar.width`: without a layout engine (jsdom / display:none) both rects are 0
   and "no overlap" is an artefact rather than clipping evidence. The probe runs **live at click
   time** and does not depend on panel rebuilds, so the known trait "clipping only toggles
   aria-hidden/tabIndex, never href, so the cheap signature stays the same and the panel is not
   rebuilt" cannot interfere with the verdict.
3. Triage path 4 (items whose landing path == the current page) changed from "same page => scroll
   back to the content top" into a two-way split: exposed => take over and locate the item itself
   (`navDockScrollToTarget(vis.el)`) without issuing any navigation (`via=page-item`); folded into
   More => there is no visible landing spot, do not locate at all, and let the click through so the
   real (Turbo / React soft) navigation completes (`via=page-item-hidden`). The
   `?tab=<x>-ov-file` exception takes **precedence** over the exposure probe (otherwise the user
   would "click Code and still be looking at License"); that exception itself is untouched.
4. One implementation falsified by the real browser (**reverted, do not retry**): the first version
   also applied "folded => let the click through" to path 3 (file-area overview tabs: License /
   Contributing / "MIT license"). At 400px this was disproved instantly -- clicking vscode's
   `MIT license` through `file-tab-hidden` changed docId from 16058363578639023 to 4421299704736088
   (**full page reload**) and landed on `/microsoft/vscode/blob/HEAD/license`. Root cause: those
   tabs carry the React route placeholder `#` as href, and the panel's landing path is **inferred**
   by `resolveFileAreaTabHref` from page evidence; when inference fails it guesses a fallback file
   name (`entry.names[0]` = `license`) while vscode's real file is `LICENSE.txt` => non-existent path
   => 301 => full reload. The old version never exposed this because it drives "switch tab" through
   the React client router and never uses that href. => Path 3 stays as it was (switch tab whether
   or not clipped), with an assertion (tools/smoke-load.js scenario 3h-3) pinning "do not reapply
   the let-through rule".
5. Live evidence (new probe channel: the verifier now attaches the predicate functions to
   `window.__mggaProbe` just before the IIFE exits, so the **real functions** can be called directly
   instead of eyeballing the DOM). Page nav entry visibility across viewports -- iina desktop 1280:
   exposed 79 / more 0; iina 400px: exposed 18 / more 0; iina 320px: exposed 16 / **more 2**
   (Contributing, License); vscode desktop: exposed 21 / more 0; vscode 400px: exposed 17 / **more 3**
   (Contributing, MIT license, Security). So the verdict is discriminating (not a constant), and the
   clipped samples match the earlier 320px conclusion from probe-mobile-more-structure.js.
6. Clicking the same-page Code live: at 320/400px INFO 2.0 reports the page-side Code entry as
   "exposed,gone" => `via=page-item`, measured `top=132 y=132 off=0 elTop=0` (located on the Code
   entry itself and pinned to the top), with docId unchanged throughout (no full reload).
7. Verification: jsdom smoke 69/69 (3 new assertions); **red/green control** -- feeding the same
   assertions to the pre-fix build
   (MGGA_SCRIPT=.workbuddy/probe/prev-before-page-exposed.js) yields 67/69, and the red ones are
   exactly the two new capability assertions ("not located on the item itself: elTop = -16" and
   "the item is no longer visible on the page yet the click was still taken over to locate"); five
   live runs: iina 400px 28/29, iina 320px 28/29, vscode 400px 28/29 (this group was 21/22 with one
   full reload before the revert), iina desktop 29/29, vscode desktop 29/29. The only recurring FAIL
   is 8.1 (cross-page item uses soft navigation): `via=pass-through` means the script-side let-through
   is correct and the page side simply did not pick the click up -- the pre-fix build fails the same
   assertion live, so it is a **pre-existing flake**.
8. Tooling: tools/verify-live-navdock.js gained MGGA_SCRIPT (red/green control) and --width
   (`--width 320` reproduces the folded-into-More shape); locateScenario now supports "zero locate"
   and "did it really navigate away after the let-through" assertions; scenario 0.8 logs the ground
   truth. Evidence and open items live in docs/fixes/2026-09-22-navdock-page-exposed-probe.md.
]
v2026.10.25 [2026-09-22]
Nav dock: stop losing the items folded into More when the script initialises on a narrow viewport (Primer UnderlineNav clipped items were killed by the aria-hidden rule)
[
1. Trigger: the user reported "when the script initialises on a mobile page from the very
   first frame it still loses the items folded into More (#_R_1afl_), while the items other
   bars fold into More show up fine". Split into three verifiable criteria: (a) only one bar
   loses them, not all of them; (b) it only happens when the **first frame is already a narrow
   viewport**; (c) that bar's More button points its aria-controls at a runtime id shaped like
   `_R_1afl_`.
2. Root cause: one filter in the collection chain used too coarse a criterion --
   `if (!isFileTab && a.closest('[aria-hidden="true"]')) return reject(a, "ariaHidden")`.
   `[aria-hidden=true]` carries two **opposite** meanings in this DOM and the rule only saw
   one of them: (a) decorative/duplicate wrappers (empty wrap-spacer li / a wrapper div with
   several anchors) => must be dropped; (b) **clipped items** -- navigation items that do not
   currently fit and have been folded into More (`<li aria-hidden>` holding exactly one
   anchor) => **must be indexed**. Conflating the two drops the whole latter group.
3. Component-source evidence (@primer/react@38.40 `dist/UnderlineNav/UnderlineNav.js` +
   `UnderlineNavItem.js`): `isOverflowing = useIsClipped(ref)` (IntersectionObserver rooted
   at the nav) => `<li aria-hidden={isOverflowing || undefined}><a href={href}
   tabIndex={isOverflowing ? -1 : undefined}>`. So the **clipped item itself is still in the
   DOM with an intact href**; only its `li` is marked aria-hidden. The More menu is an
   `ActionMenu.Overlay` that is **rendered only while open**, and the copies inside it are
   duplicates of the same items, not the only source. Visibility is CSS-driven: the
   `MoreButtonContainer`'s `--UnderlineNav_moreButton-display` flips to `flex` via
   `[data-has-overflow=true]`.
4. Version-alignment evidence (that GitHub ships exactly this build): the class names the
   version's CSS module exports match the archived SSR **verbatim** --
   `prc-UnderlineNav-UnderlineWrapper-GWONT` / `ItemsList-oj8gN` / `WrapSpacer--aLgz` /
   `MoreButtonContainer-Dnrq6`, and the SSR markup carries `data-overflow-mode="wrap"`
   (hard-coded in this version) plus `data-hide-icons-breakpoint="medium"`.
5. Live structural forensics (new probe `tools/probe-mobile-more-structure.js`, which
   quantifies per bar what is readable without clicking vs. only reachable by clicking): same
   repository `iina/iina`, only the viewport width changes -- at 400px the "Repository files"
   bar has 3 anchors, all visible, 0 aria-hidden ancestors; at 320px the same bar has only 1
   of 3 visible with **2 aria-hidden ancestors**, the clipped ones being Contributing /
   License, both shaped as "the single anchor inside `li[aria-hidden]`", and the `More items`
   trigger appears. => the mechanism reproduces on a real page with the real Primer build.
6. Why it only shows up when the "first frame is already narrow": clipping is **layout
   driven** and only changes `aria-hidden` / `tabIndex`, **never the href**;
   `navDockCheapSignature` counts only the hrefs of anchors inside the bars, so loading at
   desktop and then narrowing leaves the signature unchanged, the next round takes the early
   short-circuit, and the panel keeps the items collected during the desktop pass -- it looks
   fine (and would lose them just the same the moment anything else triggers a rebuild). When
   the first frame is already narrow, the very first build reads the clipped state => gone.
7. There is also in-repo history for the same phenomenon: the file-area exemption was added
   for exactly this -- "file-area whitelisted placeholder tabs: even when GitHub hides their
   `li` on a narrow viewport, keep them in the dock". The file-area tabs bypass the ariaHidden
   filter through the isFileAreaTabLabel whitelist (which is why the user sees "other bars
   fine"), while **the repository tab bar has no such exemption**, so it lost the whole group.
8. Fix: new `isClippedNavItemAnchor(a, ariaHiddenHolder)` with three tightened criteria --
   (a) the nearest `aria-hidden="true"` ancestor is an `<li>` (an item container, not a
   wrapper div/ul); (b) that container holds exactly one `a[href]`; (c) that anchor is this
   anchor. Hashed module class names (`-syRjR`) cannot be relied on, so the decision uses only
   structure and href. The scan filter becomes
   `ariaHiddenHolder && !isClippedNavItemAnchor(a, holder) => reject`. Admitted anchors still
   go through pushItem's same-label / same-destination dedup chain, so duplicates cannot leak
   in. **The click-free design is unchanged** -- clipped items are already in the DOM with
   intact hrefs, so there is no need to open More to collect them.
9. Regression coverage: `tools/smoke-load.js` gains the fixture
   `repoHomeHTMLPrimerOverflow()` (the clipped-item shape, class names including the build
   hash, proving the fix **does not depend on class names**) plus
   `decorativeAriaHiddenNavHTML()` (the counter-sample: a multi-anchor wrapper div and a
   non-`li` container) and 5 assertions in scenario 3e.
10. Verification: `node --check` (main script + both probes) passes; `node
    tools/smoke-load.js` is **67/67 PASS**; the red/green run
    (`MGGA_SCRIPT=.workbuddy/probe/prev-before-primer-clip.js`) gives **2 FAIL** --
    "clipped overflow items all reach the panel" (`Pull requests missing; got Code / Issues`)
    and "count and dedup correct" (2 items instead of 7), so the assertions do hit a real
    problem; the counter-gate keeps both Decoy anchors out of the panel (the rule was not
    loosened into "any aria-hidden passes"); live mobile iina **28/28 PASS** and live desktop
    microsoft/vscode **28/28 PASS**.
11. The first live run had a single FAIL on 8.1 ("cross-page item takes the soft navigation").
    Against the archive (`live-d4` / `live-diag-iina-mobile` / `live-iina-desktop` /
    `live-vscode-mobile` and others) that item has **flaked the same way across many earlier
    rounds**, and the tool's own comment already states "2 of 6 real runs did not trigger it";
    re-running with identical arguments gives 28/28. Judged a known flake, unrelated to this
    change.
12. Not verified / boundaries: **the logged-in real page was not re-run** (the bar the user
    reports lives in the logged-in new React repository header and there are no credentials on
    this machine). The substitute evidence is a four-part closure: same-version Primer
    component source + the real 320px clipping branch + the verbatim class-name alignment +
    the jsdom red/green. If it still loses items while logged in, the next forensic step is
    written down in `docs/fixes/2026-09-22-navdock-primer-clipped-items.md`: inspect the
    `bar=` / `ariaHidden=` bucket counts in `[MGGA] nav dock: click decision`; if some bar
    still has `ariaHidden > 0` with a visible trigger, there is a second clipping shape (e.g.
    `hidden` on the anchor itself, or a container that is not an `li`) and the same criterion
    should be widened for it.
13. New `tools/probe-mobile-more-structure.js` (supports `--url` / `--mode` / `--width` /
    `--out`): per bar it reports anchor count, visible count, aria-hidden ancestor count,
    `[data-menu-item]` count, the clipped-item list, aria-controls target existence, and the
    anchors that only appear after opening More. It turns "what is readable without clicking"
    from an inference into a measurement; run it first the next time the question is "why is
    this item missing from the panel".
14. Version bumped to 2026.10.25.
]

v2026.10.24 [2026-09-22]
Nav dock gains a "Sidebar" source (Releases/Sponsor/Contributors/Languages) + removes the leftover `?tab=` + opens up a live-verification channel
[
1. Trigger: the user asked to bring the repository sidebar sections into the dock, confirming
   three things at once -- (a) one primary link per section (not every sub-link of a section
   spread out); (b) the panel position goes after the file-area tabs; (c) clean up "on the
   License view, clicking Code leaves the content still showing License". A parallel request
   was to verify the four nav-dock fixes from the previous version on a real device.
2. Prior evidence (see docs/fixes/2026-09-22-sidebar-pane-dom-evidence.md) already concluded
   that the sidebar sections are **not `<nav>`** (measured across four viewport scenarios,
   `nav` is always 4 and the PaneWrapper contains 0), so findRepoHomeNavBars() can never pick
   them up -- that is a structural gap, not something a looser selector can work around, and
   bringing them into the dock requires a new independent source. This release is that
   implementation.
3. Data collection: three new functions. repoHomeSidebarGrid() locates the
   `[class*="borderGrid"]` inside the PaneWrapper; repoHomeSidebarHeadingLabel(h2) strips the
   CounterLabel + VisuallyHidden to get the clean name; repoHomeSidebarSectionEntries()
   yields one primary link per section. **Selectors use only `[class*=]` prefixes and
   `data-component`** (GitHub design-system markers), never the full hashed module class names
   (the `SidebarSection-module__sectionHeading__TG36m` kind -- it dies the moment the hash
   changes).
4. Three-level fallback for the primary link: (a) `h2 a[href]` (the heading itself is the
   link: Releases/Contributors/Languages); (b) `section a[href^="/sponsors/"]` ("Sponsor this
   project" has no heading link but always contains a funding-page link; **the trailing slash
   is mandatory**, otherwise the footer's "learn more" `/sponsors` gets swept in); (c)
   `section a[href*="/search?l="]` (the Languages fallback). All three failing = About (a plain
   text h2 whose body is descriptive text) => **skipped by design, no fake anchor invented**.
5. Two hard filters: (a) empty href, or href starting with `#`, is dropped --
   `#contributing-ov-file` and friends are React route keys (**not element ids**, see item 2 of
   v2026.10.23) and the sidebar should not re-offer them as separate destinations; (b)
   same-origin check: the repository homepage, ko-fi / liberapay and other **off-site** links
   do not enter the panel (entering it would mean taking over the click, and taking over
   off-site navigation is pointless and loses context).
6. Labels and counters: `h2.textContent` is a concatenated string ("Releases53 (53)") whose
   parentheses come from the visually-hidden screen-reader copy. The label comes from the
   plain text of `h2 > span[class*=headingLinkWrapper] > a`; the counter comes from
   `[data-component='CounterLabel']`'s textContent (i.e. "53", no parentheses).
7. Wiring into the data source: collectRepoHomeNavItems appends **after** the existing navList
   loop, with `barKey="repo-sidebar"` and `barLabel=i18n.t("navDockSidebar")` (new key: zh
   "侧栏" / en "Sidebar"). Items take the **sourceless anchor** path
   (`pushItem(href, label, null)`) and are drawn by buildNavDockPanel with a built-in octicon
   plus the counter pill -- **deliberately not cloning the sidebar heading links**: cloning
   would drag in heading-specific styles such as `data-muted` and actually make them
   inconsistent with the panel's other items. Because the barKey changed, a divider appears
   between it and the repository tabs with no extra markup.
8. Counter pill: the counter is a **sibling** of the heading link and cannot be carried out by
   cloneNode, so appendNavDockCounterText(el, item) was added to append a `.Counter` pill; both
   the clone path and the fallback path call it. Dedupe still goes through the existing
   pushItem chain (label-normalised + destination-normalised): if the repository tabs already
   hold the same href (e.g. Releases also appears in the header menu), the sidebar does not
   produce a second entry.
9. Icons: ICON_PATHS in buildNavDockFallbackIcon gained four real 16px octicon paths,
   **taken from the official @primer/octicons package rather than hand-written**:
   release->tag, contributor->people, language->globe, sponsor->heart.
10. The signature must include the sidebar or the **early short-circuit deadlocks**: the
    sidebar belongs to no `<nav>` while navDockCheapSignature only compares navBars -- on the
    first build the sidebar is still an SSR skeleton (`a[href]` count 0, only SkeletonText),
    the entries appear only after hydration, yet the signature decides "nothing changed" and
    returns => the sidebar entries **never get added**. The sidebar sections (heading text +
    heading link href) now go into the signature. The hydration data comes from
    `GET /{owner}/{repo}/_sidebar` and requires `Accept: application/json` (no Accept -> 400,
    `Accept: text/html` -> 406).
11. Fixing the leftover `?tab=`: item 13 of v2026.10.23 documented "same-page items do not
    clear `?tab=`" as an **explicit trade-off** (clearing it needs React Router's navigate,
    which is exactly the reload we were avoiding). This time the move is small -- **do not
    fight the page**: a new navDockHasFileTabParam() (tests the `tab` parameter against
    `/-ov-file$/`), and path 4 of handleNavDockItemClick gains an exception: without that
    parameter it keeps the old behaviour (take over + scroll back to the content top,
    `via=same-page-top`); with it, it **does not take over** (`via=same-page-cleartab`) and
    lets the click run on as a real navigation. Why that is safe: the **path** is the
    repository home but the **body** is parked on License/Contributing, so the target URL
    differs from the current one => a normal visit, **not a full reload**.
12. Why "not taking over" suffices (live click forensics, MGGA_DIAG=1, three observations):
    (a) the panel Code anchor really is hit by the real mouse
    (`target=a.UnderlineNav-item[al=Code]`, `anchorHref=/iina/iina`, `inPanel=true`,
    `trusted=true`); (b) **this branch of ours never calls preventDefault, yet the record
    shows `defaultPrevented=true`** => another, document-level interceptor caught it;
    (c) a **page anchor** is then clicked synthetically (`target=a`,
    `anchorHref=https://github.com/iina/iina`, `inPanel=false`, `trusted=false`) and the URL
    goes straight to the canonical path without a full reload
    (`["/iina/iina?tab=License-1-ov-file","/iina/iina"]`, `hardNav=false`, `docId` unchanged).
    => the navigation is **performed by the page itself**, and our only correct action is not
    to fight it. **But which layer does it was not pinned down**: my first hypothesis was
    "React Router claims the cloned anchor by its `data-discover` attribute", so two
    observation points were added to `6.0` to test it -- and they **refuted** it: the panel
    Code anchor measures as
    `{"raw":"/iina/iina","hasTab":false,"dataDiscover":null,"hasReactKey":false}`, with
    neither `data-discover` nor an own `__react*` key; and the `trusted:false` click on a page
    anchor **is not issued by the script** either (the script has only four `.click()` sites:
    two replays in path 3 plus the click gate's two triggers). Who takes it over and under
    what conditions **remains unsolved** -- all we have is the evidence that such a layer
    exists. That gap directly determines where the criterion sits: since we cannot guarantee
    from the script side that it will happen, "the parameter gets cleared" must not be turned
    into an assertion.
13. One version was tried and **reverted** -- recorded so it is not tried again: we once
    switched to path 3's technique, `preventDefault` + **delegating the navigation to the
    page's own anchor** (`item.source`), reusing the same `canDelegate` guard (source anchor
    exists + connected + `navDockAnchorIsReactManaged`). Reason for the revert, from live
    measurement: the panel Code item's `item.source` does **not** carry an own `__react*` key
    => `canDelegate` is always false => that branch **never executed on a real page** (the
    `via=same-page-cleartab-pass` value distinguished in the logs is its only real-page
    destination); it only ran in the jsdom fixture once the marker was stamped by hand. It
    bought nothing, added one more synthetic navigation, and in that version's observations
    one run hit `Execution context was destroyed` (a full page navigation). So v1 (pass
    through) stays and the dead code is gone -- also a cautionary tale about "write the test
    first": that jsdom scenario only turned green because it **manufactured the conditions the
    implementation happened to need**.
14. Reliability and where the criterion sits: "the parameter eventually gets cleared" is
    **page-side** behaviour; 10 of 17 live observations succeeded (~3/5), with failures
    showing neither the URL nor the docId moving (no soft navigation and no full navigation).
    The split by viewport is pronounced: mobile 8 of 11 (~3/4), desktop 2 of 6 (~1/3). The
    assertion therefore only pins **the script's own decision** (`via=same-page-cleartab`,
    deterministic and red-green-able), while "the parameter gets cleared" is only an INFO
    observation (6.0/6.0s/6.0d/6.2), with 6.2 reporting the URL sampling sequence so the next
    person can tell at a glance whether the page declined to act or the navigation got rolled
    back. The honest conclusion for the user: this fix removes the **wrong behaviour** of
    "clicked Code but still looking at License" (no longer scroll-to-top-only) and hands the
    parameter clearing back to the page, but that step **does not happen every time**
    (noticeably so on desktop) -- making it 100% reliable would require calling React Router's
    navigate, which is beyond what a userscript can control. Two robustness improvements were
    added and are **on by default**, both forced by full navigations: the URL sampling
    sequence (6.0s), and wrapping the post-click measurement in try/catch with hard
    navigations recorded as FAIL (previously `Execution context was destroyed` killed the tool
    with EXIT=2).
15. The live-verification channel is now open (the earlier MEMORY.md conclusion that "live
    verification can only be left to the user" is void). Three traps: (a) GitHub's CSP
    `script-src github.githubassets.com 'sha256-…'` blocks
    `page.addScriptTag({content})` -- it reports "Executing inline script violates…" and the
    script never runs; you must switch to `page.evaluate(scriptString)`, which goes through CDP
    Runtime.evaluate at the same level as the DevTools console and is not subject to the page
    CSP. `GM_*` is stubbed via page.evaluateOnNewDocument before goto. (b) `page.on('load')`
    **cannot** detect a "full reload" (lazy sub-frame loads fire it too; on a desktop viewport
    `loads=0->1` appeared out of nowhere); use the document marker `window.__mggaDocId`
    (random value, renewed only on a full reload). (c) The "pinned to top" criterion is **not**
    `scrollY===0` (`#repos-split-pane-content` itself sits at document offset 171px); the
    correct criterion is the script's own probe `y==top` with `elTop≈0`.
16. Live regression tools/verify-live-navdock.js: 22 -> **28 items**, adding 0.5 (pick the
    real label by pattern -- the license tab is named differently per repository,
    iina="License" / vscode="MIT license"), 0.7-0.11 (five sidebar-source items), 6.1 (asserts
    **our own decision**: let the soft navigation through rather than take over,
    `via=same-page-cleartab`), and 8 (cross-page item soft-navigation pass-through, with 2
    retries and the click method plus `via` recorded as evidence). Four combinations
    (iina/vscode x desktop/mobile) are **28/28**, with `docId` unchanged throughout => zero
    full reloads. A new `MGGA_DIAG=1` click diagnostic was also added (off by default): at the
    window bubble stage (the last listener to see the event) it records each click's target /
    anchor href / whether it is inside the panel / final `defaultPrevented` / whether it is a
    trusted event / owning nav, plus an elementFromPoint at the click coordinates -- answering
    "was this anchor actually hit" and "who cancelled the default".
17. Offline regression tools/smoke-load.js: 55 -> **62/62 PASS**. Added 3i (sidebar source
    in the panel, five assertions: entries exist / order / clean label / counter pill /
    About absent), 3j (sidebar skeleton -> rebuilt after hydration, the signature must
    change), 3k (the `?tab=` exception: with the parameter no takeover -- `defaultPrevented`
    false and no self-scrolling -- and takeover still happens without it). Fixtures:
    sidebarGridInnerHTML / sidebarSectionsHTML / sidebarRepoHTML / sidebarSkeletonHTML.
18. Red-green: the same assertions against the pre-fix version (MGGA_SCRIPT pointing at
    `git show 6094098:Make-GitHub-Great-Again.js`) **fail 6 of 62**: (a) one `?tab=`
    exception item ("still taken over with `?tab=` present => only scrolls to top, the body
    stays on the overview file"); (b) five sidebar-source items (entries missing / primary
    link resolution / counter pill / group heading / skeleton->hydration rebuild). Note
    that "About not in the panel" **passes vacuously** on the old version (there is no
    sidebar source at all, so there is no About either) -- it does not by itself test this
    change; the six above do.
19. Structure version NAV_DOCK_STRUCT_VER 14 -> 15 (the sidebar source changes the panel
    structure).
]

v2026.10.23 [2026-09-21]
Nav dock file-area tabs: pin the new content to the top after switching (Contributing/License no longer "shift down a distance"), and stop reloading when clicking a tab that is the current page
[
1. Trigger: the user reported "clicking README does not shift the page down, but clicking
   Contributing and License shifts it down a distance instead of pinning to the top like
   README does", plus "when the page is already on the code page, clicking Code should
   scroll-to-top via AJAX rather than reload". Two independent defects: where the page
   lands after a file-area tab switch, and what clicking a same-page tab does.
2. Decisive evidence: **`-ov-file` is never an element id**. It is the **React route key**
   of GitHub's `OverviewRepoFiles` component. Evidence comes from GitHub's own bundle (a
   copy is kept in this repo at .workbuddy/probe/code-view.js) and the string appears in
   only three places:
   (a) the nav item's selected-state comparison `"aria-current": "readme-ov-file"===ep?"page":void 0`;
   (b) the real tab switch `N=(e,t)=>{e.preventDefault(); if(ep===t)return;
       let n=new URLSearchParams(eu); n.set("tab",t); eh(n,{replace:!0,preventScrollReset:!0})}`
       -- it changes the `?tab=` query parameter and **explicitly forbids the scroll
       reset**; clicking the already-selected tab just returns;
   (c) the sidebar/mobile-menu hash route key `href:"#contributing-ov-file"`.
   Plus the tabNames list (`f.push("contributing-ov-file")` etc.). **The component never
   puts this id on any element.**
3. Real-page re-check (diag-locate.js extended with "locate target after tab switch" and
   "same-page items"): iina (#readme-ov-file / #License-1-ov-file / #contributing-ov-file),
   vscode (#readme-ov-file / #MIT-1-ov-file / #contributing-ov-file / #security-ov-file),
   kubernetes (#readme-ov-file / #Apache-2.0-1-ov-file / #contributing-ov-file /
   #security-ov-file) -- **8 route keys, every one with targetExists=false**.
4. Root cause A (why only README pinned): README is the default selected tab
   (aria-current), so navDockInPageTarget takes the "already selected -> claim the file-area
   article" branch and **gets an element** => path 2 locates immediately. Contributing and
   License are not selected => hit.el===null => path 3 hands the click back to React's
   original anchor, which switches the tab correctly (that part was always fine), and then
   waits for an element that **never exists** => the 1500ms wait always expires =>
   **it never locates at all**. The tab switches, the page does not move, and relative to
   README that reads as "shifted down a distance".
5. Fix A: (a) the completion signal is now **selection migration**
   (navDockFileTabSwitched + navDockBarSelectedKey; the owning bar is found via
   item.source.closest("nav"), falling back to aria-label="Repository files");
   (b) the locate target is now the **rendered article**
   (navDockFileTabLocateTarget, three-level fallback: a genuinely present -ov-file element
   -> navDockOverviewArticleEl() -> navDockContentRootEl(); on all three repos the second
   level always hits `markdown-body entry-content container-lg`);
   (c) **pin once immediately** (so slow networks still get feedback), then re-align once
   more when the switch completes, with residual drift absorbed by the existing 1.2s
   bounded re-assert; (d) if React never hydrated, the timeout still replays the panel
   anchor itself, so reachability is never worse than before.
6. Root cause B (same-page tab reload): the Code tab's landed path is
   dest===location.pathname, while the old scope guard was
   `if(!isFileAreaTabLabel(item.label) && !(hit&&hit.id)) return false` --
   isFileAreaTabLabel("Code") is false and hit is null => **it refused to take over** =>
   the click went to the browser/Turbo as a **same-URL navigation**: re-fetch the whole
   content block and reset scroll, which the user perceives as a "reload".
7. Fix B: a new path 4 -- an item whose landed path is the current page **issues no
   navigation at all**: navDockIsSamePageHref parses to a URL and compares pathnames
   (trailing slash trimmed; both relative and absolute forms handled; cross-origin never
   taken over). On a hit we preventDefault and locate navDockContentRootEl()
   (#repos-split-pane-content -> #repo-content-pjax-container -> main; present on all three
   repos). This applies to every same-page tab (clicking Issues while on the Issues page
   benefits too), not just Code.
8. Scroll engine: navDockScrollElementToTop gained one more level -- if the target is
   itself a scroll container (#repos-split-pane-content carries tabindex="0", GitHub's
   "keyboard-scrollable region" marker, so it *is* a scroll container), aligning its outer
   box is not enough: its inside is still parked half-way. It now resets its own scrollTop
   as well, i.e. "show this element from its own beginning". The measurement also returns
   a `self` flag.
9. Readable logs: `via` now covers in-page|file-tab|file-tab-await|same-page-top|
   pass-through; when a locate happened, `self=0` means the target's own interior was
   reset. On a real device just click Contributing/License once and read `via=` to see
   which path was taken.
10. Regression: tools/smoke-load.js **55/55 PASS**. New scenario 3g (file-tab pinning,
    3 assertions: the fixture deliberately contains **no -ov-file element** to match real
    SSR; the switch callback moves the article's absolute document offset from 2000 to
    3200 and we assert the last scrollTo is 3200 and elTop is 0, proving the post-switch
    re-align really happened; License is exercised separately because its route key has a
    different shape, #License-1-ov-file) and scenario 3h (same-page tab: window preset to
    900 and content-pane scrollTop to 700; after clicking Code we assert it was taken over
    (defaultPrevented), the URL did not change, scrollTop went to 0, the window went to
    236 and the pane's elTop is 64; plus "cross-page item Insights is still not taken
    over").
11. Red-green: the same assertions against the pre-fix version
    (.workbuddy/probe/prev-before-filetabs-fix.js, from snapshot e4d243d) **fail 3 of
    them**: (a) after switching to Contributing the scrollTo call sequence is **empty**
    (the old version never located at all -- direct evidence of the user's report);
    (b) same for License; (c) same-page Code was not taken over (it would perform a
    same-URL navigation = reload). tools/verify-harvest-sim.js is 10/10, no regression.
12. Not yet verified: a real device (this machine cannot reach github.com -- curl SSL
    error 35 / node fetch failed), so verification is end-to-end against saved real SSR
    only. On a real device: `via=file-tab` is ideal; if it says file-tab-await (no
    selection migration observed within 1.8s) the page **has still been pinned
    immediately** at the top of the file area and does not fall back to the old behaviour
    -- send me that line and I will tighten the detection.
13. Known trade-off: same-page items do **not** strip the `?tab=` search parameter --
    stripping it would require a React Router navigate, which is exactly the reload we are
    avoiding. Consequence: with `?tab=license` in the URL, clicking Code scrolls back to
    the top but the content stays on License. This is an explicit trade-off, not an
    omission.
]

v2026.10.22 [2026-09-21]
Nav-dock locate fix: exact pin-to-top under three layers of scrolling + no more full-page navigation (clicking LICENSE no longer jumps away)
[
1. Trigger: the user reported "clicking LICENSE in the nav jumps the page to
   https://github.com/iina/iina/blob/develop/LICENSE, and each of the three Repositories nav items shifts the page
   downwards on locate instead of pinning to the top." Two independent defects: the navigation behaviour, and the
   scroll landing position.
2. Root cause A (full page reload): the previous version always called preventDefault() when the in-page target was
   not rendered, waited 1500ms, and on timeout ran location.assign(item.href) -- a **document-level navigation**
   that bypasses Turbo and throws the SPA context away. And item.href for a file-area topic tab comes from
   resolveFileAreaTabHref: iina's License tab hits "evidence 1 (the page already has a /blob/.../{license,...}
   anchor)", i.e. the left file-list link /iina/iina/blob/develop/LICENSE -- exactly the URL the user reported.
3. Root cause B (locate not pinning to top): navDockScrollToTarget used
   el.scrollIntoView({block:"start"}), whose semantics are "scroll every scrollable ancestor, level by level",
   with all per-level offsets computed from **one shared initial geometry**. On the new repo page the content area
   is itself a scroll container (#repos-split-pane-content carries tabindex="0" plus a same-named data-selector --
   the classic "keyboard-scrollable region" marker), so there are two layers (inner container + window): the inner
   layer scrolls by d1 from the initial rect and the window scrolls by d2 from the *same* initial rect, and the two
   cancel each other out => the target ends up neither at the container top nor at the viewport top but somewhere in
   between and lower ("shifts downwards"). behavior:"auto" also follows the site's CSS scroll-behavior: smooth, so
   an interrupted animation stops halfway; and nothing anchors the result, so hydration / focus restoration /
   sticky reflow can all move the scroll again.
4. Fix A (no full-page navigation): the location.assign fallback is gone, replaced by three tiers --
   (1) in-page target already in the DOM -> take over + locate immediately (no navigation, no reload);
   (2) source anchor is an href="#" placeholder tab -> take over and hand the click back to the original React
       anchor (native client-side route = AJAX); only when React has **not** taken over (not hydrated yet, nobody
       can catch the click) do we replay the panel anchor itself once (it carries the real href, so Turbo handles
       it as a soft navigation); if React did take over and is still waiting for route data we do not replay, to
       avoid a double navigation racing itself;
   (3) everything else (real-URL community-file links such as LICENSE in the left file list) -> **do not take
       over**: the panel anchor's own href is left to Turbo's global interceptor, which is more faithful than
       anything we could substitute.
5. Fix B (location engine rewritten): new helpers navDockScrollableAncestors (find scrollable ancestors) /
   navDockStickyOffsetWithin (in-container offset) / navDockStickyTopOffset (top-bar offset) /
   navDockTargetScrollTop / navDockSetWindowScrollTop / navDockScrollElementToTop / navDockStartLocateReassert
   replace scrollIntoView: inner containers scroll first (minus the sticky sub-nav already stuck to the container
   top), then the window aligns last (minus the measured height of fixed/sticky top bars, taking the max with the
   site's own scroll-padding-top), with explicit behavior:"instant" so CSS smooth cannot eat it, and a scrollTop
   fallback in case scrollTo has been overridden.
6. Anchoring and yielding: a bounded re-locate runs for 1.2s after the locate (only when the user has not scrolled,
   the target is still in the document, and the position is actually off by >2px); a one-time capture+passive
   wheel/touchstart/keydown listener aborts it the moment the user scrolls, so the scrollbar is never fought over.
   The harvest re-bounce suppression window grew from 1200ms to 2000ms to cover the re-locate window, so
   unlockPageScrollForHarvest cannot pull the locate back to snapY.
7. Observable logging: the locate line now carries measured values top=/y=/off=/elTop=/inner= (target scroll
   position / actual / top offset / target viewport Y after locating / number of inner containers scrolled), with
   via one of in-page|delegate-ajax|await-render|pass-through; if another scroll moved the target afterwards, a
   second line "locate re-asserted Nx (...)" is emitted -- no more guessing on the next real-device repro.
8. Regression: tools/smoke-load.js gains scenario 3e (three-layer fixture: self-scrolling content area + sticky
   sub-nav + fixed top bar; asserts container scrollTop=860 / window=276 / article elTop=64, then re-checks after
   1.4s for drift), scenario 3f (a real-URL LICENSE item must not be taken over) and a static regression gate
   (handleNavDockItemClick's body must not contain location.assign/replace). New test scaffolding:
   installFakeLayout / viewportTop / stubViewportRect / stubScrollable -- jsdom has no layout layer (scrollY is
   always 0, getBoundingClientRect is always 0, scrollTop writes are ignored), so without stubs there is no way to
   assert "which element was located / whether it pinned to the top". 50/50 PASS.
9. Red-green: the same assertions against the pre-fix version
   (.workbuddy/probe/prev-before-locate-top-fix.js, taken from snapshot b1b204a) fail 6 of them, each mapping to
   one of this release's two defect classes (4 for locate/pin-to-top, 2 for full-page reload).
   tools/verify-harvest-sim.js 10/10, and the simulation sandbox now declares the previously missing
   navDockScrollRebounceSuppressUntil (without it the re-bounce callback throws a ReferenceError 50ms later).
10. Real-page verification (diag-locate.js extended to report the triage path plus community-file links):
    iina / vscode / kubernetes -- the README tab triages to in-page (hits the markdown body), the other tabs to
    delegate-ajax, and LICENSE / README.md / CONTRIBUTING.md in the left file list all triage to pass-through,
    with hrefs that are exactly the URLs the old location.assign used to reload.
11. Not verified: a real logged-in device (this machine cannot reach github.com: curl SSL error 35 / node fetch
    failed). How to read it on a real device: click License once and check the via= on the locate line; if it still
    does not pin to the top, look for a re-asserted line (its presence means a third-party scroll is competing).
]

v2026.10.21 [2026-09-21]
Nav-dock overview-file items: README now locates in-page instead of reloading, and unselected tabs delegate back to the original anchor to trigger AJAX
[
1. Trigger: the user reported "why does clicking the README item not immediately locate to README? Isn't README
   displayed on the page by default?" plus "I want all AJAX-capable items to immediately locate to the target
   position and trigger the AJAX."
2. Evidence 1 (real SSR, .workbuddy/probe/iina.html and two more repos): all three tabs of the file-area
   `nav[aria-label="Repository files"]` are React client-route placeholders --
   `<a href="#" aria-current="page">README</a>`, `<a href="#">Contributing</a>`, `<a href="#">License</a>`.
   The real route is performed by React intercepting the click (= the AJAX).
3. Evidence 2 (root cause; probe .workbuddy/probe/diag-locate.js over real pages, identical across three repos):
   the collection chain's pushItem lands a "selected + href=#" anchor at `location.pathname`, so the README panel
   href equals the current page path => clicking it makes the browser navigate to the current URL (no fragment)
   = **a full page reload**, scroll position reset to the top. Neither a locate nor immediate -- and since README
   is already displayed, the reload is pure waste.
4. Evidence 3 (why AJAX was lost): collectNavDockOriginalAnchor deep-clones the source anchor. React stores
   `__reactProps$…`/`__reactFiber$…` as **own properties** of the DOM node, and cloneNode **does not copy own
   properties** => the clone is invisible to React and clicking it only follows the native href => an `href="#"`
   overview tab completely loses client-side routing inside the panel. (By contrast, real-URL items keep working
   because GitHub's own Turbo global interceptor still catches the clone's plain href -- proven by
   `data-turbo-frame="repo-content-turbo-frame"`, so those were already AJAX; this round leaves them alone.)
5. Evidence 4 (reusable official anchors): the right-hand About->Resources block links to overview files with
   in-page anchors -- `#readme-ov-file` / `#License-1-ov-file` (iina) / `#MIT-1-ov-file` (vscode) /
   `#Apache-2.0-1-ov-file` (kubernetes). But in **SSR only the href exists, the matching id element does not**
   (measured "targetExists=false" on all three repos; the id is added client-side) => the location strategy must
   "prefer an already-present element", otherwise trusting only the id turns the click into a no-op.
6. Stable identifiers of the file-area content: `#repos-split-pane-content` (same name as its `data-selector`)
   + `article.markdown-body.entry-content` (GitHub's fixed class combo for rendered markdown). Hashed module class
   names (OverviewRepoFiles-module__Box_3__*) are kept out of selectors -- a build-hash change kills them.
7. Fix 1 (triage click): new handleNavDockItemClick(event, anchor, item), attached to every panel item (clones and
   hand-drawn fallbacks share attachNavDockItemClick):
   (1) modifier key / non-primary button / target=_blank -> hand back to the browser (new tab etc.);
   (2) target already present on the page -> preventDefault + instant locate (behavior:"auto", matching "immediate");
   (3) target not rendered and the original anchor **is React-managed** -> preventDefault + hand the click back to
   the original anchor so React's client router swaps the content in place (AJAX), then locate once it appears;
   (4) not managed (pre-hydration) or nothing to hand back -> just wait for the target; if it never appears, fall
   back to the item's own href, preserving reachability identical to before (and **no reload** when href === location.pathname).
8. React-management probe navDockAnchorIsReactManaged: checks `Object.keys(el)` for `__react*`. This is both the
   root cause of "clones cannot drive React routes" and the only reliable readiness probe -- handing a click to an
   unmanaged `href="#"` anchor would just make the browser jump to the top of the page (empty fragment).
9. Scope deliberately narrowed: overview-file items only (isFileAreaTabLabel matches, or an `-ov-file` target id is
   confirmed). Other items are real URLs whose cloned hrefs are already caught by Turbo, so they are left untouched
   to avoid widening the change surface.
10. Fix 2 (in-page target resolution) navDockInPageTarget(item), **preferring an already-present element**:
    A) navDockOvFileAnchorIdFor(key) scans the page for `a[href="#xxx-ov-file"]` and claims the one whose text
    normalises (navDockLabelKey keeps alphanumerics only) to the panel label -- so `Readme` <-> `README` and
    `MIT license` <-> `MIT license` both match; then getElementById.
    B) when the item is the file area's **currently selected** overview tab (aria-current/data-selected), claim the
    already-rendered content block navDockOverviewArticleEl(). **This is the branch that covers README**: its content
    is on the page, needing neither a render nor a navigation.
11. Measured on real pages (diag-locate.js): README -> id=readme-ov-file + el=the content block OK;
    Contributing/License/MIT license/Apache-2.0 license -> ids contributing-ov-file / License-1-ov-file /
    MIT-1-ov-file / Apache-2.0-1-ov-file; Code of conduct / Security -> id=null (sidebar text does not match) ->
    after delegating, wait for `#…-ov-file` by prefix, and fall back to the item href if it never lands (no regression).
12. Fix 3 (scroll rebounce suppression): unlockPageScrollForHarvest's 1.5s grace rebounce only recognises snapY and
    would drag a just-triggered locate back (symptom: "clicked README, it scrolled over, then got yanked back").
    Added navDockScrollRebounceSuppressUntil; navDockScrollToTarget sets it to now+1200ms and the rebounce returns
    early inside that window.
13. Diagnostics: each locate logs one line
    `[MGGA] nav dock: locate "<label>" via=<in-page|delegate-ajax|await-render> id="…" href="…"` -- one click on a
    real device now self-reports which path was taken, no more guessing.
14. Regression: tools/smoke-load.js gains scenario 3d (5 assertions: README locates in-page to its content with the
    URL unchanged; an already-rendered target id is claimed via GitHub's own anchor; an unselected tab delegates and
    the original anchor receives exactly 1 click; the non-overview Issues item is not intercepted; Ctrl+click is not
    intercepted) plus the overviewFilesHTML() fixture. 46/46 PASS. Red-green: the same assertions against the pre-fix
    version (.workbuddy/probe/prev-before-locate-fix.js, taken from snapshot f76cc9e) fail 3 of them; all pass after
    the fix. tools/verify-harvest-sim.js 10/10 (no regression).
15. Test infrastructure: jsdom does not implement navigation, so clicking a real link prints "Not implemented:
    navigation" to stderr; smoke-load.js gains a quietNavigation option (an isolated VirtualConsole used only by this
    scenario, without affecting window.onerror collection).
16. Unverified: real device (logged-in repo page). This machine cannot reach github.com (curl SSL error 35, node
    fetch failed), so verification is limited to the saved real SSR. To be confirmed: whether `#…-ov-file` really
    gets an id after client-side render. Version 2026.10.20 -> 2026.10.21, panel struct version 12 -> 13.
    Rollback point: f76cc9e.
]

v2026.10.20 [2026-09-21]
Root-cause fix for a spurious nav-dock click: the Breadcrumbs bar was permanently admitted by the gate + misleading click-log wording
[
NOTE: this file mirrors only the newest batches. The 30 entries for v2026.9.18 - v2026.10.19 were maintained in Chinese only, in update_log.md; see the bilingual batch overview at the top of this file for a summary of the whole 2026-09-18 - 2026-09-23 batch.
1. Trigger: after the clickless release, the user re-tested a logged-in repo page and the console still showed
   `[MGGA] nav dock: harvest click #1 ok on "?"`, asking "what triggered the fallback?".
2. Evidence 1 (version lock): that log line was line 5967, byte-identical to the v2026.10.19 working copy
   (same line was 5837 in the pre-change snapshot 8772c63) => the clickless build was indeed running, not stale code.
3. Evidence 2 (meaning of "?"): recordClick's label fallback chain is
   `normalizedText(trigger) || aria-label || "?"`, so "?" means the trigger had **no text and no aria-label**
   -- a pure icon popup button. A full-page scan (real SSR + injection) found only 4 such buttons, and only 1
   inside any nav (the repo tab bar's action-menu), whose bar had zeroClick=23 and was already gated
   => the clicked element must be a bar that does not exist on an anonymous page.
4. Evidence 3 (smoking gun, historical log inside the repo): lines 87/91 of the 2026-09-20 console archive under
   .opensquilla/attachments/ --
     [MGGA] scan "Breadcrumbs" vis=2 trig=icon-btn
     [MGGA] nav dock: harvest click #1 ok on "?"      <- immediately after
     [MGGA] scan "Repository" vis=9 trig=More items   <- only then the next bar
   => the clicked bar was **nav[aria-label="Breadcrumbs"]** (the logged-in AppHeader breadcrumb / prev-next repo bar).
5. Root cause: the two anchors of the Breadcrumbs bar are `/owner` and `/owner/repo`, both dropped by
   isBreadcrumbish => that bar's "zero-click-obtainable items" count is **always 0** => the zeroClick-only gate
   **admits it forever**: every session necessarily clicks its nameless icon button (the repository picker), and the
   picker links go through pushItem straight into the panel (bypassing the breadcrumb filter). This is exactly the
   source of the duplicate/junk items recurring since 2026-09-20 -- the note in
   docs/fix-2026-09-20-dock-duplicate-tabs.md ("Breadcrumbs bar kebab harvested into the panel") merely suppressed
   them by de-duplication at the time and never closed the click entry point, which the clickless change re-exposed.
6. Side finding: the log wording was inaccurate -- `harvest click #N` was a **harvest conclusion**, not proof that a
   click happened. harvestMoreItemsLocked skips the click and waits for the menu when the trigger self-reports
   aria-expanded="true", and it also does not click when a pre-checked menu or the global fallback matches.
   The first investigation round was misled by this.
7. Fix 1 (extra gate condition): added navDockBarClickAllowed(bar, trigger, zeroClick, barBuckets) as the **single
   decision entry point for the click path**, shared by navDockHasPendingTrigger / navDockEarliestRetryAt /
   the initial harvest loop / hasUndecided / missedBars (previously four sites each repeated the same condition,
   and missing one meant a leak). New condition: a bar whose anchors were all dropped (kept=0) and whose trigger has
   **no accessible name** is never clicked -- opening it only yields picker links.
8. Fix 2 (isDockEligibleBar): exclude breadcrumb/prev-next bars by aria-label regex
   /breadcrumb|面包屑|当前位置/i -- neither indexed nor clicked. Same origin as the existing Global/Footer exclusions;
   this one function is shared by indexing and all five gate sites.
9. Fix 3 (keeping a fallback path outside isDockEligibleBar): clicking is still allowed when a bar has **no anchors at
   all** (unknown structure, menu injected entirely by JS, e.g. the logged-in header react-partial) or the trigger
   **has an accessible name** (More / More items / Toggle navigation) -- not throwing out the baby with the bathwater.
   The fake header in verify-partial-header-flow.js (text "More") still takes that branch.
10. Diagnostics 1: collectRepoHomeNavItems' statsOut now has barBuckets
    (Map<Element, {total,kept,hidden,ariaHidden,outside,moreLabel,breadcrumb,prerendered,sampleRejected}>),
    recording per anchor which rule dropped it; keyed by the **bar element**, not a string, so it is immune to React
    rewriting className/aria-label (a string key would fail lookup and misjudge that bar as zeroClick=0, wrongly
    opening the gate).
11. Diagnostics 2: every real click decision now logs one console.info decision line (bar name, key, bucket detail,
    trigger name), and recordClick's log appends clicks= (real click count this round) and menu= (menu container),
    with wording changed to `harvest #N ...` -- so the next extra click self-identifies its bar and reason from one
    line instead of another byte-by-byte comparison against historical archives.
12. Regression: tools/smoke-load.js gains scenario 3c (breadcrumb bar + nameless icon button + picker menu), 3
    assertions; and stubs sizes for the 3b More trigger -- jsdom has no layout and harvestMoreItems early-returns on
    zero-size triggers, so without the stub "clicks=0" is produced by the zero size and does not verify the gate itself.
13. Red-green check: the same assertion set fed to the pre-fix version (.workbuddy/probe/prev-before-breadcrumb-fix.js,
    taken from snapshot a93d092) => 3 FAIL (breadcrumb button clicked once, two junk items Picker Repository/Branches
    entered the panel, item count 9 != 7); after the fix 41/41 PASS (clicks=0, 7 items).
14. tools/verify-harvest-sim.js: also grab navDockDescribeNode (a new dependency of the diagnostic branch; the
    name-extracted sandbox would otherwise ReferenceError), plus 2 new diagnostic-out assertions, 10/10 PASS.
15. Unverified: real logged-in device (github.com cannot be logged into locally; headless Chrome direct connection times
    out). After restarting the extension, please confirm on a repo page that the console no longer shows any
    "Breadcrumbs" click decision line and that the panel contains no Picker items.
]

v3.5 [2026-03-23 16:17:39 +0800]
Rename script and add SVG icon replacement (Integrating new features & UI tweaks)
[
1. Name adjustment.
2. Settings UI tweak (menu label and dialog title).
3. Add an SVG icon-replacement ability to the Settings panel, which takes effect in real-time.
4. Add architecture keyword highlighting in filenames.
5. Other related styles, and minor UI/style adjustments.
6. Update README (ZH/EN).
]

v3.1 [2025-06-21 17:17:54 +0800]
Update presentation image
[
1. Update presentation GIF
]

v3.1 [2025-06-21 16:27:31 +0800]
Support dynamically switching background color and custom colors based on browser theme without closing the panel
[
1. Support panel dynamically switches background color and custom colors according to browser theme without closing
]

v3.0 [2025-06-16 20:30:31 +0800]
Update readme.md
[
1. Update and adjust documentation content
]

v3.0 [2025-06-15 01:41:49 +0800]
Make-GitHub-Great-Again!
[
1. Use new script name
]

v3.0 [2025-06-15 01:36:33 +0800]
New Name
[
1. Make-GitHub-Great-Again! (Change project name)
]

v3.0 [2025-06-15 00:39:56 +0800]
Update readme
[
1. Record: Add alternating background colors for the Release Assets list
2. Record: Improve readability and distinguishability of asset entries
3. Record: Prevent file download errors caused by visual ambiguity
4. Record: Adapt to GitHub's dark/light themes
5. Record: Support setting colors for dark and light themes independently
]

v3.0 [2025-06-14 23:17:52 +0800]
3.0
[
1. Add reset button to the panel: Consistent with the Tampermonkey script menu "🔄 Reset to default colors" function, and only resets colors under the current theme.
2. Adjust color picker panel to follow the GitHub page theme.
3. Support assigning colors separately for dark and light themes dynamically.
]

v2.0 [2025-06-13 13:05:17 +0800]
Update readme.md
[
1. Update README doc to match the new features
]

v2.0 [2025-06-13 01:52:50 +0800]
Create README_en.md
[
1. Create English version of README
]

v2.0 [2025-06-13 01:41:48 +0800]
Update README.md
[
1. Update README doc
]

v2.0 [2025-06-13 01:17:45 +0800]
Update README.md
[
1. Update README doc
]

v2.0 [2025-06-12 01:17:35 +0800]
2.0 Add color picker to set colors
[
1. Add color picker capability for color setup
]

v1.0 [2025-05-31 20:26:03 +0800]
Standardization declared again
[
1. Fix and standardize userscript metadata declaration
]

v1.0 [2025-05-31 20:18:49 +0800]
Standardize ==UserScript== declaration
[
1. Standardize ==UserScript== metadata block
]

v1.0 [2025-05-31 19:53:49 +0800]
Change @name to Assets-Distinguisher
[
1. Change the script codename to Assets-Distinguisher
]

v1.0 [2025-05-31 19:38:26 +0800]
Add English translate to comment
[
1. Add English translation to code comments
]

v1.0 [2025-05-31 17:50:50 +0800]
Create Assets-Distinguisher.js
[
1. As GitHub's Release Assets list is not aesthetic enough and easily causes visual fatigue or downloading wrong files
2. Intended to make it look more comfortable and easier to distinguish between assets. Created the main logic codes.
]

v1.0 [2025-05-31 17:35:29 +0800]
Initial commit
[
1. Project repository initial commit
]
