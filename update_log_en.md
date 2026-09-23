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
NOTE: entries from v2026.9.x onward are maintained in update_log.md (Chinese); this file resumes mirroring at the newest entry.
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
