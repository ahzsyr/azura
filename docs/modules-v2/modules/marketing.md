# Module: Marketing (`marketing`)

## Classification

| Field | Value |
|-------|-------|
| Module ID | `marketing` |
| Package kind | `app` |
| Source | `src/modules/marketing/` |
| Manifest | `src/modules/marketing/manifest.ts` |
| Label | Marketing |
| Version | `1.0.0` |
| Compatibility | `>=0.1.0` |

## Product principle

First-party **Marketing Intelligence and Advertising Management** platform. Social publishing is optional, not the architectural center.

## Manifest summary

| Field | Value |
|-------|-------|
| `requiredPackages` | `[]` |
| `requiredPresets` | `[]` |
| `requiredCapabilities` | `analytics` |
| `adminRoutes` | `/admin/marketing` |
| `publicRoutes` | `/api/marketing` |
| `navItemIds` | Many marketing-* items (dashboard, campaigns, ad accounts, platforms, attribution, …) |
| `contributedBlockTypes` | `[]` |
| `permissions` (labels) | `marketing.read`, `marketing.manage` |

## Extra public binding — `/a`

The campaign short-link handler is `GET /a` (`src/app/a/route.ts`). It is **not** listed in `publicRoutes`.

When Marketing is **profile-omitted**, the profile generator injects `/a` into `disabledPublicPrefixes` via `MODULE_EXTRA_DISABLED_PUBLIC`.

When Marketing is included but **runtime-inactive**, Node ingress denies short-link / attribution side effects without relying solely on that middleware list.

## Availability

| Layer | Behavior |
|-------|----------|
| Profile | Must list `marketing` (generate requires capability `analytics`) |
| Runtime-inactive | Fail-closed Node ingress: no attribution cookie, no beacon/event writes, no OAuth upsert, webhook challenge denied as configured |
| Env kill | `MARKETING_CORE_ENABLED=0` denies ingress even if SiteFeature is on |
| Ledger outage | Mutation ingress fail-closed |
| Deactivate | Flags only — Marketing domain data retained |

## Ingress implementation (current)

| Piece | Path |
|-------|------|
| Fail-closed access | `resolveModuleIngressAccess("marketing")` |
| Decision helper | `src/modules/marketing/ingress-decision.ts` |
| Guard wiring | `src/modules/marketing/ingress-guard.ts` |
| Short-link | `src/modules/marketing/ingress/short-link.ts` |
| Handlers | `src/modules/marketing/ingress/handlers.ts` |

## Domain chain

`MarketingSource → Internal Campaign → Ad/Creative → Landing Page → Visitor → Event → Lead → Conversion`

Internal `MarketingCampaign` is the business master. External provider campaigns bind via `MarketingCampaignProviderBinding`.

## Feature flags (env)

| Flag | Default sense |
|------|----------------|
| `MARKETING_CORE_ENABLED` | On when Module enabled (unless set `0`) |
| `MARKETING_CONNECTION_ENABLED` | Connection features |
| `MARKETING_ADVERTISING_ENABLED` | Default on |
| `MARKETING_ANALYTICS_ENABLED` | Default on |
| `MARKETING_TRACKING_ENABLED` | Default on |
| `MARKETING_LEADSYNC_ENABLED` | Default on |
| `MARKETING_PUBLISHING_ENABLED` | Default **off** |

## Admin navigation (product areas)

Overview, Campaigns, Ad Accounts, Advertising Platforms, Traffic & Attribution, Conversions, Leads, Landing Pages, UTM & Campaign URLs, Analytics & Reports, Tracking, Automation, Integrations, Settings, Social Publishing (optional).

## Specs (detailed product contracts)

Under `docs/modules/`:

- [marketing-canonical-dto-spec.md](../../modules/marketing-canonical-dto-spec.md)
- [marketing-provider-sdk-spec.md](../../modules/marketing-provider-sdk-spec.md)
- [marketing-event-job-spec.md](../../modules/marketing-event-job-spec.md)
- [marketing-attribution-spec.md](../../modules/marketing-attribution-spec.md)
- [marketing-campaign-spec.md](../../modules/marketing-campaign-spec.md)

## Privacy notes

- Anonymous visitor tokens are never derived from PII.
- Identity boundary at lead/conversion only.
- Consent: `NEXT_PUBLIC_MARKETING_REQUIRE_CONSENT=1` requires explicit GRANTED before capture.

## Operator notes

1. Profile must include `marketing` + capability `analytics`.
2. Enable under Admin → Modules.
3. Configure provider credentials under Marketing → Advertising Platforms (encrypted at rest).
4. Disable to stop ingress side effects; historical analytics rows remain.
