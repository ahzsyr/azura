# Transparency, Tint & Glass Effect Audit — v2 (verified)

**Date:** 2026-10-22
**Supersedes:** [transparency-glass-compositing-audit.md](./transparency-glass-compositing-audit.md)
**Status:** Audit complete. **No application code has been changed.** Awaiting approval before Phase 1.
**Environment:** local `azura_app` Docker container → `http://localhost:3000`, Next.js 16.3.6, Chromium **155.0.8059.85** driven by the repo's own Playwright 1.61 (`channel: "chrome"`, headless, 1440×900, DPR 1). Storefront preset `medical`, light, `data-glass-effect="liquid"`, `data-chrome-tint-style="glass"`, `--az-chrome-tint-opacity: 0.7`.
**Evidence:** screenshots in [evidence/glass-compositing-2026-10-22/](./evidence/glass-compositing-2026-10-22/); measured values quoted inline below.

> **Why a v2.** The prior audit's headline — *"opaque near-white `html`/`body` canvas is composited behind the glass"* — is true about CSS but wrong about the compositing path, and two of its "P0" fixes are not root causes. Re-running the measurements, plus scrolling with real content behind the header, plus a dark-appearance pass, changed the diagnosis. The incorrect items are listed and re-rated in §4.

---

## 1. Executive summary

| Question | Answer (verified) |
| --- | --- |
| What is supposed to be translucent? | `.site-header` — the floating **capsule** (`border-radius: 20px`, `box-shadow`, `backdrop-filter`) that carries the logo, nav and account/search actions. It is the product's Liquid Glass surface. The browser/OS toolbar is **not** CSS-controlled (see §7). |
| What is actually behind the capsule? | At scroll-top: **`--bg-primary` `#f8fafc`** (the page field) plus faint `body::before` radial washes. Once the page scrolls: **content**, but every content block is itself `--az-site-glass-bg` = **45 % `#f8fafc`**, so the capsule still samples ~45 %-white content. |
| Why does it read as white? | The fill is **not** 70–98 %. The live capsule computes to **`color(srgb 0.9725 0.9804 0.9882 / 0.45)`** — `#f8fafc` at **45 %** alpha. Because `--az-site-glass-tint == --bg-primary == #f8fafc`, and the sampled content is `#f8fafc` @ 45 % over `#f8fafc`, **fill and backdrop collapse to the same value**. Blur/refraction therefore have no gradient to reveal, and the *tint*, not the alpha, is the cause. |
| Additional real defect (new) | **Dark appearance: the glass tint stays `#f8fafc`.** Toggling to dark makes `--bg-primary` `#020408` while `--az-site-glass-tint` remains `#f8fafc`, so the header paints `#f8fafc` @ 45 % over near-black → measured **`#767a7e`** (predicted by `mix(#f8fafc 45 %, #020408)` = `#717376`, so the value is consistent with the CSS, not an artifact). On that slab, dark-theme nav text `#e2e8f0` measures **3.51:1**, the search icon `#64748b` **1.10:1**, and the head `Engineering` line (composited over the slab) is effectively invisible. This is a regression introduced by `58b40d18 "Enhance tint"` and is a **separate, higher-severity** bug than the "milky header" complaint. |
| Scope correction | The browser/OS omnibox **cannot** be made translucent from this codebase. `theme-color` is opaque by specification; Safari's edge sampling reads page pixels. §7 separates what this repo owns from what it does not. |

**Overall rating: Needs work.** The material architecture (tokens → projection → CSS) is coherent and the fallbacks for Reduce Transparency and Increase Contrast already exist; the defect is that **one value (the tint) is doing a job it cannot do** — it is simultaneously the page surface, the glass fill, and (via projection) the OS chrome colour.

---

## 2. Rendering architecture

Verified layer map for `http://localhost:3000/about` (a route that renders real content; the home route currently errors, §4 F9).

