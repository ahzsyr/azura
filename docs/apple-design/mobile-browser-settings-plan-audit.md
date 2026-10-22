# Audit — "Mobile browser settings must show on the phone" plan

**Date:** 2026-10-23
**Audited against:** `080587e2 fix theme` (HEAD), local dev container, and **live** `https://safeermedina.com` (mobile viewport, Chromium 155).
**Verdict:** **The plan is directionally right and technically sound in ~70 % of its parts, but its root-cause story is wrong, one of its premises is false, and it does not fix the biggest defect it is responding to.** Do not implement as written; implement the corrected sequence in §7.

---

## 1. What I verified about the live site

I rendered `safeermedina.com` at 393×852 and dumped the runtime state:

| Signal | Live value | Meaning |
| --- | --- | --- |
| `data-glass-effect` | `liquid` | Liquid Glass **is** enabled (the report said so; confirmed) |
| `data-chrome-tint-style` | `gradient` | Settings changed since the earlier `glass` screenshots |
| `--az-browser-chrome-tint` | `#ddbc66` | Theme-color projection |
| `<meta theme-color>` | `#ddbc66` / `#7c6938` | Opaque, as expected |
| `viewport-fit` | `cover` | Edge-to-edge viewport present |
| **`.header-root` / `.site-header`** | **absent** | **There is no site bar in the DOM at all** |
| `data-edge-to-edge` | absent | Old paint code (pre-`2d2dcfa6`) + new client chunk |
| `data-has-site-header` | `"false"` | The new component correctly detects "no bar" |
| `.marketing-page-content` padding | `0px` | No stack reservation |
| `.site-main` margin-top | `0px` | No pull-up |
| hero `section` top | **−76px** | Hero is pulled up by the hero's own overlay rule |
| `.az-chrome-scroll-edge` display | `none` | Hidden (E4 works) |

**Production screenshot:** hero photo with **no bar on top of it** — just the dark status band, the hero, a white void, and the gold block buttons.

### 1.1 The actual root cause is not in the plan

The plan attributes the solid-color look to three CSS paints overriding the settings. The live evidence says something upstream and simpler:

> **No header is being rendered on the storefront at all.** Every "the bar ignores the setting" symptom is downstream of that. You cannot observe Glass vs Transparent vs Solid on a bar that does not exist.

`src/app/[locale]/layout.tsx` gates the bar:

```jsx
<SiteChromeGate settings={shell.theme?.headerConfig}>
  <SiteHeader … />
</SiteChromeGate>
```

**Confirmed from the live RSC payload** (`"headerConfig":{"showLogo":true,…,"enabled":false,"visibilityMode":"all","pagePaths":[]}`):

- `SiteChromeGate` → `isChromeVisible()` returns `false` because **`headerConfig.enabled === false`** (`src/lib/theme/chrome-visibility.ts:37`). The bar is **intentionally disabled in the site's theme data** — not a CSS override, not a stale bundle.
- The footer uses the same gate with a separate config and **is** rendered (1 `site-footer` in the live HTML), which confirms the gate works and only the header is disabled.
- Meanwhile the hero still pulls itself up by `--header-height` (`heroTop −76px`) — a bar-less page reserving a bar.

**That is the first thing to fix, and the plan does not mention it once.** Everything the plan proposes about Glass/Transparent/Solid/Gradient on the bar is unobservable until `headerConfig.enabled` is `true`.

Secondary, also missing from the plan: the hero applies its own `margin-top: -76px` overlay band (`.block-first-with-header-overlay`) even with **no bar to reveal** — which is why the photo starts under the status icons. My E1 fix cancels that only when `[data-az-underlay]` exists, i.e. when a bar exists. Without a bar, the hero still pulls under nothing.

---

## 2. Claim-by-claim audit

