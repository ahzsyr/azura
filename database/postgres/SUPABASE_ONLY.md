# Supabase-only catalog operations (brt-me.com)



This project targets **Supabase PostgreSQL** for all catalog and merchandising data, with **Supabase Storage** for binary uploads. The filesystem holds source code and static assets only in production.



## Required environment (production / Vercel)



```env

DATABASE_URL=postgresql://...@aws-*.pooler.supabase.com:6543/postgres?...

PRISMA_SCHEMA=postgresql

CATALOG_PRODUCTS_SOURCE=db

MEDIA_STORAGE=supabase

SUPABASE_SERVICE_ROLE_KEY=...

NEXT_PUBLIC_SUPABASE_URL=...

NEXT_PUBLIC_CATALOG_DB_ONLY=1   # optional: hide filesystem media tab in admin UI

```



Do **not** set `CATALOG_PRODUCTS_SOURCE=filesystem` or `CATALOG_DATA_SOURCE=filesystem` in production.



## Local dev (optional filesystem mode)



```env

CATALOG_DATA_SOURCE=filesystem

MEDIA_STORAGE=local

```



> **Deferred:** Removal of filesystem dev mode (`CATALOG_DATA_SOURCE=filesystem`, `MEDIA_STORAGE=local`) is planned after 1–2 weeks of staging stability (separate follow-up PR).



## SQL migrations (run once in Supabase SQL Editor, in order)



| Script | Purpose |

|--------|---------|

| `database/postgres/01-schema.sql` | Core CMS tables |

| `database/postgres/03-storage-media.sql` | Media bucket |

| `database/postgres/04-catalog-products-table.sql` | `Product` table |

| `database/postgres/05-catalog-collections.sql` | `CatalogCollection` tables |

| `database/postgres/06-site-settings.sql` | `SiteSettings` per-locale |

| `database/postgres/07-search-analytics.sql` | `SearchAnalyticsSnapshot` |

| `database/postgres/08-search-fts.sql` | `SearchDocument.search_vector` GIN index |

| `database/postgres/09-media-asset-scope.sql` | `MediaAsset.assetScope` for catalog vs CMS |



## One-time seed scripts



```bash

npm run catalog:seed-all       # orchestrator (products, collections, site settings, theme presets)

npm run catalog:seed-db        # Product rows from bundled JSON

npm run catalog:seed-collections

npm run catalog:seed-site-settings

npm run catalog:seed-theme-presets

npm run catalog:seed-header    # Header workspace (if needed)

```



Bundled fixtures live under `seeds/catalog/` — **not read at runtime** on Supabase deployments (except build-time static imports for currency/UI copy baselines).



## Runtime data sources (production)



| Data | Storage |

|------|---------|

| Products | `Product` Prisma table |

| Collections | `CatalogCollection` + `CatalogCollectionLocale` |

| Site settings | `SiteSettings` table (per locale) |

| Search analytics | `SearchAnalyticsSnapshot` table |

| Theme presets | JsonStore `theme-presets` (+ bundled travel fallback) |

| Header / footer | JsonStore workspaces |

| CMS + catalog media | `MediaAsset` + Supabase Storage |

| Site search | `SearchDocument` (+ Postgres FTS `search_vector`) |

| Product listing indexes | In-memory from `Product` table (no disk JSON) |



## Cloud-native guard



`src/lib/cloud-native-guard.ts` enforces Postgres + Supabase Storage on Vercel and when `useDatabaseOnlyCatalog()` is true. Startup check runs via `instrumentation.ts`.



Filesystem writes to `src/data`, `public/uploads`, or `data/search-analytics` throw in cloud-native mode.



CI runs `npm run ci:cloud-native-fs` and `npm run ci:cloud-native-reads` on every PR (GitHub Actions) and before Vercel builds.



## Detection



`useDatabaseOnlyCatalog()` returns true when:



- `PRISMA_SCHEMA=postgresql`, or

- `DATABASE_URL` is a Postgres URL, or

- `CATALOG_PRODUCTS_SOURCE=db`



Explicit opt-out: `CATALOG_DATA_SOURCE=filesystem` or `CATALOG_PRODUCTS_SOURCE=filesystem`.



## Regenerate Prisma client



```bash

npm run db:generate

```



## Deploy checklist



1. Run SQL migrations 01 → 09 in Supabase SQL Editor.

2. Set all production env vars above.

3. `npm run catalog:seed-all` (or individual seed scripts).

4. Deploy to Vercel; verify admin CRUD and uploads survive redeploy.



## Staging lockdown checklist



Use a Vercel preview/staging project with production cloud-native env vars. Before each release:



| Action | Expected persistence | Verify no new files in |

|--------|---------------------|------------------------|

| Create/edit Product | `Product` table | `seeds/catalog/**/products/` |

| Edit Collection | `CatalogCollection` | `seeds/catalog/collections.json` |

| Upload catalog image | `MediaAsset` + Supabase bucket | `public/uploads/` |

| Change Site Settings | `SiteSettings` | `seeds/catalog/**/site.json` |

| Trigger search query | `SearchAnalyticsSnapshot` | `data/search-analytics/` |

| Redeploy Vercel | All data survives | — |



Optional automation:



```bash

STAGING_URL=https://your-preview.vercel.app npm run ci:smoke-cloud-native

```



Run the manual checklist on staging after deploy; confirm redeploy causes zero data loss.