```text
Browser chrome (NOT ours)          Chromium: <meta name="theme-color" content="#f8fafc"> (opaque)
                                   Safari 26+: samples page edge pixels (~4px) into its own chrome
        ▲ projected from the same token
┌──────────────────────────────────────────────────────────────────────────────┐
│ .site-header  (floating capsule, position:relative, z-index:10, r:20px)      │
│   background: color-mix(--az-site-glass-tint 45%, transparent) = #f8fafc@45% │  ← glass FILL
│   background-image: specular radial + gradient (decorative, above fill)      │
│   backdrop-filter: blur(22px) saturate(1.65) contrast(1.08) url(#liquid-refraction) │  ← samples BELOW
├──────────────────────────────────────────────────────────────────────────────┤
│ .site-main / .site-shell   background: transparent  (verified rgba(0,0,0,0)) │
│   page blocks: text directly on field; cards/nav surfaces = --az-site-glass-bg │  ← = #f8fafc@45%
├──────────────────────────────────────────────────────────────────────────────┤
│ body::before   fixed radial primary/accent/secondary washes                   │
│ body::after    fixed specks; opacity 0.28 (0.10 in light)                     │  (no glass-overlay attr here)
├──────────────────────────────────────────────────────────────────────────────┤
│ body, html     background-color: var(--bg-primary, var(--background))          │  ← #f8fafc light / #020408 dark
└──────────────────────────────────────────────────────────────────────────────┘
```

**Token data path (verified):**
`SiteTheme` → `resolveMobileBrowserTheme`/projection → SSR `<html style="--az-browser-chrome-tint;--az-site-glass-tint;--az-chrome-tint-opacity">` → boot script (`src/lib/theme/theme-boot.ts:159-183`) writes the same vars → `ThemeEngineProvider` → `syncThemeColorMeta` (`src/features/theme/engine/appearance.ts:92-121`, `glassTint = options.glassTint || activeColor`) → `--az-site-glass-tint` (`src/lib/theme/safari-chrome-tint.ts:79`).

Key fact: **there is one value** for page background, glass tint and OS chrome tint. Nothing in the chain derives a *glass* colour that is distinct from the *page* colour.

---

## 3. Findings table

Severity: **P0** blocks the intended look or breaks an appearance · **P1** degrades it materially · **P2** expectation / documentation.

| # | Issue | Evidence | Affected file / selector | Root cause | Confidence | Severity |
| --- | --- | --- | --- | --- | --- | --- |
| **F1** | Glass fill and its backdrop are the same colour, so alpha removes nothing | Live: `--az-site-glass-tint:#f8fafc`, `--bg-primary:#f8fafc`; capsule `color(srgb .9725 .9804 .9882 / .45)`; card/nav surfaces `--az-site-glass-bg` = `color-mix(#f8fafc 45%, transparent)` | `src/styles/site-glass-effect.css:100-115`; `src/app/globals.css:309-335`; tint writers `theme-boot.ts:159`, `appearance.ts:117` | Tint = canvas; *and* content blocks are the same tint at 45 %, so a second identical white layer sits between capsule and canvas | **Confirmed** | **P0** |
| **F2** | **Dark appearance keeps the light glass tint** → light-grey header slab over near-black page | `data-theme=dark`: `--bg-primary:#020408`, `--az-site-glass-tint:#f8fafc`; measured header fill **`#767a7e`** (≈ predicted `#717376`); nav text `#e2e8f0` = **3.51:1**, search icon `#64748b` = **1.10:1** | tint projection (`theme-boot.ts:156-163`, `appearance.ts:117-121`, `theme-engine-provider.tsx:310`); consumer `site-glass-effect.css`, `header-builder.css` | Tint is never re-resolved for the dark surface; the dark branch still hands back the light colour | **Confirmed** | **P0** |
| **F3** | Content does not sit under the capsule at scroll-top, so the resting state has nothing to sample | `elementsFromPoint` at 6 points inside the capsule → `… → .site-header → .site-shell → body → html`; **zero** `.site-main` media/section nodes intersect the header rect; header rect `y:24 h:76` | Header layout (`.header-root` boxed-compact, `data-header-desktop="shrink-scroll"`, `data-overlay-mode="none"`); `.site-main` is the next block | Header is an **in-flow block**, not an overlay; hero cannot be beneath it unless the overlay path is on | **Confirmed** (this route + home) | **P0** |
| **F4** | When content *does* scroll under, the effect still reads as flat white | Screenshot `02…png` after `scrollTo(0,700)`: text is visible through the capsule but is uniform white; capsule fill identical before/after | Content-block surfaces = `--az-site-glass-bg` (45 % tint) | Content is itself white-on-white; the *material hierarchy* is inverted — the content layer is tinted the same as the functional layer | **Confirmed** | **P0** |
| **F5** | Liquid Glass applied far beyond the functional layer | `site-glass-effect.css:140-168` targets `.fxs-*`, `.az-form-surface`, `.pl-table-wrap`, `.cmp-table-wrap`, `.cb-*`, `.pp-panel`, `.az-preset-surface`, `.site-footer`… under one `!important` block | `src/styles/site-glass-effect.css:140-168` | Violates Apple's "no Liquid Glass in the content layer" (`materials.md` › Liquid Glass); guarantees white content behind a white bar | **Confirmed** in CSS scope | **P1** |
| **F6** | "Chrome tint opacity" is wired into the *site* glass fill | `safari-chrome-tint.ts:109-125` and `theme-boot.ts:175-183` write `--az-chrome-tint-mix`; `header-builder.css:35-44` consumes it as the **header** fill alpha (0.7 here) | `safari-chrome-tint.ts`, `theme-boot.ts`, `header-builder.css:35-44`, `site-glass-effect.css:36-56` | A browser-chrome setting silently drives a site surface; two systems share a variable | **Confirmed** | **P1** |
| **F7** | Specular highlight is opaque-white regardless of appearance | Computed `background-image` starts `radial-gradient(circle, color(srgb 1 1 1 / .49) 0%, transparent 42%)`; visible as a pink/white blob left of the logo in `01b-…png` (light) and as the brightest area of the slab in `03-…png` (dark) | `site-glass-effect.css` (specular layer, `--az-site-glass-specular-opacity: .28 + .42 × intensity`) | White-only specular assumes a light backdrop; in dark it is the brightest element on the page | **Confirmed** | **P1** |
| **F8** | Reduce-Transparency / Increase-Contrast fallbacks exist but produce a **light** fallback in dark mode | `site-glass-effect.css:799-806` → `background: var(--card, var(--background))`; `header-builder.css:2560-2578` → `--az-site-glass-tint` | both files | Same flaw as F2: fallback paints the light tint | **Confirmed** (CSS read) | **P1** |
| **F9** | Home route throws during SSR and renders the error boundary | SSR HTML contains `<!--$!--><template data-dgst="702991395@E218" data-msg="Image with src …/Edgewood_Home_page_Cover.jpg has both "priority" and "loading='lazy'"`; browser shows "This page could not load" | `src/components/ui/optimized-image.tsx:54-99` (spreads `props` **and** `priority={resolvedPriority}` / `loading={resolvedLoading}` into `next/image`; `props.priority` still set) + `src/features/builder/blocks/marketing/components/block-background-layer.tsx:69`; throw site `node_modules/next/dist/shared/lib/get-img-props.js:392` (E218) | Next 16 rejects `priority` **and** `loading="lazy"`; the wrapper forwards both | **Confirmed** | **P0** (blocks visual QA of the hero; unrelated to glass) |
| **F10** | UI-skills + browser-use CLI unavailable as separate toolchains | `browser-use` **not on PATH**; ui-skills not installed in `.agents/skills/`; `docker` CLI present but the skill's `npx ui-skills` path needs network install | tooling | Limitation, not a product defect | **Confirmed** | **P2** |

