# Performance optimization report (Phases 1–7)

This document summarizes navigation, rendering, and runtime improvements across the seven optimization phases, how to validate them, and known remaining bottlenecks.

## Success criteria mapping

| Target | Phase(s) | How to verify |
|--------|----------|---------------|
| Faster navigation | 1, 3, 5 | Admin → Performance → avg/P95 route transition; dev **Perf** panel |
| Lower error rate | 1, 7 | Performance dashboard → Route failures; chunk errors in console |
| Smoother UX | 3, 4, 6 | No fullscreen preloader block; theme/effects persist across routes |
| Smaller runtime cost | 5, 6 | `npm run perf:bundle`; deferred client shell; route-scoped CSS |
| Stable page transitions | 1, 3, 4 | Previous page stays visible; 90 ms skeleton overlay; 150 ms view fade |

## Phase summary

### Phase 1 — Navigation & loading

- Removed competing link interceptors and page remounts (`key={pathname}`).
- Sync `loading.tsx` skeletons; `DocumentLangScript` fixes `lang`/`dir` hydration mismatch.
- Navigation preloader no longer blocks in-app navigation.

**Measured impact:** Route transitions no longer blank the shell; fewer hydration warnings.

### Phase 2 — App Router & data fetching

- `loadLocaleLayoutData` batches layout fetches in one `Promise.all`.
- React `cache()` + `unstable_cache` on site settings and comparison shell.
- Locale layout `revalidate = 300`.

**Measured impact:** Lower TTFB on repeat visits; less server waterfall per navigation.

### Phase 3 — Loading UX & transitions

- `NavigationProgress` top bar; progressive overlay after 90 ms.
- 20 route-level `loading.tsx` files; 150 ms scoped view transitions.

**Measured impact:** Perceived navigation latency drops; LCP element often remains visible during transition.

### Phase 4 — Theme during navigation

- Stopped destroying visual effects on every pathname change.
- Deduped theme hydration; shared `apply-site-visual-effects` helper.

**Measured impact:** No theme flash or effect restart cost on internal links.

### Phase 5 — Client runtime & bundle size

- Footer moved to server component; framer-motion removed from critical navigation path.
- Deferred shell: scroll reveal, comparison drawer, navigation chrome, motion primitives.

**Measured impact:** Smaller initial client JS; faster hydration on marketing routes.

### Phase 6 — CSS, effects, rendering

- Split CSS: effects, builder, admin, catalog bundles out of `globals.css`.
- Scoped theme transitions to `html.theme-transitioning *` only.
- `content-visibility` / `contain` on catalog cards; canvas backgrounds downgrade on weak devices.

**Measured impact:** Lower paint/GPU cost on scroll; smaller global CSS for admin routes.

### Phase 7 — Monitoring & validation

- `window.__AZ_RUNTIME_METRICS__` hub: LCP, CLS, INP, hydration, route transitions, failures.
- Admin **Performance** page + dev **Perf** panel; baseline compare via localStorage.
- Scripts: `perf:bundle`, `perf:routes`, `perf:validate`.

## Validation workflow

1. **Storefront browsing** — Open the site, click Products → Collections → a PDP → Home.
2. **Set baseline** — Dev **Perf** panel or Admin → Performance → **Set baseline**.
3. **Compare** — After changes, check Before vs after deltas.
4. **Export** — **Export JSON** → save as `performance-reports/latest-metrics-export.json`.
5. **Build analysis** — `npm run build && npm run perf:bundle && npm run perf:validate`.
6. **Slow routes** — `npm run perf:routes -- performance-reports/latest-metrics-export.json`.

## Budget targets (`vitals-budgets.ts`)

| Metric | Good | Poor |
|--------|------|------|
| LCP | ≤ 2500 ms | > 4000 ms |
| CLS | ≤ 0.10 | > 0.25 |
| INP | ≤ 200 ms | > 500 ms |
| Hydration (DCL) | ≤ 1800 ms | > 3500 ms |
| Avg route transition | ≤ 400 ms | > 1200 ms |
| P95 route transition | ≤ 800 ms | > 2000 ms |

## Tradeoffs

| Choice | Benefit | Cost |
|--------|---------|------|
| Progressive skeleton overlay (90 ms delay) | Avoids flicker on fast navigations | Very slow RSC responses show stale content longer |
| Effects downgrade on weak devices | Stable scroll, lower GPU | Fewer animated backgrounds on low-end hardware |
| Deferred client shell (`ssr: false`) | Smaller hydration tree | Slight delay before scroll-reveal / progress bar attach |
| localStorage metrics sync | Admin dashboard reads storefront tab | Not suitable for production RUM at scale |
| Dev-only Perf panel | Zero prod overhead | Must use Admin page or export for CI metrics |

## Remaining bottlenecks

1. **`SiteHeader`** — Still eager client component; largest remaining marketing chrome cost.
2. **Catalog product index JSON** — Large static payloads on listing routes; consider edge caching or pagination caps.
3. **Framer Motion / GSAP** — Still loaded for admin and optional motion blocks; not on critical nav path but present in builder previews.
4. **Font Awesome in `globals.css`** — Full icon CSS in base layer; subset or SVG icons would shrink CSS further.
5. **Theme effects engine** — Full tier still runs canvas backgrounds on capable desktops; monitor `effectCostMs` on heavy presets.
6. **No server-side RUM** — Metrics are client-local; production monitoring needs external APM (Vercel Analytics, Sentry, etc.).

## Regression prevention

- Run `npm run test:performance` (vitals helpers unit tests).
- After substantive client changes: `npm run perf:bundle` and compare `performance-reports/bundle-report.json`.
- Keep route transition P95 under budget on: `/`, `/products`, `/collections`, representative CMS slug.
- Error boundary (`error.tsx`) records render failures into metrics — watch failure count after deploys.
