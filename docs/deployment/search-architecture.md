# Search architecture (Phase 1.8 policy)

AZURA uses two search paths on purpose:

1. **Database-scale** — MySQL `SearchDocument` FULLTEXT (with LIKE hybrid fallback) for global / admin search APIs.
2. **Client in-memory** — Fuse.js for small, already-loaded lists (product listing filters, optional mini-index).

Do **not** use Fuse.js as a substitute for querying large CMS/catalog corpora. Keep the `fuse.js` package for genuine client-side fuzzy lists.

---

## Architecture (textual)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Browser / Admin UI                                                      │
│                                                                          │
│  Product listing island ──► Fuse.js (in-memory ProductListingRecord[])   │
│  Client mini-index ───────► Fuse.js (≤500 prefetch records; optional)    │
│  Global search UI ────────► HTTP /api/search*                            │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Search capability (server)                                              │
│  search.service / searchEngine                                           │
│    ├─ mode: basic | advanced | fuzzy | hybrid                            │
│    ├─ ranking signals + facets                                           │
│    └─ retrieval via search.repository                                    │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌────────────────────────────┐   ┌────────────────────────────────────────┐
│  MySQL FULLTEXT            │   │  Prisma LIKE fallback                  │
│  MATCH(title, body)        │   │  title/body contains (token AND/OR)    │
│  AGAINST (... BOOLEAN)     │   │  prefixSuggestions on title            │
│  Index:                    │   │  Used when mode skips FULLTEXT,        │
│  SearchDocument_fulltext_  │   │  tokens ineligible, or hybrid merge    │
│  idx (title, body)         │   │                                        │
└──────────────┬─────────────┘   └──────────────────┬─────────────────────┘
               │                                    │
               └────────────────┬───────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  SearchDocument rows (indexed from CMS pages, posts, catalog, FAQ, …)    │
│  title + body carry searchable text; slug/description folded into body   │
│  by the indexer (not separate FULLTEXT columns)                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Policy summary**

| Layer | Engine | Scale | When to use |
|-------|--------|-------|-------------|
| Global / manage search APIs | MySQL FULLTEXT (+ LIKE) | Entire `SearchDocument` corpus | Always for DB-backed search |
| Product listing filter | Fuse.js | Current page’s listing records | Client fuzzy filter only |
| Client mini-index | Fuse.js | Cap 500 records | Optional offline/prefetch fuzzy |
| Admin table hooks (`useTableState`) | Lightweight string match | Current table page | Not Fuse; not DB FULLTEXT |

---

## Fuse.js audit (callsites)

| Location | Role | Client in-memory | DB-scale misuse? |
|----------|------|------------------|------------------|
| `src/features/products/listing/search.ts` | Builds Fuse over `ProductListingRecord[]` already loaded for the listing island; `fuzzyMatchListingSlugs` | Yes — listing-sized set | No |
| `src/features/products/components/product-listing-island.tsx` | Calls `fuzzyMatchListingSlugs` for query filtering | Yes (consumer) | No |
| `src/capabilities/search/query/client-mini-index.ts` | Fuse over ≤500 mini-index records (`title`, `snippet`, `searchText`) | Yes — capped | No (refuses >500) |
| `src/capabilities/search/query/index.ts` | Re-exports mini-index helpers | N/A | No |
| `src/capabilities/search/settings/resolve-fuzziness-for-listing.ts` | Maps admin fuzziness presets → Fuse threshold for listings | Config only | No |
| `src/capabilities/search/admin/search-settings-client.tsx` | UI copy: listing Fuse vs global FULLTEXT | Docs in UI | No |
| `src/features/catalog/admin/shared/useTableState.ts` | Comment only — implements its own token match, **no Fuse import** | N/A | No |
| `package.json` / `package-lock.json` | Dependency `fuse.js` ^7.4.1 | Kept on purpose | N/A |

**Verdict:** All Fuse.js runtime usage is client (or listing) in-memory fuzzy search. No Fuse.js path queries MySQL or walks the full catalog in the browser as a DB substitute.

---

## MySQL FULLTEXT (database-scale)

### Queries (`src/repositories/search.repository.ts`)

- **`fullTextSearch`** — `MATCH(title, body) AGAINST (? IN BOOLEAN MODE)` on `SearchDocument`, filtered by `locale` / optional `entityType`, ordered by relevance.
- **`likeSearch`** — Prisma `contains` on `title` / `body` (hybrid / fallback).
- **`prefixSuggestions`** — `startsWith` / `contains` on `title` (B-tree `@@index([title])`, not FULLTEXT).

Source CMS/catalog fields (title, description, slug, etc.) are normalized into `SearchDocument.title` + `SearchDocument.body` by the indexer; FULLTEXT therefore covers those texts without per-table indexes on every CMS entity.

### Index ensured at deploy

| Index | Table | Columns | Ensured by |
|-------|-------|---------|------------|
| `SearchDocument_fulltext_idx` | `SearchDocument` | `title`, `body` | `scripts/deploy/ensure-search-fulltext-mysql.mjs` via `applyMysqlPatches` in `prisma-migrate-deploy.mjs` |

Also present in:

- `database/mysql/mysql-schema-extras.sql`
- `database/mysql/import-blank-full.sql`
- `database/mysql/update-existing-to-current.sql` (idempotent)
- Historical migration `prisma/migrations/20260531140000_search_fulltext` (later dropped by `20260601133653_azura_migration` — hence the deploy ensure)

Idempotent ensure: if the index is missing after migrate/bootstrap, deploy recreates it with `CREATE FULLTEXT INDEX`.

### Out of scope for this FULLTEXT index

Admin picker LIKE search on live entity tables (`product.repository`, `icon.repository`, `media.repository`) is not global search and does not use `search.repository`. Those stay Prisma `contains` unless a future phase promotes them onto `SearchDocument` or dedicated FULLTEXT.
