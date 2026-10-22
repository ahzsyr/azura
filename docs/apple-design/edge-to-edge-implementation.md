# Edge-to-edge browser chrome — implementation notes

**Date:** 2026-10-22
**Status:** Implemented and verified on localhost (Chromium 155, desktop 1440×900 + mobile 393×760). No header design change.
**Evidence:** [evidence/edge-to-edge-2026-10-22/](./evidence/edge-to-edge-2026-10-22/)
**Builds on:** [transparency-glass-compositing-audit-v2.md](./transparency-glass-compositing-audit-v2.md)

---

## 1. What changed, in product terms

The page now behaves the way it does in a native browser (the Bayut reference the report used): **content scrolls under the site bar, the bar stretches into the device safe area, and the four chrome styles actually mean four different things.**

| Style | Site bar fill | Backdrop | Device edge (status bar / home indicator) |
| --- | --- | --- | --- |
| **Glass** | `--az-site-glass-tint` @ the Glass-strength slider (default 45 %) | Full blur + saturate + refraction | Same tint, opaque |
| **Transparent** | Same tint, lower alpha (fill alpha) | Light blur — page shows through almost unchanged | Same tint, opaque |
| **Solid** | Opaque surface colour (appearance-aware) | None | Same colour, opaque |
| **Gradient** | Preset primary → secondary gradient | None | Gradient |

**The header's design is untouched:** same capsule, 20 px radius, same floating gap, same border/shadow/specular, same positions (verified desktop `1152×76 @ (144,24)`, mobile `345×64 @ (24,24)`).

---

## 2. What "under the bar" means here

- **Desktop:** the header root already paints a transparent band around the capsule (its float inset, top and bottom). `.site-main` is pulled up by exactly that band (measured **24 px**) so content passes beneath the capsule without moving it. Header stays at y=24; page content top moves 100 → **76**.
- **Mobile:** the bar is in normal flow. `.site-main` is pulled up by the measured bar height (88 px, or bar + safe area when padded), and the page-stack root gets the same amount back as `padding-top`, so **total layout height is unchanged** — only paint order changes.
- **Scroll edge:** a fixed fade layer (z 40, under the bar at z 100) fades content out as it reaches the bar, instead of letting it collide with the bar edge. It is off at scroll 0 and on after 8 px.
- **Opt-out:** Theme Studio → Mobile Browser → **Edge-to-edge page**. Live-verified: on → `margin-top:-24px`, off → `0px`, back on → `-24px`.

---

## 3. Files

| File | Purpose |
| --- | --- |
| `src/styles/edge-to-edge.css` **(new)** | Underlay rules, scroll-edge fade, OS-edge tint band, per-style bar fill contract, a11y fallbacks |
| `src/components/layout/chrome-edge-layers.tsx` **(new)** | Measures and publishes `--az-chrome-band`; marks `[data-az-underlay]`; renders the tint band + fade; reveals the fade on scroll |
| `src/app/[locale]/layout.tsx` | Mounts `<ChromeEdgeLayers />` (Suspense); passes `edgeToEdge` from `mobileBrowserConfig` |
| `src/components/layout/site-header.tsx` | Forwards `edgeToEdge` prop |
| `src/features/navigation/components/header/HeaderRenderer.tsx` | Passes it into the root builder |
| `src/features/navigation/header-root-attributes.ts` | `data-edge-to-edge="on\|edge\|off"` (never on preview surfaces) |
| `src/features/navigation/components/header/header-builder.css` | Bar padded **into** the safe area instead of being pushed down |
| `src/schemas/theme.ts`, `src/features/theme/theme-config.ts` | `mobileBrowserConfig.edgeToEdge` (default `true`, absent in old themes → on) |
| `src/features/theme/components/theme-studio/sections/theme-studio-sections.tsx` | Edge-to-edge toggle; preview now shows the device edge band + honest per-style fill; copy states that browser toolbars are opaque |
| `src/styles/safari-chrome-tint.css` | Ambient wash no longer covers the bottom edge; page paint clipped at the bottom anchor so Safari samples the tint |
| `src/app/globals.css` | Imports the new stylesheet |