| # | Plan claim | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | "Not a stale-deploy miss." | **About half wrong** | The deploy is still mixed: `data-edge-to-edge` absent (old SSR) with new client chunk markers (`az-chrome-tint-zone`, `data-has-site-header`). It is *also* a real code/config problem (no header). Both must be fixed. |
| 2 | "Liquid Glass is on, Primary still changes the Safari toolbar." | **Confirmed** | `data-glass-effect="liquid"`, meta `#ddbc66` = preset primary wash. |
| 3 | "Safari's toolbar is always an opaque sample … its color must follow style and basis." | **Correct in mechanism, misleading in prominence** | `themeColorForStyle()` in `resolve-mobile-browser-theme.ts` returns one hex; that is by design and cannot be otherwise. But the **site bar** is the product surface; the toolbar hex is a single opaque approximation. The plan spends ~40 % of its scope on styling a surface the site does not paint. |
| 4 | "`site-glass-effect.css` sets one `background: var(--az-site-glass-bg) !important` on `.site-header`." | **Confirmed** | `site-glass-effect.css:159-160`, selector `[data-glass-effect="liquid"] .header-root .site-header`. |
| 5 | "Glass and Transparent only tweak **unprefixed** `backdrop-filter`, so iOS keeps the liquid blur." | **Half right, and the recommendation is dangerous** | Current rules at `edge-to-edge.css:255-260` are unprefixed (by my deliberate choice — Lightning *collapses* unprefixed+`-webkit-` pairs; see `docs/apple-design/edge-to-edge-implementation.md` §4.3). So on Safari the rule is invalid and the base glass rule wins: **that is a genuine bug**. But "add `-webkit-`" is **known to be stripped/merged by this build's minifier**, which is precisely why the codebase uses unprefixed-only. Fix: keep unprefixed for Chromium and add a **separate, unprefixed-free `@supports (-webkit-backdrop-filter: …)` block** for Apple — the pattern already used in `site-glass-effect.css:205-231`. |
| 6 | "Glass strength (70 %) never reaches the bar; mobile fill uses `--az-site-glass-fill-alpha` (45 %)." | **Confirmed as a design smell, not as stated** | `header-builder.css:1303-1316` does use `--az-site-glass-fill-alpha`. `--az-chrome-tint-opacity` is `1` for gradient/solid and the glass slider is separate. Router: either the Glass-strength slider *is* the site-glass opacity (and the two controls must be merged), or the bar must read the chrome style alpha. The plan should state which; it currently proposes a third token set. |
| 7 | "Hero pages zero the bar: overlay rules set `background: transparent`." | **True of the code, irrelevant to the live bug** | Rules exist at `header-builder.css:1459-1463`, `1737-1743`, `2620-2625`. But live markup has **no** `data-header-overlay` / `data-overlay-mode` attributes (grep: zero matches) because there is no header. |
| 8 | "Primary 'works' only because that toolbar hex is the preset primary. **The cyan verse is the same primary leaking onto the hero.**" | **FALSE** | The verse is `<h1 class="font-heading …">` with `background-image: linear-gradient(100deg, rgb(201,168,76) …)` and `background-clip: text`; stops resolve to `rgb(201,168,76)` = `--primary` `#c9a84c`. The chrome tint is `#ddbc66` — **a different colour**. The verse is the block's gradient-text effect, driven by preset `--primary`, and there is **no code path** from `data-chrome-tint-style` to `--primary` (grep: none). The cyan in the screenshot is not reproducible from the current code and is not explained by chrome. |
| 9 | "Surface basis not working." | **Correct symptom, wrong diagnosis** | `resolveSiteGlassTintPair()` correctly returns `#ffffff` for light. The bar would render it; there is no bar. The observable "Surface doesn't work" is really "nothing shows". |
| 10 | "Delete the mobile `height: 0` rule on `.az-chrome-tint-zone`." | **Confirmed** | `edge-to-edge.css:189-192`. This is a real defect: on a phone the status-edge band is always 0, so the OS status area is whatever the page paints (live: dark hero = dark status). |
| 11 | "iOS `default` is coerced to `black-translucent`." | **Confirmed** | `resolveIosStatusBarStyle()` returns `black-translucent` for `undefined`/`"default"` (`resolve-mobile-browser-theme.ts:61-68`). |
| 12 | "`viewport-fit=cover` only for `black-translucent`." | **Actively harmful** | Chrome-on-Android edge-to-edge **requires** `viewport-fit=cover`. Gating it on an *iOS* status-bar style removes Android edge-to-edge whenever the studio uses `default`/`black`. Keep `cover` for the edge-to-edge feature; gate only the iOS status-bar meta. |
| 13 | "Gradient = vertical fade basis→transparent (not the current 135° brand slab)." | **Product-correct, but it also breaks the OS sample** | If the *bar* becomes a fade, then `themeColorForStyle("gradient")` returning a mid hex (`#ddbc66`) becomes wrong — it must return the fade's top stop. The plan does say this; keep it. Also note the existing token `--az-browser-chrome-gradient` is consumed by `site-glass-effect.css:86-90` for `:not([data-glass-effect="liquid"])`; repurposing it to a vertical fade changes the non-liquid path too. |
| 14 | "`[data-edge-to-edge="off"] .az-chrome-tint-zone` never matches." | **Confirmed** | The attribute is on `.header-root` (a sibling of `.site-main` and *inside* `.site-shell`), never an ancestor of the fixed layers. E4 (`data-has-site-header`) partially compensates. |
| 15 | "Set `data-edge-to-edge` on `<html>` too." | **Sound** | Needed so the fixed layers and `.site-main` can key off one ancestor. Must be written by boot/engine, not only React, to avoid a first-paint mismatch. |
| 16 | "Keep primary wash off the page; the verse colour is chrome." | **Half right for the wrong reason** | Keeping chrome off the page is correct. But the verse was *already* not chrome-driven; scoping "that selector to `.site-header`" fixes a selector that does not exist. Remove this item or restate it as "no chrome style may write `--primary`" (currently true — add a regression test). |
| 17 | "Extend tests; `--prod-check` deploy gate." | **Good; scope it** | The gate should also assert **the site bar exists** (`header-root` present, non-zero height) and **`data-edge-to-edge` present**. Without those two, all other assertions pass vacuously. |
| — | **Not covered:** why `heroTop = −76` with no bar; `SiteChromeGate` disabled resolution; minifier pair-collapse; E4 already shipped. | **Gap** | See §1.1 and #5. |

