# Marketing Event & Job Specification

## Event bus

In-process typed bus: `marketingEventBus` (`on` / `emit`).

### Canonical events

- `CMS_POST_PUBLISHED`
- `CMS_POST_UPDATED`
- `CMS_PAGE_PUBLISHED`
- `MEDIA_UPLOADED`
- `FORM_SUBMITTED`
- `LEAD_CREATED`
- `PUBLISH_REQUESTED`
- `PUBLISH_COMPLETED`
- `PUBLISH_FAILED`
- `ANALYTICS_SYNC_REQUESTED`
- `ANALYTICS_SYNC_COMPLETED`
- `WEBHOOK_RECEIVED`
- `TOKEN_REFRESH_REQUIRED`
- `TOKEN_REFRESH_COMPLETED`
- `CONNECTION_HEALTH_CHANGED`

## Provider lifecycle

```text
discovered → configured → connected → healthy
                                 ↘ degraded
connected/healthy/degraded → disconnected → disabled → retired
```

Transitions are validated by `canTransitionLifecycle` / `assertLifecycleTransition`.

## Job types

- `publish`
- `analytics_sync`
- `tracking_sync`
- `lead_sync`
- `webhook_processing`
- `token_refresh`
- `media_upload`

## Publish workflow stages

```text
queued
  → upload_media
  → publish_content
  → fetch_result
  → record_outcome
  → emit_event
  → completed | failed
```

## Idempotency

Every externally retryable operation requires a deterministic `idempotencyKey`:

| Operation | Key pattern |
|-----------|-------------|
| Manual/auto publish | `manual:...` / `auto-publish:post:{id}` |
| Webhook processing | `webhook:{eventId}` |
| Lead import | `meta-lead:{leadId}` or provider-specific |
| Tracking | `form:{submissionId}` / `lead:{inquiryId}` |

`MarketingJob.idempotencyKey` and `MarketingLeadEvent.idempotencyKey` are unique.

## Retry / backoff

- Failed jobs reschedule with `providerQuotaService.adaptiveBackoffMs(attempt)`
- Exhausted after `maxAttempts` (default 5)
- Rate-limit responses update quota retry-after state

## Webhooks

1. Ingress receives raw body + headers
2. Signature verification (provider adapter or shared HMAC fallback)
3. Normalize to `CanonicalWebhookEvent`
4. Persist `MarketingWebhookEvent` (dedupe by provider + externalEventId)
5. Emit `WEBHOOK_RECEIVED`
6. Enqueue `webhook_processing` job
