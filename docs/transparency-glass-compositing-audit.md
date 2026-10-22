# Transparency, Tint & Glass Effect Audit — Apple Design Standards

> **SUPERSEDED — 2026-10-22.** This v1 report was re-verified against the live build. Its central
> claim (the opaque `html`/`body` canvas is the compositing cause) and its P0 fix "lower the
> 70–98 % glass fill mix" did **not** hold up: the live glass fill is 45 %, and the real causes are
> tint ≈ canvas, no content beneath the header, content blocks being white-tinted, and a light glass
> tint persisting in **dark** appearance. Read
> **[apple-design/transparency-glass-compositing-audit-v2.md](./apple-design/transparency-glass-compositing-audit-v2.md)**
> instead. This file is kept for history.

**Date:** 2026-10-22  
**Status:** Superseded by v2 — remediation **not** implemented (awaiting approval)  
**Environment audited:** Local Docker app at `http://localhost:3000/` (Edgewood Tahoe storefront), Chromium via Cursor IDE browser  
**Related docs:** [browser-chrome-theme-sync.md](./browser-chrome-theme-sync.md), [immersive-chrome-audit.md](./immersive-chrome-audit.md), [immersive-rendering-audit.md](./immersive-rendering-audit.md), [safari-chrome-tint.css](../src/styles/safari-chrome-tint.css), [apple-design/CLOSE-OUT.md](./apple-design/CLOSE-OUT.md)

---

## Skills and tooling used