---

## 3. Things the plan gets genuinely right

1. Treating the browser toolbar as opaque and moving the material to the **site bar + status edge**.
2. Grading the four styles into one resolver output (fill, alpha, blur, fade) instead of scattering overrides.
3. Making `themeColorForStyle` follow style × basis (today "Transparent" samples the surface — correct — but "Glass" samples a flat mid that does not match the bar).
4. Adding unprefixed `height: var(--az-safe-top)` to the status band and removing the `height: 0`.
5. Clearing the negative margin on `edge-to-edge: off`.
6. A deploy gate that fails the build when the live SSR lacks the new attributes.

---

## 4. Defects the plan would introduce

| Introduced defect | Why | Correction |
| --- | --- | --- |
| Gating `viewport-fit=cover` on iOS status-bar style | Breaks Chrome Android edge-to-edge | Keep `cover` unconditional while edge-to-edge is on |
| Adding `-webkit-backdrop-filter` next to unprefixed | Lightning merges the pair into webkit-only; Chromium then loses the filter (`docs/apple-design/edge-to-edge-implementation.md` §4.3) | Separate `@supports (-webkit-backdrop-filter: blur(1px))` block, webkit-only inside |
| New token set (`--az-chrome-fill`, `-alpha`, `-blur`) alongside existing `--az-site-glass-fill-alpha` / `--az-chrome-tint-opacity` | A third parallel system; the bar, the studio slider and the OS projection can disagree | Extend the **existing** tokens: `--az-site-glass-fill-alpha` becomes "bar fill alpha for the active style", `--az-chrome-tint-opacity` keeps its OS role |
| Styling `#az-safari-chrome-*` as the primary deliverable | Those 2 px/12 px anchors exist to be **sampled by Safari**, not to be read; styling them a "fade" changes what Safari samples at the bottom | Keep anchors as flat sample colours = the bar's top stop |
| Repainting "the verse selector" | No such selector; risks scoping `.site-main h1` rules and breaking preset gradient text | Drop; add the "no chrome → `--primary`" regression test instead |

---

## 5. Reality check on "settings must reflect correctly"

Even after every item in the plan ships, a phone will show:

