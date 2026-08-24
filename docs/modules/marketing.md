# Marketing module (`marketing`)

**Status:** Campaign Intelligence Platform — Meta Ads → Google Ads → LinkedIn (incremental)

## Primary principle

This system is a **first-party Marketing Intelligence and Advertising Management platform**. Social media publishing is an optional integration, not the purpose or architectural center of the Marketing module.

## Classification

| Layer | Value |
|-------|-------|
| Module ID | `marketing` |
| Package | `src/modules/marketing/` |
| Admin | `/admin/marketing/*` |
| APIs | `/api/marketing/oauth/*`, `/api/marketing/webhooks/*`, `/api/marketing/jobs/run`, `/api/marketing/attribution/capture`, `/api/marketing/events` |

## Core chain

`MarketingSource → Internal Campaign → Ad/Creative → Landing Page → Visitor → Event → Lead → Conversion`

**Internal `MarketingCampaign` is the business master.** External Meta/Google/LinkedIn campaigns are linked via `MarketingCampaignProviderBinding`.

## Specs

- [Canonical DTO Specification](./marketing-canonical-dto-spec.md)
- [Provider SDK Specification](./marketing-provider-sdk-spec.md)
- [Event & Job Specification](./marketing-event-job-spec.md)

## Feature flags

- `MARKETING_CORE_ENABLED` (default on when module enabled)
- `MARKETING_CONNECTION_ENABLED`
- `MARKETING_ADVERTISING_ENABLED` (default **on**)
- `MARKETING_ANALYTICS_ENABLED` (default **on**)
- `MARKETING_TRACKING_ENABLED` (default **on**)
- `MARKETING_LEADSYNC_ENABLED` (default **on**)
- `MARKETING_PUBLISHING_ENABLED` (default **off** — optional social publishing)

## Admin navigation

- Marketing Overview
- Campaigns
- Ad Accounts
- Advertising Platforms
- Traffic & Attribution
- Conversions
- Leads
- Landing Pages
- UTM & Campaign URLs
- Analytics & Reports
- Tracking
- Automation
- Integrations
- Settings
- Social Publishing (optional)

## Credentials (admin dashboard)

Configure provider credentials under **Marketing → Advertising Platforms** (encrypted at rest):

- Meta: Client ID, Client secret, App secret, Webhook verify token, Pixel ID, CAPI access token
- LinkedIn: Client ID, Client secret
- Google Ads: Client ID, Client secret (+ developer token / login customer id in metadata)

No day-to-day `META_*` / `LINKEDIN_*` / `GOOGLE_ADS_*` env vars required for OAuth credentials.

## Privacy

- Anonymous visitor tokens are never derived from PII
- Identity boundary at lead/conversion only
- Retention policies under Marketing → Settings
- Consent: set `NEXT_PUBLIC_MARKETING_REQUIRE_CONSENT=1` to require explicit GRANTED before capture

## MVP metrics (no ROI/ROAS yet)

Spend, visitors, leads, conversions, CPL, conversion rate, cost per conversion.
