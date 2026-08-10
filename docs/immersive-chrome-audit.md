# Immersive Mobile Browser Chrome Audit — Findings

**Date:** 2026-07-17  
**Status:** Investigation complete (device UI observations partially pending)  
**Success criterion:** Visual parity with the desired immersive effect — **not** metadata correctness alone.

**Related:** Standards-supported Theme Color, manifest, and Apple status bar contracts live in the canonical architecture specification [browser-chrome-theme-sync.md](./browser-chrome-theme-sync.md). This audit covers unsupported immersive chrome and device verification; it is not the Theme Color sync ownership document.

**Related (rendering):** Route-dependent browser chrome is investigated in [immersive-rendering-audit.md](./immersive-rendering-audit.md) using States A/B/C and a Phase 0 SSR head branch (metadata mismatch vs timing vs immersive heuristics)—not by assuming Theme Color is globally correct.

---

## Don't Assume the Browser (applied)

This audit treats the following as **unsupported / non-deterministic** unless proven otherwise with device evidence:

- Translucent address bar that “samples” hero pixels (Dynamic Browser Chrome)
- OEM Samsung-only chrome blending
- Chrome A/B or feature-flag gated UI

**Officially supported / documented levers:**

| Lever | Evidence |
|-------|----------|
| `<meta name="theme-color">` / manifest `theme_color` | [Lighthouse themed-omnibox](https://developer.chrome.com/docs/lighthouse/pwa/themed-omnibox); Chrome Android address-bar tint |
| `viewport-fit=cover` + safe-area insets | [Chrome edge-to-edge guide](https://developer.chrome.com/docs/css-ui/edge-to-edge) |
| Dynamic toolbar / “chin” retract on scroll (Chrome 135+) | Same Chrome docs; gesture nav; server-side rollout historically |

There is **no public web API** that says “make the address bar translucent and paint my hero through it.”

---

## Phase 0 — Reference lock & effect classification

### Locked reference (documentation + desired product language)

No customer screenshot URL was provided at execution time. The audit locks:

1. **Product intent (from original feature request):** browser UI “visually blends” with hero / fullscreen layouts on Chrome Android, Samsung Internet, PWAs.
2. **Documented Chrome behavior:** [Edge-to-edge on Android](https://developer.chrome.com/docs/css-ui/edge-to-edge) (Dynamic Toolbar / chin + bottom viewport extension).
3. **Documented Theme Color:** Lighthouse themed omnibox (flat solid tint).

### Effect-class classification of the *desired* screenshots (hypothesis → to confirm on device)

| Class | Likely for “blend with hero” screenshots? | Controllable by web app? |
|-------|---------------------------------------------|---------------------------|
| **Theme Color** | Partial (flat tint matching page) | Yes |
| **Dynamic Browser Chrome** (content-sampled) | Often what people *want* | **No documented API** |
| **Dynamic Toolbar** (retract on scroll) | Often present in modern Chrome | Partially (tall scrollable page; browser-owned) |
| **OEM-only** | Possible on Samsung | Not portable |

**Pass/fail for this project (locked):**

- **Pass (supported):** Theme Color matches surface; viewport-fit/safe-area correct; Dynamic Toolbar retracts on scroll when Chrome provides it.
- **Fail / stop:** Chasing translucent content-sampled chrome without a supported path.

---

## Phase 1 — Capability matrix (documented + live HTML)

Live production HTML from `https://brt-me.com/en` (fetched 2026-07-17):

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)"/>
<meta name="theme-color" content="#050400" media="(prefers-color-scheme: dark)"/>
<meta name="color-scheme" content="light dark"/>
<link rel="manifest" href="/manifest.webmanifest"/>
```

| Browser | Env (fill on device) | Theme Color | Dynamic Chrome | Dynamic Toolbar | PWA |
|---------|----------------------|-------------|----------------|-----------------|-----|
| Chrome Android | Android __ / Chrome __ / gesture\|3-btn / Material You __ | **Supported** (docs + meta present) | **Unsupported API** | **Browser-owned** (Chrome 135+, gesture) | Manifest `theme_color` light surface |
| Samsung Internet | version __ | Typically Theme Color | OEM possible | Vendor-specific | Test on device |
| Edge Android | version __ | Theme Color likely | Unknown | Unknown | Test on device |
| Firefox Android | version __ | Limited / none often | No | Different | Boundary |
| Chrome PWA | installed? | Manifest + meta | Unsupported | Different chrome | Test |
| Samsung PWA | installed? | Manifest + meta | OEM | Vendor | Test |

**Device columns left blank intentionally** — must be filled with screenshot/recording evidence when testing fixtures. Do not invent device results.

---

## Phase 2 — Reference vs BRT (code + live HTML)

| Check | Chrome docs / Theme Color reference | BRT home (live + code) | Delta tag |
|-------|--------------------------------------|-------------------------|-----------|
| `viewport-fit=cover` | Documented for edge-to-edge opt-in behavior | **Present** live | meta-only: aligned |
| `theme-color` light/dark | Supported Theme Color | `#fafafa` / `#050400` | meta-only: aligned with surfaces |
| Hero at y=0 under browser chrome | N/A (not an API) | **No by default** — header (+ optional announcement) above `main` | **layout** |
| Overlay pulls under header only | — | Negative margin = header height ([`globals.css`](../src/app/globals.css)) | **layout** |
| Top ~120px opaque chrome | — | Mobile header: ~98% surface + `backdrop-filter: blur(20px)` ([`header-builder.css`](../src/features/navigation/components/header/header-builder.css) ~989–995) | **layout / paint** |
| Safe-area on header | Recommended for cover | `padding-top: env(safe-area-inset-top)` on mobile header | layout: present |
| Scroll retract | Dynamic Toolbar | Depends on Chrome version + tall page (`min-h-[85vh]` hero + content) | browser |

**Conclusion:** BRT already ships correct Theme Color + viewport-fit. The gap vs “immersive blend with hero” is **not** missing meta — it is either unsupported Dynamic Chrome or layout/paint (opaque/blurred header dominating top pixels).

---

## Phase 3 — First viewport + paint audit (BRT)

### DOM / layout stack

```
html/body (solid --background)
  → announcement (optional)
  → site header (sticky/fixed; mobile glass + safe-area)
  → main.site-main
       → hero (only under header when overlay enabled)
```

Evidence: [`src/app/[locale]/layout.tsx`](../src/app/[locale]/layout.tsx), [`header-builder.css`](../src/features/navigation/components/header/header-builder.css), overlay rules in [`globals.css`](../src/app/globals.css).

### Paint / compositing (code evidence)

| Factor | Present on mobile header? | Implication |
|--------|---------------------------|-------------|
| Near-opaque background | `color-mix(... surface 98%, transparent)` | Top pixels are header surface, not hero |
| `backdrop-filter: blur(20px)` | Yes (mobile default) | Separate compositing layer; samples blurred content behind header, not raw hero at y=0 for *browser* chrome |
| Overlay glass | `backdrop-filter: blur(14px)` + 55% surface | Same layer occlusion pattern |
| Overlay transparent | `background: transparent` when `overlay-surface=transparent` | Only mode where hero can approach top pixels under header |
| Body ambient `::before/::after` | Fixed washes `z-index: 0` | Behind content; can show in gaps / loading |

**Hypothesis (needs device layer-tree dump to confirm):** Chrome Theme Color uses meta (solid `#fafafa` / `#050400`), while any “blend” users expect from hero is blocked by the header paint stack — and true content-sampled Dynamic Chrome is not a public API.

### First paint

- SSR paints theme surfaces + theme-color immediately (live HTML).
- Hero image is not the first paint of the top chrome band unless overlay + transparent header.

---

## Phase 4 — Fixtures shipped

Temporary routes (preview path; skips locale middleware):

- Index: `/preview/immersive-chrome`
- Cases: `/preview/immersive-chrome/[id]`

| ID | Case |
|----|------|
| `solid-red` / `solid-green` / `solid-blue` | Solid full-bleed, no header; `themeColor` matches solid |
| `hero-image` | Image, no header |
| `hero-with-site-header` / `hero-opaque-header` | Opaque header over image |
| `hero-transparent-header` | Transparent header over image |
| `hero-blurred-header` | backdrop-filter header over image |
| `video` | Full-screen video |
| `gradient` | CSS gradient |

**How to record (device):**

1. Capture Android / Chrome / Samsung versions, gesture vs 3-button, PWA yes/no, Material You on/off.
2. Screenshot at rest + after scroll for each fixture.
3. Label observation as Theme Color / Dynamic Chrome / Dynamic Toolbar / OEM.

**Interpretation rules (from plan):**

- No-header solids tint bar → Theme Color works.
- No-header image “blends” but live site does not → layout/paint limiter.
- Nothing ever blends → stop (unsupported Dynamic Chrome / OEM).

Fixture **device results:** `PENDING_DEVICE` (this environment cannot drive Chrome Android UI).

---

## Phase 5 — Classification

### Primary cause

**Desired “content-sampled immersive address bar” is not a supported, reliable web API.**  
Evidence: Chrome public docs cover Theme Color and edge-to-edge/Dynamic Toolbar (chin), not hero-sampling into the top omnibox ([edge-to-edge](https://developer.chrome.com/docs/css-ui/edge-to-edge), [themed omnibox](https://developer.chrome.com/docs/lighthouse/pwa/themed-omnibox)).

### Secondary contributors (if the goal is relaxed to Theme Color + less opaque top chrome)

1. **First-viewport paint:** solid body + nearly opaque blurred header dominate top pixels (code evidence in `header-builder.css`).
2. **Hero not under browser chrome:** overlay only compensates for site header height.
3. **Compositing:** `backdrop-filter` on header creates glass layers over content.
4. Theme Color itself: **already correct** on production (`#fafafa` / `#050400`).

### Confirmed

- Theme Color + `viewport-fit=cover` live on BRT (HTML fetch).
- Client sync must not remove Next-owned metas (prior `removeChild` incident; fixed to in-place updates).
- Marketing shell paints header above hero by default (code).

### Rejected

- “Missing generateViewport / wrong theme-color is why immersive screenshots don’t match” as the primary product gap — meta is already in place; effect class mismatch is primary.
- Further metadata/head-manager refactoring to achieve Dynamic Browser Chrome — violates stop condition.

### Remaining unknowns (device)

- Exact Samsung Internet / OEM behavior on fixtures.
- Whether any Chrome experiment shows content-sampled top chrome on no-header fixtures.
- Layer-tree sampling confirmation via remote DevTools.

---

## Phase 6 — Stop vs implement

### STOP (mandatory for Dynamic Browser Chrome goal)

Per plan stop condition: the reference-style **content-sampled / translucent immersive address bar** cannot be reliably reproduced through standard web APIs.

**Do not** continue refactoring:

- theme-color reconciliation beyond current hygiene
- viewport / Metadata API churn
- Theme Studio mobile-browser fields for this effect

Document for stakeholders: Theme Color and Dynamic Toolbar (scroll retract / chin) are the supported outcomes; “hero through the address bar” is browser/OEM-controlled if it appears at all.

### Optional minimal follow-ups (only if product accepts Theme Color + layout polish — separate approval)

Not executed in this audit (would be a new scoped task):

1. Prefer **transparent** overlay surface on home when first-block overlay is on (avoid glass blur layer).
2. Ensure first paint avoids a long solid band before hero (preloader already aligned to surfaces).
3. Keep theme-color sync as Theme Color only.

---

## Deliverable checklist

| Item | Status |
|------|--------|
| Environment capture template | In matrix above |
| Effect-class classification | Done |
| Capability matrix (docs + live meta) | Done; device cells pending |
| Reference diffs | Done (docs vs BRT HTML/code) |
| Paint/layer notes | Done (code) |
| Fixtures (10 cases) | Shipped at `/preview/immersive-chrome` |
| Primary / secondary / confirmed / rejected / unknowns | Done |
| Stop decision | **STOP** for Dynamic Chrome; no further meta work |

---

## Fixture test worksheet (fill on device)

| Fixture | Theme Color? | Dynamic Chrome? | Dynamic Toolbar? | Notes / screenshot |
|---------|--------------|-----------------|------------------|--------------------|
| solid-red | | | | |
| solid-green | | | | |
| solid-blue | | | | |
| hero-image | | | | |
| hero-with-site-header | | | | |
| hero-transparent-header | | | | |
| video | | | | |
| gradient | | | | |
| hero-opaque-header | | | | |
| hero-blurred-header | | | | |
