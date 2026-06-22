# Performance Gates Summary

Generated for the performance roadmap gates.

## Gate: Post-Middleware Baseline

Artifact: `performance-reports/cwv-baseline-post-middleware.json`

| Route | Status | TTFB |
|-------|--------|------|
| `/en` | 500 | 712 ms |
| `/en/products` | 500 | 2546 ms |
| `/en/products/alfa-2-4-5ghz-indoor-antenna` | 500 | 3376 ms |
| `/en/collections/networking` | 500 | 2153 ms |

**Middleware-only TTFB delta:** not computable from the saved artifacts because no `cwv-baseline-pre.json` was captured before PR-1. The post-middleware file exists as required, but it contains local 500 error pages, so it should not be used as a production-quality performance reference.

## Gate A: Dependency Graph

Artifact: `docs/performance/locale-layout-dependency-graph.md`

Status: complete.

The document includes:

- Full `loadLocaleLayoutData()` loader graph.
- Field decomposition table with Owner, Consumer Count, Criticality, Replacement Strategy, and Removal Risk.
- Search Semantics Contract.
- Approved safe moves for PR-4.

## Gate: Post-Layout Baseline

Artifact: `performance-reports/cwv-baseline-post-layout.json`

| Route | Post-Middleware TTFB | Post-Layout TTFB | Delta |
|-------|----------------------|------------------|-------|
| `/en` | 712 ms | 606 ms | -106 ms |
| `/en/products` | 2546 ms | 851 ms | -1695 ms |
| `/en/products/alfa-2-4-5ghz-indoor-antenna` | 3376 ms | 795 ms | -2581 ms |
| `/en/collections/networking` | 2153 ms | 781 ms | -1372 ms |

**Attribution caveat:** these deltas are local 500-response measurements, not valid user-facing CWV measurements. They are useful only as proof that the capture pipeline wrote the required files. Re-run the baselines against 2xx production or staging routes before using these deltas for performance claims.

## Gate B: Catalog Shadow Parity

Artifact: `performance-reports/catalog-isr-shadow-parity.json`

Status: passed.

| Page | Result | Notes |
|------|--------|-------|
| `products` | Passed | Default SSR payload and ISR-style default payload matched. |
| `collections` | Passed | Default SSR payload and ISR-style default payload matched. |

Rollback path: revert `products/page.tsx` and `collections/page.tsx` to `export const dynamic = "force-dynamic"` and restore page-level `searchParams` filtering. The shadow parity script remains available via `npm run perf:catalog-shadow` for re-validation.

## Gate C: Performance Regression Budget

Artifact: `performance-reports/performance-regression-budget.json`

Status: passed with skipped route-metric comparisons.

The gate skipped TTFB/LCP/INP comparisons because the reference baseline (`cwv-baseline-post-layout.json`) contains 500 responses while the current baseline contains 200 responses. Bundle comparison also requires a successful production build; the current bundle report was generated without production chunks.

Required follow-up before production sign-off:

1. Resolve the Prisma Windows DLL `EPERM` build blocker.
2. Run a production build.
3. Run `npm run perf:bundle`.
4. Capture fresh 2xx baselines for post-layout and post-catalog ISR states.
5. Re-run `npm run perf:regression`.