Re-rated prior findings (see §4): prior **F2** (tint ≈ canvas) = **F1** here; prior **F3** (mix 70–98 %) — **not confirmed**; prior **F4** → **F3** here; prior **F6** (`data-glass-overlay`) — **attribute not present** on the audited routes; prior **F9** (Lightning prefix) — **not reproducible** in Chromium 155 (see §9).

---

## 4. Root-cause analysis

### 4.1 Why the glass looks white

A CSS glass is visually `fill(tint, α) ⊕ blur(backdrop) ⊕ specular`. Live values:

| Term | Light | Dark (after toggle) |
| --- | --- | --- |
| `tint` (`--az-site-glass-tint`) | `#f8fafc` | `#f8fafc` ← **unresolved** |
| `α` (capsule fill) | `0.45` | `0.45` |
| `backdrop` at scroll-top | `#f8fafc` (+ faint radials) | `#020408` |
| **Result** | `#f8fafc` on `#f8fafc` → **invisible material** | `#767a7e` slab on `#020408` |

In light appearance, a 45 % white fill over a white field is, by definition, white. The blur is not broken (it is active: `blur(22px) saturate(1.65) contrast(1.08) url(#liquid-refraction)`); it simply has a **uniform** input. That is the difference between "transparent at the CSS level" and "translucent in the perceptual sense": translucency is a *relationship* between fill and backdrop, and here the relationship is degenerate.

The second half of the degeneracy is F4: the page blocks that would give the capsule something to sample are themselves `--az-site-glass-bg` (`#f8fafc` @ 45 %). So even after F3 is fixed (content under the bar), the sample is 45 %-white composite of near-white — which is why screenshot `02…png` is still uniform white. **Fixes must address the content-layer surface, not only the header.**

### 4.2 Why dark mode is worse (F2)

