# Edge-to-edge on device: what was broken and the fix script

**Date:** 2026-10-22
**Status:** Fixed and verified on localhost (Chromium 155, desktop + mobile + simulated 47px iOS safe area, with real production media stubbed).
**Reporter evidence:** safeermedina.com on iPhone with Theme Studio settings `Glass 70%` · `Color basis: Primary` · `Edge-to-edge page: on` → the site bar was missing entirely and the hero ran under the status bar.

---

## 1. What the device showed

| Source | Observation |
| --- | --- |
| Device screenshot (safeermedina) | Status bar (dark) on top of a thin hero image strip, then a blank cream band where the site bar should be, then the hero. No logo, no search, no menu button. |
| `curl https://safeermedina.com/` | HTML has `data-glass-effect="off"` (glass effect disabled) and **no** `data-edge-to-edge` attribute on `html` → the deployed build predates the edge-to-edge work. |
| Live render (mobile viewport) | No `.header-root` element at all; `.marketing-page-content` still carried `padding-top: 76px` (legacy reserve), `margin-top: 0`. |
| Theme Studio screenshot | `Sync with active theme` ✓, `Glass`, `Glass strength 70%`, `Color basis: Primary`, `Edge-to-edge page` ✓, iOS status bar `Black Translucent`. |

So there were two separate problems:

1. **The reported site was not running the edge-to-edge code**, yet it *did* render the new `.az-chrome-tint-zone` element (it comes from a client chunk). Result: a half-updated UI with no bar at all.
2. **The edge-to-edge code itself had real bugs on the home route**, which the first local audit missed because `/about` has no hero.

---

## 2. Bugs in the edge-to-edge implementation (fixed)

| ID | Defect | Evidence before fix | Cause | Fix |
| --- | --- | --- | --- | --- |
| **E1** | Hero double-reserved the bar height | Hero `margin-top: -88px` on top of a stack that already reserved 76–170px: the hero started at **-88px** and its heading slid under the bar | The page stack reserved the bar height **and** `.block-first-with-header-overlay` added its own band | `[data-az-underlay="true"] .block-first-with-header-overlay { margin-top: 0; padding-top: 0; min-height: 0 }` |
| **E2** | Logo clipped away on mobile | Logo box existed (213×38) but nothing painted; `overflow-x: clip` on `.site-header` | `overflow-x: clip` clipped the mask-tinted logo glyph | `overflow: visible` (menus live in portals; the bar never overflows) |
| **E3** | "Color basis: Primary" silent | `surface` and `primary` both computed `rgb(255,255,255 / .45)` | The rule was keyed on `html[data-chrome-tint-source]`, but the attribute lives on `.header-root`; and a `background-image` layering lost the cascade | Rule scoped to `.header-root[data-chrome-tint-source="primary"]`, `background-color: color-mix(primary 22%, tint×alpha)` → now `color(srgb .882 .772 .618 / .571)` |
| **E4** | Haze band on hero-only pages | Fixed fade layer painted at z 40 even with no header | The fade rendered unconditionally | `html[data-has-site-header="false"]` hides both chrome layers; the component publishes the flag |
| **E5** | Desktop band measured on the wrong axis | `--az-chrome-band: 0px` on desktop | The floating bar pads **inline**, not on top, so `padding-top` was 0 | Band = measured `padding-inline-start` (token fallback) → 12px |

Also fixed while threading E3: `chromeTintSource` is now carried through `ResolvedMobileBrowserTheme` → `BrowserProjection` → `data-chrome-tint-source`, and `edgeToEdge: true` was added to the two theme token defaults (the schema default made the field required).

---

## 3. The fix script

`scripts/ds/fix-edge-to-edge.mjs` — plain Node ESM, **no dependencies**, idempotent, dry-run by default:

```bash
node scripts/ds/fix-edge-to-edge.mjs --check    # report what would change
node scripts/ds/fix-edge-to-edge.mjs            # apply the CSS patches
node scripts/ds/fix-edge-to-edge.mjs --verify   # apply + browser-verify
```

What it does:

- **Patches** E1–E4 in `src/app/globals.css`, `header-builder.css`, `edge-to-edge.css`, each guarded by a marker so a second run is a no-op. Every anchor is verified against the file before writing; a missing anchor fails loudly instead of silently skipping.
- **Verifies** in a real browser at both breakpoints:
  - V1 hero not double-pulled (`top >= -2`)
  - V2 bar content not clipped (`overflow: visible`)
  - V3 tint source emitted
  - V4 content actually under the bar (negative `margin-top`)

Latest run:

```text
✔ [desktop] V1 hero not double-pulled      (heroTop=0)
✔ [desktop] V2 bar content not clipped     (overflow=visible)
✔ [desktop] V3 tint source emitted         (=surface)
✔ [desktop] V4 content under the bar       (margin-top=-12px)
✔ [mobile]  V1..V4                         (heroTop=0, margin-top=-76px)
verify: 8 passed, 0 failed
```

The TypeScript half (attribute plumbing, token defaults, header presence flag) is **not** done by the script — it is committed source, because AST-level edits in a script are more fragile than the CSS patches.

---

## 4. Verified result with production media

Home route, 393×852, 47px simulated iOS safe area, real hero + logo served from production:

- Bar stretches into the status-bar area, hero photo visibly frosted through the glass bar (matches the Bayut reference).
- Scrolling: hero content passes **under** the bar with the fade; no collision, no jump.
- Mobile bar height 99–111px with safe area; desktop content tuck −12px; hero top 0 at both.

---

## 5. Regression status

| Check | Result |
| --- | --- |
| Theme/header unit tests (12 files) | **129/130 pass** |
| `theme-init-boot-order` › "splits glass tint…" | Fails identically with these changes stashed → **pre-existing** |
| `use-theme-studio.ts` lint (`react-hooks/set-state-in-effect`) | Fails identically before my one-line edit → **pre-existing** |
| TypeScript on all touched files | 0 errors |
| Four styles distinct on both breakpoints | Yes |

---

## 6. Deployment note for safeermedina

The public site is serving a **build without the edge-to-edge source** (no `data-edge-to-edge` on `<html>`), while a newer client chunk injects the chrome-layer elements. Rebuild and redeploy after pulling this branch; the attribute must appear on `<html>`/`.header-root` in the SSR HTML:

```html
<html … data-glass-effect="off" data-chrome-tint-style="glass">
  …
  <div class="header-root …" data-edge-to-edge="on" data-chrome-tint-source="primary">
```

If `data-edge-to-edge` is missing in production SSR, the deploy is stale — nothing in CSS can compensate.

Also note the reported settings had **Glass effect off** at the site level (`data-glass-effect="off"`): with the effect off, the bar renders as the plain surface fill. You asked for translucency, so the glass/Liquid Glass effect must be enabled for the translucent styles to show content through the bar.

---

## 7. Remaining device-only checks

1. Real iPhone Safari: `apple-mobile-web-app-status-bar-style: black-translucent` + `viewport-fit=cover` → the bar must reach under the status bar.
2. Real iOS Reduce Transparency / macOS Increase Contrast (CDP emulation does not apply these stylesheet rules — documented in the implementation notes).
3. React Native/embedded WebViews are out of scope.
