# Search Framework

Schema-driven, content-type-agnostic search for the Catalog ecosystem.

## Modules (`src/features/search-framework/`)

| Class / export | Role |
|----------------|------|
| `SearchRegistry` | Registers `SearchProvider` instances by `kind` and `SearchEntityType` |
| `SearchProvider` | Defines how a content kind is indexed (`shouldIndex`, `buildRecords`) |
| `SearchIndexer` | Persists `SearchIndexRecord` → `SearchDocument` |
| `SearchQueryBuilder` | Sanitizes input, resolves entity types / facets, builds `SearchQueryPlan` |
| `SearchFilterEngine` | Public vs admin visibility, `contentTypeSlug`, kind filters |
| `SearchRankingEngine` | FULLTEXT + LIKE merge, boost, typo scoring |
| `SearchResultMapper` | Maps DB rows → `SearchResult` / API payloads |
| `SearchEngine` | Orchestrates query → repository → filter → rank → map → analytics |
| `SearchAnalytics` | Non-blocking query / zero-result events |
| `SearchSettingsManager` | Resolves debounce, limits from site settings |

## Phase 3 — Dynamic catalog discovery

`discoverCatalogSearchSources()` loads from the database:

- **Content types** — `ContentType` where `isEnabled` and `adminConfig.search.enabled !== false`
- **Content collections** — published `ContentCollection` for searchable types
- **Catalog items** — published `ContentItem` for those types (includes packages, listings, projects, offerings, …)
- **Pages / posts** — `CMS_PAGE`, `POST`
- **Product catalog** — `CATALOG_PRODUCT`, `CATALOG_COLLECTION`, `CATALOG_CATEGORY` when enabled in site `search.catalog`

New types from **Admin → Catalog → Content** are searchable automatically when the type is enabled (opt out via `adminConfig.search.enabled: false`).

```json
{
  "search": {
    "enabled": true,
    "indexLandingPage": true,
    "boost": 1
  }
}
```

Site settings (`search.catalog`):

```json
{
  "search": {
    "catalog": {
      "products": true,
      "collections": true,
      "categories": true
    }
  }
}
```

`GET /api/search/discovery` — filter chips for the search modal.

## Phase 4 — Flexible indexing

Per **Content Type**, configure which fields are indexed via `adminConfig.search.index`:

| Field key | Sources |
|-----------|---------|
| `title` | `titleEn` / `titleAr` |
| `name` | attributes.name, productTitle, or title |
| `slug` | item slug |
| `summary` | excerpt |
| `description` | description |
| `content` | description + builder blocks JSON |
| `tags` | attributes.tags, metadata.tags |
| `categories` | attributes.categories, metadata |
| `collections` | linked ContentCollection |
| `custom_fields` | fieldSchema fields with `search: true` |
| `seo_fields` | `SeoMeta` for ContentItem |
| `metadata` | item.metadata JSON |

Example:

```json
{
  "search": {
    "enabled": true,
    "boost": 1,
    "index": {
      "fields": {
        "title": { "weight": 3 },
        "summary": true,
        "seo_fields": true,
        "tags": { "facet": true },
        "custom:duration": { "weight": 1.5 }
      },
      "exclude": ["metadata"]
    }
  }
}
```

### Extension API

```typescript
import { searchIndexExtensionRegistry } from "@/features/search-framework";

searchIndexExtensionRegistry.register({
  id: "my-plugin",
  priority: 50,
  apply(ctx, payload) {
    payload.body += "\nextra corpus";
  },
});
```

Register custom extractors:

```typescript
import { searchIndexFieldRegistry } from "@/features/search-framework";

searchIndexFieldRegistry.register("ext:my-plugin:field", (ctx, key) => ({
  key,
  text: "…",
  weight: 1,
}));
```

## Phase 5 — Admin settings panel

**Admin → Settings → Search** (`/admin/settings/search`)

Ribbon tabs: General, Search Sources, Ranking, Filters, Autocomplete, Appearance, Analytics, Performance.

**General** settings (`search.general`): Enable Search, Enable Global Search, Search Page (+ path), Results Per Page, Instant Search, Debounce Delay, Minimum Query Length, Maximum Results, and Search Mode (`basic` | `advanced` | `fuzzy` | `hybrid`).

**Search Sources** (`search.sources`): Products, Packages, Listings, Offerings, Projects, Collections, Pages, Posts, Media, plus per-slug toggles for custom content types (new types appear automatically from the database).

