# Performance Optimization Summary (Post-Implementation)

Generated after implementing the preserve-animations optimization plan.

## Build Status

- `npx next build` — **passed** (TypeScript clean)
- `npm run test:performance` — **passed** (2/2 vitals helper tests)
- `npm run perf:bundle` — report at `performance-reports/bundle-report.json`

## Bundle Metrics (after)

| Metric | Value |
|--------|-------|
| Total JS chunks | 8420.6 KB (184 files) |
| Largest chunk | 503.1 KB |

Note: Total JS includes all route chunks (admin + storefront). Initial marketing route chunks are significantly smaller due to deferred `SiteHeader`, deferred preloader, and scoped Font Awesome/search CSS.

## Changes by Phase

### Phase A — Bugs & deduplication
- Fixed undefined `shouldDowngradeCanvasEffect` → wired `downgradeSiteBackgroundForPolicy`
- Added `CapabilityInit` on storefront for `data-reduced-paint` / `data-effects-tier`
- Integrated capability policy in `applyVisualEffects`
- Removed duplicate hydration `applyVisualEffects` (ThemeEngineProvider owns init)
- Merged duplicate `THEME_CHANGE_EVENT` listeners in `ThemeEffectsClient`

### Phase B — Bundle & fonts
- Deferred `SiteHeader` (`SiteHeaderShell` SSR + `DeferredSiteHeader` dynamic)
- `next/font` for default preset fonts (Plus Jakarta Sans + Amiri)
- Font Awesome moved from `globals.css` to header-builder + admin CSS
- Search CSS deferred to `DeferredSearchCommand`
- `SitePreloaderHost` deferred

### Phase C — Animation runtime
- Canvas loops pause when tab hidden (`runCanvasLoop`)
- Particles: spatial grid O(n), tiered counts
- Vortex: 150 points/arm, thicker strokes
- Noise: reused ImageData buffer
- Circuit: precomputed elbow paths (no per-frame Math.random)
- Cursors: `translate3d` positioning, idle rAF stop, full listener cleanup
- Text effects: GSAP kill + WeakMap cleanup for event listeners
- Scroll observers: 150ms debounce, `requestIdleCallback`, skip when hidden

### Phase D — Images (LCP)
- `ProductListingCard`, `ProductGallery`, `CollectionDetailHero`, `HeaderBrand`, `ContentCard` → `next/image` with `sizes`

### Phase E — React renders
- `VisualExperienceStaticContext` for animation consumers
- `React.memo` on `ProductListingCard`, `ContentCard`
- 150ms debounced catalog filter (`debouncedQ`)
- `ui/card.tsx` reverted to server component (admin styles via `.admin-shell .az-ui-card`)

### Phase F — CSS & network
- Removed duplicate `site-preloader.css` imports (marketing + admin preloader page)
- Google Analytics → `next/script` `afterInteractive`
- `loadListingRecords` wrapped in React `cache()`

## Validation Notes

- Export runtime metrics from Admin → Performance or dev Perf panel to `performance-reports/latest-metrics-export.json` for full vitals comparison.
- Theme studio: verify all backgrounds, cursors, and text effects visually unchanged.
- `prefers-reduced-motion` and low-end tier downgrades preserve mood via grid/static fallbacks.
