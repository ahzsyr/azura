# Hydration Audit

Generated at 2026-06-20T09:33:38.464Z.

## Summary

PR-4 moved these providers out of the global locale layout:

- Product quick view: now scoped to products and collections layouts.
- Comparison provider: now scoped to products, collections, and compare layouts.
- Account session provider: now scoped to account layout.

## Initial Hydration Map

| Component | Owner | Initial Mount | Above Fold | Recommendation |
| --- | --- | --- | --- | --- |
| NextIntlClientProvider | locale layout | Yes | Critical | Keep; future namespace split |
| ThemeEngineProvider | ThemeProvider | Yes | Critical | Keep; future effect scoping |
| ThemeEffectsClient | ThemeProvider | Yes | Medium | Measure before deferring |
| MotionRuntimeHost | locale layout | Yes | Low | Keep but idle-gate observers |
| NavigationMotionLifecycle | locale layout | Yes | Low | Keep |
| ThemePerformanceMonitorDeferred | locale layout | Deferred | Low | Keep for RUM |
| DeferredSiteHeader | locale layout | Deferred | Critical | Already deferred |
| GlobalAnnouncementBar | locale layout | Conditional | Critical when enabled | Keep |
| ProductQuickViewProvider | products/collections layouts | Route-scoped | On-demand | Moved out of global layout |
| ComparisonProvider | products/collections/compare layouts | Route-scoped | On-demand | Moved out of global layout |
| AccountSessionProvider | account layout | Route-scoped | On-demand | Moved out of global layout |
| DeferredGlobalPopupHost | locale layout | Deferred | Lazy | Future on-demand settings fetch |
| DeferredWhatsAppFab | locale layout | Deferred | Lazy | Future on-demand settings fetch |
| PersonalizationPanelLazy | locale layout | Deferred | Lazy | Future on-demand settings fetch |

## Next Candidates

1. Measure `ThemeEngineProvider` and `ThemeEffectsClient` with route-level bundle data before changing behavior.
2. Split `NextIntlClientProvider` messages by namespace only after catalog/search/header semantics are documented.
3. Move popup, WhatsApp, and personalization settings fetches into their deferred hosts.