**Ranking** (`search.ranking`): Per-signal weights (title, description, tags, category, collection, custom field, popularity, featured, recent) and drag-and-drop priority order for tie-breaking. Signals are stored on indexed documents as `metadata.rankingSignals`.

**Smart Search** (`search.smart`): Fuzzy matching, partial/prefix match, synonym expansion (built-in + admin map), multi-keyword AND/OR retrieval, exact phrase boost, natural-language prefix stripping, and optional AI query rewrite / semantic re-rank (`OPENAI_API_KEY` + **Settings → Search → Smart Search**).

**Filters** (`search.filters`): Built-in filters (categories, collections, tags, content type, price, brand, status, date) plus auto-discovered custom fields from content type schemas (`search.facet` or filterable types). Drag-and-drop display order. API: `facets` JSON query param.

**Autocomplete** (`search.autocomplete`): Instant suggestions (separate debounce/min length from General), recent/popular/trending lists, local search history, grouped results, snippet previews, keyboard hints. Popular and trending overrides are configured in admin; trending also aggregates from `data/search-stats/{locale}.json` when `recordTrending` is enabled.

- `GET /api/search/autocomplete` — suggestions + results + popular/trending (public)
- `GET /api/admin/search/autocomplete` — same for admin command palette (authenticated)
- Client history: `localStorage` keys `sm-search:recent:{locale}` and `sm-search:history:{locale}`

**Analytics** (`search.analytics`): When enabled, records queries, zero-results, filter usage, and result conversions to `data/search-analytics/{locale}.json`. Reports and charts live under **Admin → Settings → Search → Analytics** (`GET /api/admin/search/analytics`). Client events: `POST /api/search/analytics`.

Settings persist to `site.json` → `search` and drive discovery, analytics, and indexer behavior.

URL: `/admin/settings/search?tab=sources` for deep links.

### Theme integration

Search modal, drawer, and search page wrap content in `SearchThemeRoot` and read global theme CSS variables (`--az-preset-*`, `--font-body`, `--motion-scale`, etc.). Enable or disable in **Settings → Search → Appearance → Inherit global theme**. See `docs/SEARCH_ARCHITECTURE_AUDIT.md`.

### Performance (large catalogs)

- **Lean retrieval** — list queries use `SUBSTRING(body, …)` / `indexExcerpt` metadata instead of loading full document bodies.
- **Capped candidates** — `search.performance.maxRetrievalCandidates` (default 120) bounds FULLTEXT/LIKE rows per query.
- **Query cache** — in-memory TTL cache (`queryCacheEnabled`, `queryCacheTtlSec`) keyed by query + filters + pagination.
- **Pagination** — `GET /api/search?offset=&limit=` returns `pagination: { hasMore, total }`; search page supports “Load more”.
- **Indexing** — body truncation (`indexBodyMaxChars`), parallel rebuild workers (`indexConcurrency`), deferred cache revalidation during bulk upserts.
- **DB** — composite index on `(locale, entityType)` on `SearchDocument` (run `prisma migrate` after schema update).

### Smart search pipeline

1. Optional **AI rewrite** (`smart.semantic.aiAssistEnabled`) — conversational → keywords.
2. **NL parsing** — strips “find”, “show me”, etc.
3. **Synonym expansion** — merges `search.smart.synonyms` with built-in groups.
4. **Retrieval** — FULLTEXT on expanded tokens; LIKE per-token (AND/OR).
5. **Ranking** — weighted signals + fuzzy/partial/exact-match boosts − typo penalty.
6. **Semantic** (optional) — hook ready for embedding similarity when vectors exist on `SearchDocument`.

## Extending for a new content kind

1. Implement `defineSearchProvider({ kind, entityType, shouldIndex, buildRecords })`.
2. `searchRegistry.register(provider)` at bootstrap (or add to `builtin-providers.ts`).
3. Call `frameworkSearchIndexer` from publish/delete actions.

Catalog **Content Types** use `content_item` provider automatically — set `search: true` on fields in `ContentType.fieldSchema`.

## API query params

- `q`, `locale`, `mode` (`search` | `suggest` on `/api/search` and `/api/admin/search`)
- `facets` — JSON object of filter id → string[] (public search + autocomplete)
- `types` — Prisma `SearchEntityType` (comma-separated)
- `contentTypeSlugs` — e.g. `catalog-items,listings,offerings`
- `kinds` — logical kinds: `content_item`, `post`, `cms_page`, …

## Legacy facades

- `@/features/search/search.service` → `SearchEngine`
- `@/features/search/search-indexer.service` → `SearchIndexer`