| Skill / tool | Status | How it was used |
| --- | --- | --- |
| **Apple Design** (`apple-design`) | Available locally at `Files/09_SOFTWARE/03_AI/AI Skilles/apple-design-skill-main`; **symlinked** into `.agents/skills/apple-design` for this project (no duplicate clone) | Read `SKILL.md`; loaded HIG refs: `accessibility.md`, `layout.md`, `color.md`, `dark-mode.md`, `designing-for-macos.md`, `materials.md`, `liquid-glass.md`, `cross-platform.md` |
| **UI Skills** (`ui-skills`) | **Not installed** in project skill dirs; catalog inspected via [ui-skills.com](https://www.ui-skills.com/); `ibelick/baseline-ui` + `ibelick/improve-ui` skill texts fetched | Applied improve-ui proof gates (contract / runtime / correction) and baseline-ui constraints relevant to surfaces (safe-area, compositor props). Docker `npx ui-skills` failed in this agent sandbox (`docker.sock` permission denied) |
| **Browser Use** (`.agents/skills/browser-use`) | Skill present; **CLI `browser-use` not on PATH** | Documented limitation; used **cursor-ide-browser** instead for navigate, screenshots, and CDP `Runtime.evaluate` on the live app |
| Prior project chrome audits | Present under `docs/` | Treated as architecture context, not as proof that the live compositing bug is fixed |

**Not claimed:** Safari iOS device Liquid Glass sampling; browser-use CLI session; full ui-skills catalog install.

---

## 1. Executive summary

What is visibly wrong: site header (and other Liquid Glass surfaces) render as milky / near-solid light panels instead of translucent materials that reveal rich content. Footer glass corners reveal a flat off-white page canvas. Browser chrome tint (`theme-color` / Safari edge anchors) is driven by the same near-white surface colors (`#fafafa` / `#f8fafc`), so OS chrome also reads as solid light wash rather than immersive glass.

What is known (verified on localhost, light appearance, `data-glass-effect="liquid"`, `data-chrome-tint-style="glass"`):

1. **Document paint is opaque** — `html` and `body` compute `background-color: rgb(248, 250, 252)` (`#f8fafc`).
2. **Glass tint equals that canvas** — `--az-site-glass-tint: #f8fafc`; liquid fill is `color-mix(#f8fafc 45%, transparent)`.
3. **Backdrop under chrome is the body canvas**, not hero / media — `elementsFromPoint` under the header and above the footer only hit transparent shells, then opaque `body` / `html`.
4. **Header still runs a real `backdrop-filter`** (blur + saturate + SVG refraction) — the effect is “glass over white,” not “filter disabled.”
5. **Platform constraint:** this is a **Next.js web storefront**, not Electron/Tauri/native. CSS cannot make the browser window transparent to the desktop; Chromium `theme-color` is an **opaque** tint; Safari 26+ Liquid Glass **samples edge pixels** inside the page.

Confounding observation (same session): the home route showed a content error (“This page could not load”), which emptied the main column and made the white canvas even more dominant. The compositing architecture still fails with content present when that content does not extend under chrome or differs little from `#f8fafc`.

---

## 2. Rendering architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ OS / browser chrome (not CSS-owned)                         │
│  • Chromium: <meta name="theme-color"> → solid omnibox tint │
│  • Safari 26+: samples fixed edge strips (~4px)             │
│  • No public API for content-sampled translucent omnibox    │
└─────────────────────────────────────────────────────────────┘
          ▲ theme-color / edge sample (#fafafa here)
┌─────────────────────────────────────────────────────────────┐
│ #az-safari-chrome-top / bottom (2px / safe-area)            │
│  background: --az-browser-chrome-tint  (z-index very high)  │
│  display:none in non-Apple WebKit                           │
├─────────────────────────────────────────────────────────────┤
│ Functional layer (intended glass)                           │
│  .site-header / .site-footer / menus / panels               │
│  fill: color-mix(--az-site-glass-tint × opacity, transparent)│
│  filter: backdrop-filter blur(+ refraction when liquid)     │
│  chrome mix vars: --az-chrome-tint-mix ≈ 0.7–0.98           │
├─────────────────────────────────────────────────────────────┤
│ Content layer                                               │
│  .site-shell / .site-main (transparent backgrounds)         │
│  blocks / hero / error empty state                          │
├─────────────────────────────────────────────────────────────┤
│ Ambient layers (z≈0)                                        │
│  body::before gradients (+ glass-overlay opacity 0.88)      │
│  body::after accents / preset bg effects                    │
├─────────────────────────────────────────────────────────────┤
│ Document canvas (OPAQUE) ← dominant backdrop today          │
│  html, body { background-color: --bg-primary / --background }│
│  live: #f8fafc ; tokens default light: #fafafa / #ffffff    │
└─────────────────────────────────────────────────────────────┘
```

**Data path for tint (verified in code):**

`SiteTheme` → `resolveMobileBrowserTheme` / `resolveBrowserProjection` → SSR `layout.tsx` inline `--az-browser-chrome-tint` / `--az-site-glass-tint` → boot script (`theme-boot.ts`) → `ThemeEngineProvider` → `syncThemeColorMeta` → `syncSafariChromeTint` (+ scroll overrides via `scroll-chrome-tint.ts` for Safari anchors only; glass stays on projection surface).

---

## 3. Findings table

| # | Issue | Evidence | Affected file / component | Root cause | Confidence | Severity |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Glass composited over opaque near-white document | CDP: `html`/`body` `rgb(248,250,252)`; screenshot: milky header, white footer cutouts | `globals.css` (`html`/`body` backgrounds); `DEFAULT_LIGHT_SURFACES` | Opaque canvas is the actual backdrop; blur has nothing rich to sample | **Confirmed** | **P0** |
| F2 | `--az-site-glass-tint` ≈ page background | Live vars `#f8fafc` / `#fafafa`; `--az-site-glass-bg` = tint @ 45% | `theme-engine-provider.tsx` (`glassTint: baseActiveColor`); `safari-chrome-tint.ts`; `site-glass-effect.css` | Tint identity collapses glass fill into the same hue as the canvas | **Confirmed** | **P0** |
| F3 | High chrome mix defeats translucency | Boot/runtime `--az-chrome-tint-mix: 0.7`; mobile CSS defaults mix+0.06 → ~0.76–0.98; header `color-mix(... mix%, transparent)` | `site-glass-effect.css`; `header-builder.css`; `theme-boot.ts` | Even with `backdrop-filter`, fill is 70–98% opaque surface | **Confirmed** | **P0** |
| F4 | Content does not extend under chrome | `elementsFromPoint` under header → transparent shells → body; Apple HIG requires content under bars | Layout / hero / overlay config; header flush rules | Violates material hierarchy; glass has no subject | **Confirmed** (this route); **likely** elsewhere without overlay heroes | **P0** |
| F5 | Liquid Glass applied beyond functional chrome | `site-glass-effect.css` targets cards, tables, forms, FXS panels, etc. when `data-glass-effect=liquid` | `site-glass-effect.css`; Theme Studio glass toggle | Conflicts with Apple: glass only on floating controls (`materials.md` / `liquid-glass.md`) | **Confirmed** in CSS scope; Gate 2 already pushed cards opaque in labels | **P1** |
| F6 | `data-glass-overlay=on` raises `body::before` opacity to 0.88 | Live attr + CDP `bodyBeforeOpacity: 0.88`; `site-backgrounds.css` | `visual-experience-resolver.ts` (enabled when glass on); `site-backgrounds.css` | Extra wash over canvas; can flatten ambience under glass | **Confirmed** | **P1** |
| F7 | Safari anchors fall behind body if mis-stacked | Code comment + CSS: `z-index: -1` → flat light chrome | `safari-chrome-tint.css` | Documented failure mode; current z is high — OK if unchanged | **Confirmed** as risk / prior fix | **P1** (regression) |
| F8 | `theme-color` cannot express translucency | Spec + `resolve-mobile-browser-theme.ts` comment; metas are solid `#fafafa` | Browser platform; projection layer | Expecting translucent omnibox via meta is unsupported | **Confirmed** | **P2** (expectation) |
| F9 | Lightning dual `backdrop-filter` prefix collapse | Comment in `site-glass-effect.css`; Chromium computed `webkitBackdropFilter: ""` while unprefixed works | Build/CSS pipeline | Already mitigated with `@supports` split; watch regressions | **Confirmed** mitigation exists | **P2** |
| F10 | Home route content error empties main | Snapshot: “This page could not load”; error box bg transparent | `region-renderer` / layout engine (out of glass scope) | Amplifies white canvas; separate bug | **Confirmed** this session | **P1** (blocker for visual QA) |

---

## 4. Root-cause analysis

### What surface is supposed to be translucent?

Two intended surfaces (product + code):

1. **Site functional chrome** — `.site-header`, sticky variants, menus, footer shell when Liquid Glass / chrome tint style `glass` or `transparent` is on. Expected: frosted material revealing **page content / hero / ambient layers** beneath.
2. **Browser / OS chrome** — status bar / toolbar tint via `theme-color` (Chromium) and Safari edge sampling. Expected (project docs): **opaque tint matching surface**, optionally tracking scroll sections — **not** true OS-level translucency. Immersive “sample the hero through the omnibox” is explicitly **out of scope** ([immersive-chrome-audit.md](./immersive-chrome-audit.md)).

### What is actually behind the glass?

Verified: **opaque `html`/`body` `#f8fafc`**, plus faint `body::before` radial washes. Main/shell are transparent; they do not paint a second background. With the home error state, no hero pixels sit under the header.

### Why it looks solid white / milky

Glass appearance ≈ `mix(tint, transparent) + blur(backdrop)`.

Here:

- `tint` ≈ `#f8fafc` (same as canvas)
- `backdrop` ≈ `#f8fafc` (same canvas)
- fill strength often **≥ 70%** via `--az-chrome-tint-mix`

So blur and refraction operate on a near-uniform light field. Perceptual result: frosted white / cream slab. Apple’s clear Liquid Glass guidance (`materials.md`): clear glass belongs over **visually rich** backgrounds; over bright fields, consider **~35% dark dimming** — the opposite of “tint = canvas white.”

### Why code produces that stack

1. Light theme surfaces default to `#fafafa` / `#ffffff` (`theme-surfaces.ts`); published preset resolves `--background` / `--bg-primary` to `#f8fafc`.
2. `html`/`body` always paint those tokens opaquely (`globals.css`).
3. Projection sets chrome/glass tints from those surfaces (`resolveMobileBrowserTheme`, `ThemeEngineProvider` `glassTint: baseActiveColor`).
4. Liquid CSS builds `--az-site-glass-bg` from `--az-site-glass-tint` (`site-glass-effect.css`).
5. Header uses the same tint with a high mix (`header-builder.css`).
6. Enabling glass also turns on `data-glass-overlay` (`visual-experience-resolver.ts`), thickening the ambient wash.

This is **not** primarily “backdrop-filter broken in Chromium” on this build — CDP shows an active filter. The failure is **backdrop identity + fill opacity + layering**.

---

## 5. Prioritized remediation plan

### Phase 0 — Reproduction and baseline

| ID | Action | Priority | Owner files | Expected outcome | Risk | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| 0.1 | Fix or bypass home `RegionRenderer` error so a real hero/content page can be audited | P0 | layout-engine / page content | Content under chrome | Low | Page loads; screenshot |
| 0.2 | Capture CDP dump of tint vars + computed header/footer/body on light, dark, glass on/off | P0 | — | Baseline artifact | None | Scripted evaluate |
| 0.3 | Lock intended product behavior in one sentence (site glass vs OS chrome) | P0 | product / this doc | Avoid chasing unsupported omnibox translucency | None | Written acceptance |
| 0.4 | Safari iOS device pass for edge anchors (CLOSE-OUT #12) | P0 | device QA | Confirm F7 not regressing | None | Paint 1 ≡ paint 3 checklist |

### Phase 1 — Root-cause correction (smallest changes)

| ID | Change | Priority | Files | Expected outcome | Dependencies | Risk | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | Ensure first-viewport **rich content extends under** header (overlay / negative margin / flush-top paths already exist — enable for home) | P0 | header overlay config, page blocks, `header-builder.css` | Header samples hero/media, not empty canvas | 0.1 | Medium (layout) | Screenshot: imagery visible through glass |
| 1.2 | When chrome style is `glass`/`transparent`, **lower effective mix** so fill is not 70–98% opaque (or drive header fill from `--az-site-glass-bg` only, not dual high mix) | P0 | `site-glass-effect.css`, `header-builder.css`, Theme Studio opacity defaults | Visible translucency over content | Product opacity prefs | Medium | CDP `backgroundColor` alpha; visual |
| 1.3 | Keep `--az-site-glass-tint` as projection surface **but** require backdrop ≠ uniform tint for glass-on routes (content under chrome OR ambient layer that is not identical flat fill) | P0 | layout + optional ambient | Glass has subject | 1.1 | Low | Visual |
| 1.4 | Revisit `data-glass-overlay` auto-on when Liquid Glass enables — either reduce opacity or disable when it flattens the canvas | P1 | `visual-experience-resolver.ts`, `site-backgrounds.css` | Less milky wash | Theme Studio | Low | Toggle compare |
| 1.5 | Do **not** set Safari anchors to `z-index: -1`; keep positive stack (already correct) — add regression test | P1 | `safari-chrome-tint.css`, tests | Prevent white Safari fallback | — | Low | Unit / visual |

### Phase 2 — Glass and tint implementation (platform-correct)

| ID | Change | Priority | Files | Expected outcome | Risk | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| 2.1 | Restrict Liquid Glass selectors to **functional layer** (header, footer shell, menus, sheets, search) — exclude content cards/tables unless explicitly opted in | P1 | `site-glass-effect.css` | Align with Apple materials hierarchy | Medium | Selector audit + screenshots |
| 2.2 | For clear glass over bright media: optional **dimming layer ~35%** behind chrome (Apple clear-glass guidance) | P2 | header overlay styles | Legible clear glass | Low | Contrast check |
| 2.3 | Keep OS chrome as **opaque Theme Color** approximation; document that translucency is site-only | P2 | docs + Theme Studio copy | Correct expectations | None | Meta content === projection |
| 2.4 | Scroll tint continues to update Safari anchors / `theme-color` only; **do not** wash header glass with scroll sample (already intended via `glassTint: baseActiveColor`) | P1 | `theme-engine-provider.tsx` | Status bar may shift; capsule stays site surface | Low | Scroll sections with `data-chrome-tint-*` |

### Phase 3 — Theme and accessibility

| ID | Change | Priority | Files | Expected outcome | Risk | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| 3.1 | `prefers-reduced-transparency`: opaque fills (header already has rules; extend to all liquid targets) | P1 | `site-glass-effect.css`, `header-builder.css` | No frost when reduced | Low | OS setting |
| 3.2 | `prefers-contrast: more`: stronger opaque chrome (CLOSE-OUT #5) | P1 | same | Legible | Low | macOS Increase Contrast |
| 3.3 | Dark appearance: glass over dark canvas (`#020408` family), not light tint bleed | P0 | projection + boot | No milky white chrome in dark | Medium | Forced dark screenshots |
| 3.4 | Forced Colors / Windows HC: keep opaque system colors on badges (already Gate 4) | P2 | `site-glass-effect.css` | No tint-only meaning | Low | Forced colors |

### Phase 4 — Regression and visual verification

| ID | Check | Pass criterion |
| --- | --- | --- |
| 4.1 | Light + glass on, hero under header | Imagery/color visible through header; not uniform cream |
| 4.2 | Dark + glass on | No light `#fafafa` flash; footer/header sample dark content |
| 4.3 | Glass off / solid chrome style | Opaque matching projection; no broken layout |
| 4.4 | Reduced transparency | Opaque fallbacks; no double borders |
| 4.5 | Chromium theme-color | Meta matches projection; omnibox solid tint OK |
| 4.6 | Safari iOS | Edge anchors tint; no flat default light chrome (CLOSE-OUT #12) |
| 4.7 | Scroll chrome sections | Anchors update; site glass tint stays projection |
| 4.8 | Related surfaces | Mega menu, mobile drawer, search panel, footer corners |

---

## 6. File-level change inventory

| File | Likely change purpose |
| --- | --- |
| `src/app/globals.css` | Document-canvas strategy if ambience must sit above opaque fill; keep tokens coherent |
| `src/styles/site-glass-effect.css` | Mix defaults, liquid selector scope, a11y fallbacks, glass-bg ownership |
| `src/styles/site-backgrounds.css` | Glass-overlay wash strength / when enabled |
| `src/styles/safari-chrome-tint.css` | Preserve edge-sample stacking; inset ambient wash |
| `src/features/navigation/components/header/header-builder.css` | Header fill mix; overlay/flush paths; mobile 98% mix |
| `src/components/theme/theme-engine-provider.tsx` | Confirm `glassTint` vs scroll `color` split under all modes |
| `src/lib/theme/safari-chrome-tint.ts` / `theme-boot.ts` | Boot opacity → mix mapping; avoid baking opaque mixes |
| `src/lib/theme/resolve-mobile-browser-theme.ts` | Opaque theme-color approximation only; style opacity defaults |
| `src/features/theme/visual-experience-resolver.ts` | Stop auto-enabling heavy glass overlay when it fights translucency |
| `src/features/theme/surfaces/theme-surfaces.ts` | Light defaults awareness (not necessarily change hex) |
| `src/app/layout.tsx` | SSR tint vars / anchors (only if boot contract changes) |
| Theme Studio UI / schema | Honest labels: OS tint = opaque; site glass = CSS material |
| `docs/browser-chrome-theme-sync.md` | Cross-link this audit; no architecture rewrite unless contracts change |
| Layout-engine / home page | Fix content error blocking visual QA (F10) |

---

## 7. Platform limitations

| Mechanism | Controllable by this project? | Notes |
| --- | --- | --- |
| Translucency **within** the page (`backdrop-filter`, alpha fills) | **Yes** | Requires non-uniform backdrop + restrained fill opacity |
| Browser omnibox / toolbar **translucency** | **No** (public web) | Theme Color = solid; Safari samples page edge colors |
| Native macOS materials / vibrancy | **No** in this stack | Would need Electron/Tauri + native APIs (`liquid-glass.md` cross-platform) |
| Window transparency to desktop wallpaper | **No** | Ordinary browser tab |
| Scroll-driven chrome tint via meta / Safari anchors | **Partial** | Already implemented; opaque colors only |
| Dynamic “content-sampled immersive chrome” | **Unsupported** | Stop condition in immersive-chrome-audit |

**Implication:** Fixing the milky header is a **site compositing** problem. Fixing “white Safari/Chrome toolbar” on iOS/Android is a **projection / edge-sample color** problem, not a CSS glass opacity tweak alone.

---

## 8. Verification checklist

- [ ] Home (or fixture) loads without RegionRenderer error  
- [ ] Light + `data-glass-effect=liquid`: header over hero shows media through frost  
- [ ] CDP: `--az-site-glass-tint`, `--bg-primary`, header `backgroundColor`, `backdropFilter` recorded  
- [ ] `elementsFromPoint` under header includes media/content node before `body`  
- [ ] Dark forced: no light chrome flash; glass samples dark surfaces  
- [ ] `data-chrome-tint-style=solid|transparent|glass|gradient` each match Theme Studio intent  
- [ ] `prefers-reduced-transparency: reduce` → opaque chrome  
- [ ] `prefers-contrast: more` → opaque / bordered chrome  
- [ ] Chromium: `meta[theme-color]` matches projection  
- [ ] Safari iOS: CLOSE-OUT #12 four-value boot identity  
- [ ] Footer rounded corners reveal content/ambience, not accidental white slab (unless intentional canvas)  
- [ ] Mega menu / mobile nav / search panel do not double-stack glass into illegible mush  

---

## 9. Risks and dependencies

| Risk | Mitigation |
| --- | --- |
| Lowering chrome mix hurts legibility on busy heroes | Pair with scroll-edge fade / dimming; test overlay pages |
| Narrowing liquid selectors regresses Theme Studio “glass everywhere” expectation | Align Studio copy with Gate 2 opaque card labels |
| Changing body background strategy breaks theme tokens / PWA splash | Keep splash/`theme-color` opaque; only change layering |
| Content error (F10) blocks before/after proof | Fix or use immersive-chrome preview fixtures first |
| Safari-only verification gap | Device QA still required; Chromium cannot prove edge sampling |
| ui-skills / browser-use CLI unavailable in agent | Install CLI later for repeatable capture; do not block Phase 1 on them |

**Unresolved assumptions:** Product may still want near-opaque “soft surface” chrome on some presets — confirm before lowering mixes globally.

---

## 10. Open questions

1. **Product intent:** Should site Liquid Glass prioritize **clear** (media-first) or **regular** (legibility-first) over typical marketing pages?  
2. **Home content failure:** Is the RegionRenderer error environment-specific or a shipped regression? (Blocks clean visual sign-off.)  
3. **Glass overlay:** Should `data-glass-overlay` remain coupled to `glassEffectEnabled`, or become an independent Theme Studio control?  
4. **Safari device evidence:** CLOSE-OUT #12 still UNRUN — any live device screenshots of “white tint” vs milky site header?  

---

## Improve first (UI Skills / Apple lens)

**Highest leverage:** Make the **backdrop under functional chrome** visually rich and **lower the opaque fill mix** so `backdrop-filter` has something to sample (Phase 1.1 + 1.2). Until the header sits over non-uniform content with a restrained alpha, no amount of refraction SVG will look like Apple materials (`layout.md` › Visual hierarchy; `liquid-glass.md` › clear glass over rich backgrounds).

---

## Implementation gate

**Do not modify application code for these findings until explicit approval.** This document is audit + plan only.

Suggested next step after approval: execute Phase 0.1 → 1.1 → 1.2 on one marketing route, capture before/after screenshots + CDP, then expand selector discipline (2.1) and a11y (3.x).