---

## 4. Gotchas found while implementing (worth keeping)

1. **Chromium 155 does not match `:has()` containing a descendant combinator** (`html:has(X Y)` is always false). This silently disabled the first version of the underlay rules. All selectors are now descendant/sibling based. `:has()` with a single compound selector works — the existing `globals.css` usage is fine.
2. **`site-glass-effect.css` applies one fill (`--az-site-glass-bg`, 45 %) to the header for every tint style** when `data-glass-effect="liquid"`. That is why Solid/Gradient previously did nothing to the bar. The new stylesheet restores the four-style contract with higher specificity.
3. **Lightning collapses `backdrop-filter` + `-webkit-backdrop-filter` pairs** into the webkit property alone, which Chromium ignores. `edge-to-edge.css` declares **unprefixed only**.
4. **Specificity/source-order:** a `[data-edge-to-edge="off"]` reset using the same specificity as the `="on"` rule overrode it. Off-state rules are now scoped to the header root's sibling.
5. **Dev server CSS cache:** new `@import`s did not compile until `.next/dev` was cleared inside the container (`docker exec azura_app rm -rf .next/dev` + restart). File timestamps inside the container can drift from the host, so use the container clock for `touch`-based HMR.

---

## 5. Verification performed

| Check | Result |
| --- | --- |
| TypeScript (`tsc --noEmit`) on all touched files | 0 errors (repo has 38 pre-existing errors elsewhere) |
| ESLint on touched files | 0 errors (1 pre-existing warning in `schemas/theme.ts`) |
| Theme/header unit tests (8 files) | **52/52 pass** |
| `theme-init-boot-order` "splits glass tint from browser chrome tint" | **Fails identically with my changes stashed** → pre-existing, not caused by this work |
| Underlay, desktop | `margin-top: -24px`, header y unchanged |
| Underlay, mobile | `margin-top: -88px`, stack `padding-top: 88px` (height preserved) |
| Safe area (44 px simulated on mobile) | bar padding-top 44 px, band 132 px, content clears it |
| Four styles | each renders differently (screenshots 01–04) |
| Runtime opt-out | on → off → on verified |
| Real dark toggle (`#theme-toggle`) | tint `#ffffff → #0a0f18`, header fill dark, chrome `#020408` |
| Reduced transparency / contrast | **Not verifiable under CDP emulation** — see §6 |

---

## 6. Known limitations and what still needs a device

1. **Browser toolbars cannot be made translucent.** The address bar, tab strip and bottom toolbar are drawn by the browser; `theme-color` is opaque by spec. What this change delivers is the site bar + OS edge sharing one tint and the page showing through the site bar.
2. **Reduce Transparency / Increase Contrast need a real device or OS setting.** Chromium's `Emulation.setEmulatedMedia` reports `matchMedia` as true but does not apply stylesheet rules for `prefers-reduced-transparency` or `prefers-contrast` (verified with a control rule that should have applied and did not). The CSS is authored per spec and mirrors the existing handling in `site-glass-effect.css`.
3. **Safari 26 edge sampling** is unchanged in mechanism (2 px top anchor + bottom anchor). The bottom sample now sits on the tint instead of the footer.
4. **Chrome on Android edge-to-edge** depends on Chrome 135+ and `viewport-fit=cover`, which the project already emits (`buildChromeViewport`).
5. **Local media is not seeded** (`/uploads/...` 404s), so the mobile logo and hero images are blank in local screenshots. That is environment data, not a rendering defect.
6. **iOS home-indicator band covers the first ~34 px** of the page at the bottom on iPhone — inside a browser (not standalone PWA) the browser's own toolbar occupies that area, which is expected and matches native behaviour.

---

## 7. Not done (deliberately)

- No rewrite of `site-glass-effect.css` or of the tint projection. The prior audit's Phase 1–3 items (tint/backdrop identity, content-layer glass scope, etc.) remain separate follow-ups.
- No change to the header workspace schema (the edge-to-edge flag lives in `mobileBrowserConfig`, where the other chrome settings already are).
