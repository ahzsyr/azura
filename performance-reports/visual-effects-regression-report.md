# Visual Effects Regression Report

Generated after restoring background effects and header animations from the `/learn` reference.

## Root Cause

The regression was introduced in commit `cd56733` ("Background Effects & Performance Optimization"), which refactored the effects hydration path without preserving the working mount contract from `/learn`.

### Primary break: effects never reliably mounted on the client

1. **`ThemeEffectsClient` stopped applying on mount** — `applyOnMount` was removed from `theme-provider.tsx`, and the client only listened for `THEME_CHANGE_EVENT`. Canvas backgrounds (`initBackground`) and text effects (`initTextEffects`) never ran on first paint.
2. **`ThemeEngineProvider` lost the `/learn` dual-hydration path** — the working version called both `applyLiveEffectsFromStorage()` on hydrate and `applyResolvedEffects()` when `next-themes` resolved. The broken version required `siteResolved` and used a single effect path that could skip application.
3. **Shell-ready timing removed** — backgrounds could initialize during `html.site-preloading` and not re-mount after the preloader finished.

### Secondary issues

4. **`CapabilityInit` was inert** — capability tier changes never triggered a effects re-apply.
5. **Constrained-device fallback removed from `applySiteBackground`** — heavy effects could be cleared instead of falling back to `grid` on low-end devices.
6. **Policy downgrade could map to `"none"`** — `downgradeSiteBackgroundForPolicy(...) ?? "none"` could clear backgrounds when policy returned `null` for edge cases.

### Symptom explanation

Users saw only the ambient `body::before` purple/violet gradient wash (dark accent `#7c3aed`) with no hexagon canvas, particles, or animated gradient text — because SSR provides CSS attributes and gradient washes, but **canvas and JS text effects require client `applyVisualEffects()`**.

---

## Exact Differences: `/learn` vs Broken Current

| Area | `/learn` (working) | Broken current |
|------|-------------------|----------------|
| `theme-effects-client.tsx` | Always applies effects when `tokens`, `siteResolved`, and appearance are ready | Required `applyOnMount` prop (not passed); only re-applied on `backgroundEffect` change |
| `theme-provider.tsx` | `ThemeEffectsClient` always mounted with apply behavior | No `applyOnMount` |
| `theme-engine-provider.tsx` | `applyLiveEffectsFromStorage` on hydrate + `applyResolvedEffects` when `resolvedTheme` defined | Single path requiring `siteResolved`; no `applyLiveEffectsFromStorage` |
| `background-system.ts` | Simple mount; no shell-ready defer | No constrained fallback; no shell-ready re-mount |
| `capability-init.tsx` | N/A (not present) | Empty subscribe callback |
| `effects-runtime.ts` | Direct `applySiteBackground(backgroundEffect)` | Added policy downgrade with `?? "none"` fallback |

**Note:** `/learn` does **not** use `visualEffectsEngine` — it uses direct `applyVisualEffects()` DOM/canvas calls. Restoration followed `/learn` as the source of truth.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/theme/theme-effects-client.tsx` | Restored always-apply-on-mount with `whenShellReady` + `deferUntilIdle`; default `applyOnMount=true`; shell-ready defer for `PageVisualEffects` |
| `src/components/theme/theme-provider.tsx` | Re-added `applyOnMount` on `ThemeEffectsClient` |
| `src/components/theme/theme-engine-provider.tsx` | Restored `applyLiveEffectsFromStorage` hydrate path; restored `resolvedTheme` effect; `applyResolvedEffects` uses `buildLiveVisualExperience` without `siteResolved` gate |
| `src/features/theme/effects-runtime.ts` | Policy downgrade falls back to original `backgroundEffect` instead of `"none"` |
| `src/features/theme/backgrounds/background-system.ts` | Restored `isConstrainedBackgroundEnvironment`, grid fallback, `mountBackgroundEffectWhenReady` with shell-ready defer and re-mount on `azura:shell-ready` |
| `src/components/theme/capability-init.tsx` | Dispatches `THEME_CHANGE_EVENT` on capability tier changes to re-apply effects |

---

## Restoration Summary

- **Background effects:** Canvas layers mount after shell-ready via `ThemeEffectsClient` + `background-system` defer; hexagons/particles/grid render above ambient wash.
- **Text animations:** `applyVisualEffects` sets `data-text-effect-theme`, tags hero headings, and calls `initTextEffects` — same as `/learn`.
- **Gradient text CSS:** Unchanged — `preset-visuals.css` + SSR `--az-preset-gradient-accent` still drive `gradient-flow` on `[data-hero-title]`.
- **Scroll reveals:** Unchanged — `ScrollRevealObserver` + `whenShellReady` in motion components.

---

## Verification

| Check | Status |
|-------|--------|
| IDE linter on changed files | Pass (no diagnostics) |
| `npm run build` | Not run — `node_modules` not installed in workspace |
| `npx tsc --noEmit` | Not run — TypeScript not installed locally |

### Manual verification checklist (run after `npm install`)

```bash
npm install
npm run dev
```

In browser DevTools on a marketing page with hexagons preset:

```javascript
// Canvas background mounted
document.body.querySelector('canvas[data-bg-effect]')

// Text effect theme active
document.documentElement.dataset.textEffectTheme

// Hero heading tagged
document.querySelector('[data-hero-title]')?.dataset.textEffect
```

```bash
npm run build && npm run start
```

Confirm: hex grid animates, gradient hero text animates, no hydration warnings, no GSAP import errors.
