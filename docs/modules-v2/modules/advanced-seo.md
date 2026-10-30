# Module: Advanced SEO (`advanced-seo`)

## Classification

| Field | Value |
|-------|-------|
| Module ID | `advanced-seo` |
| Package kind | `app` |
| Source | `src/modules/advanced-seo/` (guards/manifest; many pages still under shared SEO feature trees) |
| Manifest | `src/modules/advanced-seo/manifest.ts` |
| Label | Advanced SEO |
| Version | `1.0.0` |
| Compatibility | `>=0.1.0` |
| Extraction status | Logical gating (M6) + **Phase 7 RFC Approved** ([../plans/phase-7-extraction-advanced-seo.md](../plans/phase-7-extraction-advanced-seo.md)); physical relocate of `features/seo` / Search Intelligence **deferred** (**R3-gated** — [../plans/r3-follow-on-decision-gates.md](../plans/r3-follow-on-decision-gates.md)) |

## Manifest summary

| Field | Value |
|-------|-------|
| `requiredPackages` | `[]` |
| `requiredPresets` | `[]` |
| `requiredCapabilities` | `[]` |
| `adminRoutes` | Enumerated Advanced prefixes under `/admin/seo/*` — **never** whole `/admin/seo` |
| `publicRoutes` | `[]` |
| `navItemIds` | Advanced SEO nav ids (templates, metadata, schemas, rules, google, 404, search-operations, search-intelligence, …) |
| `contributedBlockTypes` | `[]` |
| `permissions` (labels) | `advanced-seo.read`, `advanced-seo.manage` |

### Why admin routes are enumerated

Including `/admin/seo` as a single prefix would disable **Basic SEO** when Advanced SEO is profile-omitted. The manifest lists only Advanced subtrees so Basic SEO survives independently.

## Availability

| Layer | Behavior |
|-------|----------|
| Profile | Listed on **enterprise** by default among current profiles; omitted profiles prune Advanced `navItemIds` via generator |
| Runtime-inactive | Per-page `notFound()`; Advanced APIs `403`; Advanced actions refuse before writes |
| Ledger outage | Fail-closed (`decideAdvancedSeoMutation("ledger_unavailable")`) |
| Builtin Remove | Hidden + refused (M5 policy) |

## What stays Core (not gated by this Module)

- Basic SEO admin (overview, audits, sitemap, robots, redirects, structured data, tasks, …)
- Shared Search Engines page (`/admin/seo/integrations`) — Advanced configure tab soft-disables when Module inactive
- Public/cron reads such as `api/seo/head`, `llms`, `indexnow-key`, analytics/integrations runners as applicable

## Key code

| Concern | Path |
|---------|------|
| Manifest | `src/modules/advanced-seo/manifest.ts` |
| Ingress decision | `src/modules/advanced-seo/ingress-decision.ts` |
| Guards | `src/modules/advanced-seo/guard.ts` |
| Tests | `src/modules/advanced-seo/__tests__/*` |
| Phase inventory | [`docs/azura-v2/plans/modules-manager-m6-advanced-seo-phase.md`](../../azura-v2/plans/modules-manager-m6-advanced-seo-phase.md) |
| Migration notes | [`docs/azura-v2/packages/seo-app-migration.md`](../../azura-v2/packages/seo-app-migration.md) |

## Tests

`npm run test:advanced-seo` — pure four-state decide, static guard pins, profile prune + disabled-prefix survival.

## Operator notes

1. Use a profile that includes `advanced-seo` (typically enterprise) and redeploy.
2. Enable under Admin → Modules.
3. Soft Uninstall / deactivate turns off Advanced admin surfaces; Basic SEO and public head/llms/indexnow remain.
4. Removing Advanced SEO from the product surface for a deployment means omitting it from the profile and redeploying — not Modules Manager Remove.
