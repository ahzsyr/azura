# Marketing module (`marketing`)

**Status:** Foundation (Phase 1) — Meta + LinkedIn wave 1

## Classification

| Layer | Value |
|-------|-------|
| Module ID | `marketing` |
| Package | `src/modules/marketing/` |
| Admin | `/admin/marketing/*` |
| APIs | `/api/marketing/oauth/*`, `/api/marketing/webhooks/*`, `/api/marketing/jobs/run` |

## Specs

- [Canonical DTO Specification](./marketing-canonical-dto-spec.md)
- [Provider SDK Specification](./marketing-provider-sdk-spec.md)
- [Event & Job Specification](./marketing-event-job-spec.md)

## Feature flags

- `MARKETING_CORE_ENABLED` (default on when module enabled)
- `MARKETING_CONNECTION_ENABLED`
- `MARKETING_PUBLISHING_ENABLED`
- `MARKETING_ANALYTICS_ENABLED`
- `MARKETING_TRACKING_ENABLED`
- `MARKETING_LEADSYNC_ENABLED`

## Credentials (admin dashboard)

Configure provider credentials under **Marketing → Social Platforms** (encrypted at rest):

- Meta: Client ID, Client secret, App secret, Webhook verify token, Pixel ID, CAPI access token
- LinkedIn: Client ID, Client secret

No `META_*` / `LINKEDIN_*` environment variables are required for day-to-day operation.