`appearance.ts:117` computes `activeColor` from `options.color` → `lightColor`/`darkColor` → `readDocumentThemeBackground()`, and then `glassTint = options.glassTint || activeColor`. On the live build the dark branch returns the **light** value: after a completed toggle, `--bg-primary` is `#020408` while `--az-site-glass-tint` is still `#f8fafc`. The dark shell confirms the token never re-resolved (it is written once by boot from the SSR projection and again by the engine using the same value). A light material on a dark page is the canonical Apple *dark-mode* error (`dark-mode.md` › "Test your content … in both appearance modes"), and it is measurably bad against the 4.5:1 minimum: dark-theme nav text `#e2e8f0` on the measured slab `#767a7e` ≈ **3.5:1**, the search icon `#64748b` ≈ **1.1:1**, and the secondary "Engineering" line disappears.

> Note on the test: the site's theme mode is `light` (not `system`), so forcing the OS to dark does **not** switch the site (verified: `data-theme=light`, meta `#f8fafc`). The dark measurements come from the site's own theme toggle path. `#theme-toggle` is `display:none` in this header layout, so the toggle was exercised via the appearance attributes; the resolved token values do not depend on which control invoked them.

### 4.3 The layering reason (F3)

The Apple requirement is not "glass must have a blur" but "glass must sit **over** something" — content scrolls and peeks beneath the functional layer (`materials.md`, `liquid-glass.md`, `layout.md` › Visual hierarchy: *"extend full-screen background content underneath sidebars, toolbars, and tab bars"*). Here the header participates in normal flow (`position: relative`, inside `.site-shell` before `.site-main`), and the overlay mechanism that *would* pull the first block beneath it (`data-block-header-overlay` / `data-header-overlay-underlay`, coordinated by `src/features/builder/components/page-header-overlay-coordinator.tsx`) is **not active**: `data-overlay-mode="none"`, and no element carries `data-header-overlay-underlay="true"`. So the resting state is glass over the field — the one backdrop where glass has nothing to show.

### 4.4 Not the cause (checked and excluded)

- **`backdrop-filter` support**: active and unprefixed in Chromium 155; `-webkit-backdrop-filter` empty is expected in Chromium.
- **`data-glass-overlay`**: absent on `/`, `/about` (checked on `<html>`); `body::before` computed background is `rgba(0,0,0,0)` with radial `background-image` layers; its `opacity` is the default 1. The 0.88 wash in `site-backgrounds.css:30-35` only applies when that attribute is on.
- **Assets**: logo is SVG (`/uploads/svg/…Edgewood_Tahoe_Logo.svg`) with a tint span; no opaque white export found under the header. Several content images 404 locally (`console: Failed to load resource … 404`), which affects content QA, not the glass colour.
- **Stacking / z-index**: `.site-header` `z-index:10`; `elementsFromPoint` order is correct; no element paints above the capsule at rest.
- **Isolation / transforms on the header**: `isolation:auto`, `overflow:visible` (desktop ≥969px) — mega menus would be clipped only on narrow widths by the documented `overflow-x: clip`; unrelated to tint.

---

## 5. Apple HIG read (goldens cited)

