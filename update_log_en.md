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
