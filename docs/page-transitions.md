# Page Transitions (Marketing Routes)

This project implements smooth page-to-page navigation for the *marketing* app (Next.js App Router under `src/app/[locale]/...`) using:

1. A “route-content” view transition (fade/slide/zoom/scale/instant).
2. Optional shared-element morphing (e.g. product image/title card -> detail page).

It’s designed to avoid awkward blank screens by keeping outgoing content visible until the incoming route has real (non-skeleton) content.

## User-visible behaviors (your examples)

### Fade / Crossfade
- Outgoing “route-content” fades out.
- Incoming “route-content” fades in.

Preset: `preset: "fade"`

### Slide
- Outgoing content slides out while fading.
- Incoming content slides in while fading.

Preset: `preset: "slide"`

### Zoom
- Outgoing “route-content” zooms out while fading.
- Incoming “route-content” zooms in while fading.

Preset: `preset: "zoom"`

### Scale
- Outgoing “route-content” scales down slightly while fading.
- Incoming “route-content” scales up from the slightly smaller size.

Preset: `preset: "scale"`

### Instant (no animation)
- Navigation still proceeds client-side, but transition effects are disabled.

Preset: `preset: "none"` (or `enabled: false`)

### Shared-element transition (card -> detail)
- When navigating via a link that contains a shared-element root, the system captures which element should “morph”.
- On the destination page, elements with the same deterministic `viewTransitionName` participate in the browser’s view-transition group animation.

Enabled via:
- `sharedElementsEnabled: true`
- plus correct `data-shared-element-*` markup (see “Shared elements” below).

## Where it’s implemented

### 1) Navigation click interception + shared-element handoff
- Link click handler that:
  - captures shared-element context (`sessionStorage`) before navigation
  - performs `router.push()` with a safe helper
- [`src/components/layout/navigation-view-transition.tsx`](../src/components/layout/navigation-view-transition.tsx)

Shared element capture logic:
- [`src/lib/navigation/shared-elements/navigation-handoff.ts`](../src/lib/navigation/shared-elements/navigation-handoff.ts)
- writes a “handoff” to `sessionStorage` and sets `document.documentElement.dataset.sharedElementHandoff`.

### 2) Stabilize outgoing content until real content arrives
- A wrapper that:
  - holds outgoing content briefly
  - then switches to the incoming route once “real” page content has committed
- [`src/components/motion/marketing-page-transition.tsx`](../src/components/motion/marketing-page-transition.tsx)

### 3) Apply preset + duration before first paint
- Inline boot script sets HTML attributes and CSS variables on `<html>` so CSS view-transition rules can run:
  - `data-page-transition`
  - `data-page-transition-duration`
  - `data-shared-elements-enabled`
  - `--page-transition-duration`
  - `--page-transition-ease`
- [`src/components/layout/page-transition-boot-script.tsx`](../src/components/layout/page-transition-boot-script.tsx)

These values come from server-resolved `pageTransitionSettings` (see configuration section).

### 4) CSS view-transition animations
The route-content view-transition name is wired like this:
- `route-loading.css` sets `view-transition-name: route-content` when transitions are enabled
- then defines `::view-transition-old(route-content)` and `::view-transition-new(route-content)` animations per preset

Implementation:
- [`src/styles/route-loading.css`](../src/styles/route-loading.css)

Shared element morphing is also CSS-driven there:
- [`src/styles/route-loading.css`](../src/styles/route-loading.css)

## Configuration shape

Page transition settings are resolved from site settings:
- `siteSettings.pageTransitions` (marketing shell data)
- [`src/features/i18n/load-locale-layout-data.ts`](../src/features/i18n/load-locale-layout-data.ts)
- [`src/features/preloader/resolve-page-transitions.ts`](../src/features/preloader/resolve-page-transitions.ts)
- Schema/defaults:
  - [`src/features/preloader/page-transitions.schema.ts`](../src/features/preloader/page-transitions.schema.ts)

### `siteSettings.pageTransitions` fields

```ts
{
  enabled: boolean; // default true
  preset: "fade" | "slide" | "zoom" | "scale" | "none"; // default "zoom"
  durationMs: number; // clamped to [120, 2000], default 300
  sharedElementsEnabled?: boolean; // default true
}
```

Notes:
- If `enabled` is false, transitions are disabled.
- If `preset` is `"none"`, transitions are also disabled.
- Shared element morphing is additionally gated by `sharedElementsEnabled`.

## Shared elements (markup requirements)

Shared element morphing requires consistent identifiers across:
1. The clicked link (source card)
2. The destination page (detail view)

### Link side (source)

The click handler looks for a root like:
- `data-shared-element-root`
  - `data-shared-element-type`: one of `product | collection | blog | gallery | content`
  - `data-shared-element-id`: an ID/slug shared with the destination view

Implementation details:
- [`src/lib/navigation/shared-elements/navigation-handoff.ts`](../src/lib/navigation/shared-elements/navigation-handoff.ts)
- The shared-element root is found via `anchor.closest("[data-shared-element-root]")`.

### Destination side (target elements)

Elements participate by having a deterministic `viewTransitionName`.
The canonical naming helper is:
- [`src/lib/navigation/shared-elements/names.ts`](../src/lib/navigation/shared-elements/names.ts)

You’ll typically use the shared helper that sets:
- `data-shared-element="image" | "title"`
- `data-shared-element-type`
- `data-shared-element-id`
- `style.viewTransitionName = sharedElementViewTransitionName(type, id, kind)`

### Where view-transition-name is connected
- `route-loading.css` uses `data-shared-elements-enabled="true"` and `view-transition-group(*)` for shared elements.

## Debug checklist

If transitions aren’t showing up, check:

1. **Are transitions enabled for the current page?**
   - Inspect `<html>` attributes:
     - `data-page-transition-enabled="true"`
     - `data-page-transition="<preset>"`
     - `data-shared-elements-enabled="true"` (if you expect shared elements)
   - Set values are produced by:
     - [`src/components/layout/page-transition-boot-script.tsx`](../src/components/layout/page-transition-boot-script.tsx)

2. **Is the route-content view-transition-name applied?**
   - `route-loading.css` applies:
     - `view-transition-name: route-content` on `.marketing-page-content`
   - File:
     - [`src/styles/route-loading.css`](../src/styles/route-loading.css)

3. **Shared elements: is there a handoff + deterministic naming?**
   - When clicking a link, confirm `sessionStorage` has:
     - `brt:shared-element-handoff`
   - Confirm your destination markup uses the same:
     - `type` + `id`
     - `data-shared-element="image"` / `"title"`
   - Root/link selection:
     - [`src/lib/navigation/shared-elements/navigation-handoff.ts`](../src/lib/navigation/shared-elements/navigation-handoff.ts)
   - Deterministic naming:
     - [`src/lib/navigation/shared-elements/names.ts`](../src/lib/navigation/shared-elements/names.ts)

4. **Reduced motion**
   - `route-loading.css` disables animations under `prefers-reduced-motion`.
   - Check your OS/browser setting if you don’t see any effects.

## Flow (high level)

```mermaid
flowchart LR
  A[Click internal link] --> B[NavigationViewTransition onClick]
  B --> C[captureSharedElementHandoff -> sessionStorage]
  B --> D[safeAppRouterNavigate (route change)]
  D --> E[MarketingPageTransition commit]
  E --> F[CSS view-transition-name: route-content]
  F --> G[route-loading.css preset animations]
  E --> H[Shared elements: viewTransitionName + view-transition-group]
```

