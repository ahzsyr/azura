# Marketing Provider SDK Specification

## Goals

Keep adapters thin. Isolate auth, pagination, retries, and vendor API quirks inside provider SDKs.

## Package layout

```text
providers/<id>/
  manifest.ts
  sdk/
    api.ts
    auth helpers (optional)
  oauth/            # optional provider-specific OAuth helpers
  mapper/
    index.ts        # provider DTO ↔ canonical DTO
  adapter/
    index.ts        # MarketingProviderAdapter implementation
```

## Responsibilities

### Manifest (static)

Immutable provider metadata: capabilities, oauth config, supported assets/media, versioning, health check ids.

### SDK

- HTTP calls to provider APIs
- Auth header/token attachment
- Pagination
- Rate-limit response parsing (feeds ProviderQuotaService)
- No persistence, no event bus emits

### Mapper

- Convert SDK responses into Canonical DTOs
- Convert Canonical publish/tracking requests into SDK payloads
- Own all provider field naming

### Adapter

- Implements `MarketingProviderAdapter`
- Capability exposure via `capabilities()`
- Optional methods only for supported capabilities
- Uses connection lifecycle helpers for sealed tokens
- Emits no CMS-specific logic

## Versioning

Each manifest includes:

- `apiVersion`
- `sdkVersion`
- `minimumSupportedVersion`
- `deprecatedAfter`

Compatibility is checked by `checkProviderCompatibility()` before operational use.

## Retry / quota boundary

- SDKs may surface retry-after headers
- Adaptive backoff and daily/burst limits live in `ProviderQuotaService`
- Adapters must not implement private throttling strategies

## Auth boundary

- OAuth start/callback routes are platform-owned (`/api/marketing/oauth/...`)
- Tokens sealed with shared secret-seal helper
- Adapters read tokens only through `getUnsealedAccessToken(connectionId)`
