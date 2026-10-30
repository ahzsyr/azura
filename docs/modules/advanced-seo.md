# Advanced SEO module (`advanced-seo`)

**Status:** Logical extraction (M6) — pages/APIs/actions gated; Prisma + `features/seo/platform` still shared Core code.

## Classification

| Layer | Value |
|-------|-------|
| Module ID | `advanced-seo` |
| Package | `src/modules/advanced-seo/` |
| Admin | Enumerated Advanced prefixes under `/admin/seo/*` (never whole `/admin/seo`) |
| Public | None (`publicRoutes: []`) |

## Availability

| Layer | Behavior |
|-------|----------|
| Profile | Listed on **enterprise** only today; omitted profiles prune Advanced `navItemIds` via generator |
| Runtime-inactive | Per-page `notFound()`; Advanced APIs `403`; Advanced actions refuse before writes |
| Ledger outage | Fail-closed (`decideAdvancedSeoMutation("ledger_unavailable")`) |
| Builtin Remove | Hidden + refused (M5 policy) |

## What stays Core

- Basic SEO admin (overview, audits, sitemap, robots, redirects, structured data, tasks, …)
- Shared Search Engines page (`/admin/seo/integrations`) — Advanced configure tab soft-disabled when inactive
- Public/cron reads: `api/seo/head`, `llms`, `indexnow-key`, `analytics/run`, `integrations/run`

## Inventory

Full page/API/action tables: [modules-manager-m6-advanced-seo-phase.md](../azura-v2/plans/modules-manager-m6-advanced-seo-phase.md) appendix.

## Tests

`npm run test:advanced-seo` — pure four-state decide, static guard pins, profile prune + disabled-prefix survival.