| Setting | What the user will actually see on iPhone Safari | Controllable? |
| --- | --- | --- |
| Bar Glass / Transparent / Solid / Gradient | Yes — four visibly different site bars | Ours |
| Status edge band | Yes, once `height: var(--az-safe-top)` is restored | Ours |
| Safari **toolbar** colour | One flat opaque hex per style | Ours (colour only) |
| Safari **toolbar translucency** | Never | Browser |
| iOS `black` status style (in-tab) | Nothing visible — the status area is browser-owned chrome in a tab; it only matters for Home Screen web apps | Apple |
| Home-indicator band | Over the browser's own bottom toolbar in-tab; visible in standalone | Partial |

The user's expectation "the bottom toolbar should frost like Bayut's" cannot be met by the website; Bayut's own bottom bar is the browser's toolbar, which is opaque with a blur that iOS applies to **its own** chrome when `black-translucent` is set. That behaviour is OS-controlled and appears only in PWA/standalone mode.

---

## 6. Open questions for the user

1. ~~Where is the header configured?~~ **Resolved:** `headerConfig.enabled === false` in the live theme data (see §1.1). Remaining question: was this deliberate (a hero-only storefront), or accidental? If deliberate, then "the bar must show the settings" cannot be satisfied without re-enabling it — and the hero must stop reserving `--header-height` when the bar is off.
2. **Glass strength vs site Liquid Glass opacity** — should the studio's "Glass strength" slider drive the site bar alpha (they currently are the same token `--az-site-glass-fill-alpha`), or remain separate?
3. **The cyan verse** — can you capture a screenshot while the chrome style is `glass`/`solid` with the same preset? If it reproduces, it is a preset-text-effect bug, unrelated to chrome, and needs its own ticket.

---

## 7. Corrected implementation sequence

**Phase 0 — make the bar exist (blocking everything else)**
1. Diagnose `SiteChromeGate`: log/resolve `shell.theme.headerConfig.enabled` and `headerWorkspace` for safeermedina's deployment profile. Fix the config or the gate.
2. When no bar exists, stop the hero from pulling up: gate `.block-first-with-header-overlay` on "a bar exists" (not only on `[data-az-underlay]`). This removes the current "photo under status icons with nothing above it".

**Phase 1 — CSS truth (small, verifiable)**
3. Delete the mobile `.az-chrome-tint-zone { height: 0 }` rule; band height = `var(--az-safe-top)`.
4. Fix `edge-to-edge: off` by keying on `html[data-edge-to-edge]` (written by boot) instead of on the header root.
5. Add the Apple-only `@supports (-webkit-backdrop-filter: …)` block for Glass/Transparent. Do **not** pair prefixes.

**Phase 2 — one resolver, one contract**
6. Extend `ResolvedMobileBrowserTheme` with `barFill`, `barAlpha`, `barBlur`, `barFade`, `osSample` (one source of truth). Reuse `--az-site-glass-fill-alpha`; do not add parallel tokens.
7. `themeColorForStyle`: transparent→surface, glass→mix(surface, basis, weight), solid→basis, gradient→**fade top stop** (not the midpoint).
8. `resolveIosStatusBarStyle`: stop coercing `default`.
9. `viewport-fit`: keep `cover` while edge-to-edge is on; gate only the iOS meta.

**Phase 3 — paint ownership**
10. `edge-to-edge.css` wins over `[data-glass-effect="liquid"] .header-root .site-header` and over the overlay `background: transparent` rules (overlay keeps position only).
11. Gradient = `linear-gradient(to bottom, basis, transparent)`; solid/gradient `backdrop-filter: none`.
12. Leave `body::before` and preset `--primary` untouched; add a regression test asserting no chrome style changes `--primary`.

**Phase 4 — deploy gate and verification**
13. `--prod-check` must fail unless: `header-root` present with height > 0, `data-edge-to-edge` on html, `data-glass-effect` present, four styles produce **four distinct computed fills** on mobile, and `edge-to-edge off` clears `margin-top`.
14. Redeploy, then re-capture the iPhone screenshots for the four styles × two bases.

**Estimated split:** Phase 0 is the actual fix for what you are seeing (≈1 file + config); Phases 1–4 are the settings contract the plan describes (≈6 files).