| Guideline | Quote | Implication here |
| --- | --- | --- |
| `materials.md` › Liquid Glass | *"Liquid Glass forms a distinct functional layer … that floats above the content layer … allows content to scroll and peek through from beneath these elements."* | The capsule is correct as a functional layer; the **content** must be beneath it (F3) and must be **content**, not another translucent surface (F4/F5). |
| `materials.md` › Liquid Glass | *"Use Liquid Glass effects sparingly … Limit these effects to the most important functional elements."* / *"Don't use Liquid Glass in the content layer."* | The `!important` block styling tables, forms, FXS panels, cards and footer (F5) is out of scope of the material's purpose. |
| `materials.md` › Liquid Glass (variants) | Regular = blur + luminosity adjust, for text-heavy surfaces; **clear** only over *visually rich* backgrounds; *"If the underlying content is bright, consider adding a dark dimming layer of 35% opacity."* | A header over a near-white page is the **bright flat** case: the correct answer is a **thicker/regular** material, not thinner glass. Lowering α (prior P0 #2) makes it *less* legible and no less white. |
| `color.md` › Liquid Glass color | *"Liquid Glass has no inherent color … takes on colors from the content directly behind it."* | The tint must **not** be the page colour (F1). Give the material either no colour (content-driven) or a role colour distinct from `--background`. |
| `dark-mode.md` | *"Test your content to make sure that it remains comfortably legible in both appearance modes."*; minimum 4.5:1, aim 7:1 for text | F2 fails both appearances' legibility contract. |
| `accessibility.md` | Increase Contrast must yield higher-contrast variants; target sizes unchanged | Existing `prefers-reduced-transparency` / `prefers-contrast: more` rules are the right mechanism; they are fed the wrong colour (F8). |
| `liquid-glass.md` › Review checklist #5/#6 | Opaque fallback for Reduce Transparency; **scroll edge effect**, not a solid/semi-opaque band under the bar | The capsule should gain a *scroll edge* treatment (fade/blur where content meets it) rather than a heavier fill. |

**Judgment (not a citation):** because this is a web storefront with text-heavy navigation over a bright flat field, the correct mapping is a **regular** material — thicker fill, low tint chroma, a hairline border, and a scroll-edge fade — not the "clear glass over photography" look. The "liquid" refraction SVG (`url(#liquid-refraction)`) is decorative and should be treated as a P2 polish item until the fill/backdrop relationship is sound.

---

## 6. Prioritized remediation plan

Priority order is **F9 → F2 → F1/F4 → F3 → F5/F6 → F7/F8 → P2**. Rationale: QA needs a working hero page (F9); dark mode is a visible defect across every route (F2); the tint/backdrop identity (F1/F4) is the actual cause of "white" in light mode; content-under-chrome (F3) is what makes the material *mean* something; then scope and wiring hygiene.

### Phase 0 — Reproduction and baseline (done)

| ID | Action | Result |
| --- | --- | --- |
| 0.1 | Identify a route with real content for QA | `/about` renders fully (`docHeight 3605`); `/` errors — see F9 |
| 0.2 | Baseline CDP/computed-style dump | §3 values: tint, `--bg-primary`, capsule bg, `backdrop-filter`, `elementsFromPoint` stacks |
| 0.3 | Screenshots: top, scrolled-under-content, dark | [evidence/](./evidence/glass-compositing-2026-10-22/) |
| 0.4 | Lock intended behaviour | Header = **regular** material floating over content that passes beneath it; OS chrome = opaque `theme-color` (do not chase omnibox translucency) |
| 0.5 | Confirm environment limits | Chromium 155 desktop only; **no** Safari/iOS device pass (§10 Q4) |

### Phase 1 — Root-cause fixes (smallest change per finding)

| ID | Fix | Files | Why it resolves it | Priority | Risk | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1 | **Fix the `priority` + `loading` conflict**: in `OptimizedImage`, strip `priority` from the spread (`const { priority, ...rest } = props`) and pass only `resolvedPriority`; keep `block-background-layer.tsx` passing `loading={priority ? undefined : "lazy"}` | `src/components/ui/optimized-image.tsx`, `src/features/builder/blocks/marketing/components/block-background-layer.tsx` | Removes Next E218 during SSR; home renders again, giving a real hero to audit | P0 | Low (behavior unchanged when only one prop is set) | `curl -s localhost:3000/ \| grep -c 'This page could not load'` → `0`; home hero visible; add a unit test that the wrapper never forwards both |
| 1.2 | **Resolve the glass tint against the active appearance**: make `glassTint` a *function of the resolved appearance* (dark → dark surface/role colour, e.g. `DEFAULT_DARK_SURFACES`-derived or `--card`-family, never the light value). Apply in the same single-writer path (`appearance.ts` / projection), and mirror in `theme-boot.ts` (SSR branch already picks dark for `data-ssr-theme`, but must also pick the **dark glass value**). | `src/features/theme/engine/appearance.ts`, `src/components/theme/theme-engine-provider.tsx`, `src/lib/theme/theme-boot.ts`, `src/lib/theme/safari-chrome-tint.ts` | Removes the light slab in dark; restores text/mark contrast ≥4.5:1 | P0 | Medium (touches the chrome-writer contract — see `docs/browser-chrome-theme-sync.md`) | Toggle dark on `/about`: `--az-site-glass-tint` ≠ `#f8fafc`; sample header pixel → dark (L\* < 40); nav text contrast ≥4.5:1; meta `theme-color` matches projection |
| 1.3 | **Give the material its own colour role, distinct from the page**: introduce an explicit glass-tint token resolved from a *surface* role (e.g. light `#ffffff`/`--card` at low alpha, dark `#0a0f18`/`--card` at low alpha) instead of re-using `--bg-primary`. Do **not** change `--background` or `--bg-primary` themselves. | `src/styles/site-glass-effect.css` (token derivation), tint source in `appearance.ts` | Breaks the `tint == canvas` identity (F1) without changing the page colour | P0 | Medium (preset theming) | Capsule fill ≠ `#f8fafc`@45%; visual: capsule distinguishable from field at scroll-top; `npm run test:blocks` + theme tests green |
| 1.4 | **Make page content blocks opaque or content-coloured, not glass-tinted**: audit the `!important` list that assigns `--az-site-glass-bg` to `.az-form-surface`, `.pl-table-wrap`, `.cmp-table-wrap`, `.cb-table-block`, `.cb-comparison--table`, `.az-ab`, `.az-preset-surface`, `.fxs-*` and **remove content-layer selectors** (keep menus/panels/popovers/toolbar). | `src/styles/site-glass-effect.css:140-168` | Stops a 45 %-white layer sitting between capsule and canvas; content becomes the subject of the glass | P0 | Medium (studio "glass everywhere" expectation — see §9) | Scrolled header crop shows text/imagery with real tonal variation, not uniform white; regression screenshots for cards/tables/forms |
| 1.5 | **Enable the content-under-header path for first-block hero routes** (`data-header-overlay-*` coordinator), or if product does not want overlay, accept that the resting state is "glass over field" and make the *resting* material the **regular/opaque-ish** variant with a scroll-edge transition | `page-header-overlay-coordinator.tsx` consumers, `header-builder.css` overlay rules, page/block config | Glass gains a subject where the design supports it (`layout.md` › Visual hierarchy) | P0 | Medium–High (layout shift) | `elementsFromPoint` under capsule includes a hero/media node; screenshot at scroll-top and after 10px scroll |
| 1.6 | **Decouple "chrome tint opacity" from the site glass fill**: stop writing `--az-chrome-tint-mix` from the chrome-tint setting; give the header a dedicated `--az-site-glass-fill-alpha` (light/dark values), leaving `--az-chrome-tint-*` to the OS-chrome projection only. | `src/lib/theme/safari-chrome-tint.ts:109-125`, `src/lib/theme/theme-boot.ts:175-183`, `src/styles/site-glass-effect.css:36-56`, `src/features/navigation/components/header/header-builder.css:35-44` | Removes a hidden coupling; a browser setting no longer restyles the site | P1 | Medium (Theme Studio labels/expectations) | Theme Studio opacity change moves the **meta** only; header fill stays constant |
| 1.7 | **Dark-aware fallbacks**: in the two `prefers-reduced-transparency` blocks and the `prefers-contrast: more` block, replace the light tint with the appearance-appropriate surface token | `site-glass-effect.css:799-806, 1019-1030`, `header-builder.css:2560-2578` | Fallback must not create the F2 defect when transparency is off | P1 | Low | Emulate `prefers-reduced-transparency: reduce` in dark → opaque **dark** header; borders visible |

### Phase 2 — Material implementation (after Phase 1)

| ID | Change | Notes / Apple basis |
| --- | --- | --- |
| 2.1 | Choose **regular** variant semantics: fill alpha ≈ 60–80 % of a *role* colour, blur 20–40 px, hairline `1px` border, subtle shadow (`liquid-glass.md` › cross-platform translation: regular 20–40 px blur, 60–80 % fill) | Apple publishes only the 35 % dimming figure; the rest is a practical range, not a spec |
| 2.2 | Add a **scroll edge effect** (fade/blur band where content meets the capsule) instead of increasing the fill on scroll (`liquid-glass.md` › checklist #6) | Replaces the current "sticky → 0.78 mix" bump |
| 2.3 | Keep the refraction SVG as an optional, default-off intensity layer; make specular appearance-aware (`color(srgb 1 1 1 / a)` → theme-aware, lower a in dark) | F7 |
| 2.4 | If a hero ever sits under a *clear* (refractive, low-alpha) glass on bright media, add the **35 % dark dimming layer** behind it (`materials.md` › Liquid Glass) | Only for genuinely rich/dark backdrops |
| 2.5 | Document that OS chrome translucency is out of scope; `theme-color` is opaque (already stated in `immersive-chrome-audit.md` § Phase 6 STOP) | F8 of prior audit → P2 |

### Phase 3 — Theme and accessibility

| ID | Check / change |
| --- | --- |
| 3.1 | Light **and** dark appear; no light material on dark page; no dark material on light page |
| 3.2 | `prefers-reduced-transparency: reduce` → opaque, appearance-appropriate; no double borders |
| 3.3 | `prefers-contrast: more` → opaque + visible border (already coded; verify against dark) |
| 3.4 | Contrast: nav text and logo mark ≥4.5:1 against the *composited* header (measure, don't estimate), in both appearances and both reduced settings || 3.5 | Forced colors (`forced-color-adjust`) still yields system colours |

### Phase 4 — Regression and visual verification

| ID | Check | Pass criterion |
| --- | --- | --- |
| 4.1 | Re-run the baseline script (top / scrolled / dark) on `/about` **and** `/` (after 1.1) | Capsule visibly distinct from field at rest; content tones visible through it when scrolled |
| 4.2 | Mega menu, dropdown, mobile drawer (`mnav-panel`), search panel, footer | No glass-on-glass mush; no clipped mega menu (desktop ≥969 px) |
| 4.3 | `data-chrome-tint-style` = `solid` / `transparent` / `gradient` | Each still matches Theme Studio intent; `solid` remains opaque |
| 4.4 | `meta[theme-color]` vs projection | Equal in both appearances |
| 4.5 | Test suites touched by the change | `npm run test:blocks`, `npm run test:i18n`, theme unit tests (`sync-theme-color-meta`, `browser-chrome-projection`, `theme-init-boot-order`, `liquid-glass-upgrade`), `npm run typecheck`, `npm run lint` |
| 4.6 | Safari iOS edge anchors | Device worksheet (`docs/browser-chrome-phase16-worksheet.md`) — **not run here** |

---

## 7. Platform limitations — CSS vs browser vs native

| Mechanism | Who controls it | Reality in this project |
| --- | --- | --- |
| Fill alpha, `backdrop-filter`, `color-mix`, stacking **inside the page** | The project (CSS) | Fully ours; this is where every F1–F8 finding lives |
| Content passing under the site header | The project (DOM/layout) | Ours; overlay coordinator exists but is off for these routes (F3) |
| Browser toolbar / omnibox translucency | Browser | **Not available.** `theme-color` is opaque; no public API samples page content into Chrome's toolbar |
| Safari 26+ Liquid Glass browser chrome | Browser (samples page edge pixels) | Not ours to style; can only be influenced by the *colour* placed at the page edge |
| Native macOS vibrancy / window translucency | Native (Electron/Tauri/AppKit) | N/A — this is a Next.js web app in a browser tab. Apple's window materials cannot be reached from CSS (`cross-platform.md`: *"Prefer the platform's real materials and window chrome over a web imitation"* — and note the app **cannot** use them here) |
| Desktop wallpaper / other windows showing through | OS / window compositor | Impossible for a normal browser tab; no configuration change should be attempted |

---

## 8. File-level change inventory

| File | Purpose of change | Phase |
| --- | --- | --- |
| `src/components/ui/optimized-image.tsx` | Stop forwarding `priority` alongside `loading` (F9) | 1.1 |
| `src/features/builder/blocks/marketing/components/block-background-layer.tsx` | Keep the existing guard; adjust only if the wrapper fix changes the contract | 1.1 |
| `src/features/theme/engine/appearance.ts` | Resolve `glassTint` per appearance; stop defaulting to the page colour (F2/F1) | 1.2/1.3 |
| `src/components/theme/theme-engine-provider.tsx` | Feed the appearance-aware tint (single-writer discipline preserved) | 1.2 |
| `src/lib/theme/theme-boot.ts` | Boot-time SSR tint must mirror the same appearance-aware value | 1.2 |
| `src/lib/theme/safari-chrome-tint.ts` | Decouple site glass fill from `--az-chrome-tint-mix` (F6) | 1.6 |
| `src/styles/site-glass-effect.css` | Token derivation for glass fill; remove content-layer selectors; appearance-aware specular (F1/F4/F5/F7) | 1.3/1.4/2.x |
| `src/features/navigation/components/header/header-builder.css` | Consume the dedicated fill alpha; overlay/sticky/scroll-edge behaviour; dark-aware reduced-transparency (F6/F8); **logo mask tint** (`.brand-logo-tint` uses `background-color: var(--primary)` with no dark variant — the mark is fixed at one lightness, so it must be checked against the dark fill) | 1.5/1.6/1.7/2.2 |
| `src/styles/site-backgrounds.css` | Only if the glass overlay wash is re-enabled — not implicated on audited routes | 2.x (conditional) |
| `src/features/theme/__tests__/*`, `src/lib/theme/__tests__/*` | Extend with dark-tint and fill-alpha assertions | 1.x |
| `docs/browser-chrome-theme-sync.md` | Cross-link this audit; document the split between OS chrome tint and site glass fill | 1.6 |
| `docs/transparency-glass-compositing-audit.md` | Kept as historical v1; header should point to this v2 | 0 |

**Not to be touched** for this issue: `--background` / `--bg-primary` tokens, `globals.css` `html`/`body` backgrounds, preset surface palettes, window/browser configuration.

---

## 9. Risks, dependencies and rejected items

| Item | Assessment |
| --- | --- |
| Prior audit's **"lower the glass fill mix (70–98 %)"** | **Rejected as a root cause.** Live fill is 0.45; the 0.7/0.78/1.0 values are the **non-liquid** chrome-mix defaults (`site-glass-effect.css:17-56`) and only reach the header through the F6 coupling. Lowering alpha over a white field cannot produce a material. |
| Prior audit's **"opaque document background is the real backdrop"** | **Half true.** The field is opaque, but the compositing fault is *identity* (tint = field) and *layering* (no content beneath), not the presence of an opaque body. Making `body` transparent would expose nothing (verified: `.site-shell` and `.site-main` are also transparent — there is no layer underneath). |
| Prior audit's **Lightning dual-prefix collapse (F9)** | **Not reproducible** in Chromium 155; computed `backdrop-filter` is present and active. Keep watching, do not "fix". |
| Prior audit's **`data-glass-overlay` opacity 0.88 (F6)** | **Not active** on `/` and `/about` (`<html>` has no such attribute). Re-check only on routes that set it. |
| Lowering fill alpha to chase translucency | **Rejected**: over bright flat content, thinner glass lowers contrast (`materials.md`: thicker materials give better contrast). The right lever is tint/backdrop, then a *regular* material. |
| Changing the shared tint writer | Touches the chrome projection contract documented in `docs/browser-chrome-theme-sync.md` and covered by `sync-theme-color-meta` / `browser-chrome-projection` tests; treat as medium risk and update tests first. |
| Removing content-layer glass selectors | May surface presets/cards that looked "designed" only because of the glass wash — needs before/after screenshots per preset. |
| Browser support | `color-mix` needs Chromium 111+/Safari 16.2+/Firefox 113+; `backdrop-filter` needs Safari `-webkit-` (already emitted). No exotic APIs proposed. |
| Confounder | Several content images 404 locally, so screenshots understate content richness. Re-check with seeded media if image QA matters. |

---

## 10. Open questions (only what the repo/test cannot answer)

1. **Product intent for the resting state.** Should the header float over a hero on first-block routes (overlay on), or should it rest on the page field (overlay off)? The code supports both; the material design differs for each (`layout.md` › Visual hierarchy only applies in the first case).
2. **Is the current dark-mode light tint a shipped defect or a local data artifact?** It is reproducible on this build via the appearance path; confirm whether production preset data yields the same `--az-site-glass-tint`.
3. **Is "glass on cards, tables, forms, footer" a deliberate brand choice?** If yes, it conflicts with `materials.md` and should at least be renamed in Theme Studio ("surface tint" rather than "Liquid Glass").
4. **Safari/iOS evidence.** Prior CLOSE-OUT #12 remains unrun; any device screenshot comparing the milky site header against the browser's own chrome would settle whether the user-reported "browser tint/transparency over solid white" refers to the **site header** (F1–F4) or to the **browser toolbar** (out of scope, §7).

---

## 11. Tooling and skills actually used

| Skill / tool | Used? | Evidence of use |
| --- | --- | --- |
| `apple-design` | **Yes** — read `SKILL.md`, loaded `materials.md`, `liquid-glass.md`, `color.md`, `dark-mode.md`, `accessibility.md`, `layout.md`, `cross-platform.md` (7 refs, within the 8–12 guidance combined with the lens tables) | Quotes in §5 carry file + heading |
| `browser-use` skill | **Read, not executed** — no `browser-use` binary on PATH; no remote auth present | Live browser work was done with the repo's own **Playwright 1.61 + installed Google Chrome 155**, not the skill's CLI. No CDP session claim is made. |
| `ui-skills` | **Not available** — not installed in `.agents/skills/`, no local copy located; the skill's install path was not executed to avoid unapproved installs | No claim of use |
| Repository evidence | `grep`/source reads of the files cited in §3/§8; SSR HTML captured from the running container | File:line references throughout |

---

## 12. Approval gate

**No application code has been modified.** This document is the audit and plan only. Recommended execution order once approved: **1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7**, each with the verification in §6, then Phases 2–4. If you want the fastest visible improvement: **1.2 (dark) + 1.3 + 1.4** alone will already turn the capsule from "white slab on white" into a distinct material in both appearances.
