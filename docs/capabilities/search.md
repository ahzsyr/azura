# Search capability

Owner: `src/capabilities/search/`

## Public API

```ts
import { searchCapability } from "@/capabilities/search";

await searchCapability.ensureRuntimeConfig(locale);
await searchCapability.search({ q, locale, kinds, facetFilters });
await searchCapability.indexer.upsertRecord(record);
await searchCapability.rebuildAll();
```

## Portal directory profile

Team and partner directory blocks query scoped search:

```
GET /api/search?kinds=team_member&scope=<directorySlug>&q=...&facets={"departmentId":["..."]}
GET /api/search?kinds=partner&scope=<programSlug>&q=...&facets={"categorySlug":["..."]}
```

## HTTP routes (canonical split)

| Audience | Base path | Notes |
|----------|-----------|-------|
| Public storefront | `/api/search/*` | `searchService`, capability gate |
| Admin (UI calls `/api/admin/search`) | `/api/manage/search/*` | Rewritten from `/api/admin/*` in `next.config.ts`; uses `searchEngine` + admin payload mapping |

Shared handlers: `handleSearchAutocomplete`, `createSearchDiscoveryRoute` in `src/capabilities/search/api/`. Main search GET remains separate engines by design.

Index hooks run from `presets/team-member/actions.ts` and `presets/partner/actions.ts` on publish/save.
