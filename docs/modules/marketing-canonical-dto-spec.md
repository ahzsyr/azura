# Marketing Canonical DTO Specification

Provider-independent contracts used by orchestration, jobs, persistence, and admin UI.

## Mapping rule

```text
External API payload
  → Provider DTO (provider SDK/mapper only)
  → Canonical DTO (platform contracts)
  → Domain / Database
```

Adapters must never pass raw provider payloads into shared services.

## CanonicalPublishRequest

| Field | Type | Notes |
|-------|------|-------|
| idempotencyKey | string | Required; stable across retries |
| providerId | string | Registry id |
| connectionId | string | MarketingConnection id |
| accountId | string | External or internal account binding |
| assetId | string? | Optional MarketingAsset id |
| text | string | Caption/body |
| mediaUrls | string[]? | Public media URLs |
| linkUrl | string? | Optional link attachment |
| scheduledAt | string? | ISO datetime |
| metadata | object? | Non-provider-specific hints |

## CanonicalPublishResult

| Field | Type |
|-------|------|
| ok | boolean |
| externalPostId | string? |
| permalink | string? |
| message | string? |
| providerPayload | unknown? | Debug only; not persisted as SoT |

## CanonicalAnalyticsMetric

| Field | Type |
|-------|------|
| providerId | string |
| accountId | string |
| metric | reach \| impressions \| engagement \| likes \| shares \| comments \| followers \| clicks \| conversions |
| value | number |
| periodStart | ISO string |
| periodEnd | ISO string |
| dimensions | Record<string,string>? |

## CanonicalTrackingEvent

| Field | Type |
|-------|------|
| idempotencyKey | string |
| name | ProductViewed \| LeadGenerated \| Purchase \| FormSubmitted \| Search \| NewsletterSignup \| PageView |
| occurredAt | ISO string |
| source | string |
| user | { email?, phone?, externalId? }? |
| properties | object? |
| value | number? |
| currency | string? |

## CanonicalLeadEvent

| Field | Type |
|-------|------|
| idempotencyKey | string |
| providerId | string |
| externalLeadId | string |
| formId | string? |
| name/email/phone | string? |
| fields | Record<string,string> |
| receivedAt | ISO string |
| raw | unknown? |

## CanonicalWebhookEvent

| Field | Type |
|-------|------|
| providerId | string |
| eventType | string |
| externalEventId | string? |
| occurredAt | ISO string |
| payload | unknown |
| signatureValid | boolean |

## CanonicalAsset

| Field | Type |
|-------|------|
| kind | page \| company \| businessProfile \| adAccount \| leadForm \| mediaLibrary \| catalogue \| pixel \| channel |
| providerAssetType | string |
| externalId | string |
| displayName | string |
| metadata | object? |

Provider-specific asset labels are mapped into `kind` before leaving the mapper layer.
