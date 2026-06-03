# Target Next.js Architecture (App Router, RSC, Strict TS, Zod)

Goal: implement full parity with Astro `sample/` for **collections**, **products**, **mega menu**, **media**, **design tokens**, and **motion**, using a scalable Next.js architecture.

This repository already uses a feature-based layout under `src/features/*`. The target architecture extends it with two new domain modules (`collections`, `products`) and a shared `storefront` contract layer for listing/search/SEO.

---

## High-level structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── collections/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   └── products/
│   │       ├── page.tsx
│   │       └── [slug]/page.tsx
│   └── api/
│       ├── collections/
│       ├── products/
│       └── media/
├── features/
│   ├── collections/
│   ├── products/
│   ├── media/
│   ├── navigation/
│   ├── search/
│   ├── seo/
│   └── theme/
├── lib/
├── schemas/
├── types/
└── data/
```

Notes:

- Route segments remain thin: load data on the server, pass stable JSON to client components only when interactivity is required.
- All filesystem-only logic is isolated behind server-only modules (no client imports).
- Schema validation is Zod-based and used at boundaries (API routes, admin save/import, indexing).

---

## Collections module (`src/features/collections/`)

### Responsibilities (parity with Astro)

- Load collections from:
  - `src/data/collections.json` (global registry)
  - `src/data/<locale>/collections/<slug>.json` (locale overrides)
- Evaluate product matching using the exact rule semantics from Astro:
  - fields: `category`, `categories`, `tags`, `brand`, `title`, `badge`, `status`, `stock`
  - operators: `equals`, `contains`, `starts_with`, `not_equals`
- Provide hierarchy helpers:
  - `parentSlug` trails, descendants, breadth ordering
- Provide sync utilities used by Products admin (sync single product)

### Public API (suggested)

- `collections.service.ts`
  - `loadAllCollections(locale): Promise<LocalizedCollection[]>`
  - `loadCollection(locale, slug): Promise<LocalizedCollection | null>`
  - `resolveCollectionImages(collection, bySlug): { coverImage?: string; iconImage?: string }`
- `collection-sync.service.ts` (server-only)
  - `syncCollections({ locale, autoCreate, dryRun }): Promise<SyncReport>`
  - `syncSingleProduct(slug, product): Promise<ProductSyncResult>`

---

## Products module (`src/features/products/`)

### Responsibilities (parity with Astro)

- Validate product JSON against the Astro schema:
  - Keep `product.schema.json` identical (copy into `src/features/products/schema/` or `src/schemas/products/`)
- Load products from disk with locale fallback merging:
  - `src/data/<locale>/products/**/*.json`
  - `src/data/products/**/*.json` (legacy/default)
- Build listing catalog:
  - record derivations (`searchText`, tags, variation facets, condition facets)
  - facet aggregation
  - URL-state model
  - optional fuzzy slug matching with Fuse loaded dynamically (client-only)

### Public API (suggested)

- `products.service.ts` (server)
  - `getProduct(slug, locale)`
  - `getProductSlugs()`
  - `getAllProducts(locale)` (summaries)
  - `getStorefrontCatalogLoadIssues()`
- `listing/catalog.ts` (server)
  - `buildProductListingCatalog(locale): Promise<{ records; facets }>`
- `listing/filter.ts` (shared)
  - `filterListingCatalog(records, state, fuzzy, options)`
  - `paginateListing(items, page, per)`
- `listing/url-state.ts` (shared)
  - `filterStateFromSearchParams(params)`
  - `searchParamsFromFilterState(state, basePath)`

### Route usage

- `app/[locale]/products/page.tsx`
  - RSC loads catalog + renders listing shell
  - client component handles interactive filtering/search, preserving query-param contract
- `app/[locale]/products/[slug]/page.tsx`
  - RSC loads product + matching collections trail
  - `generateMetadata()` uses product SEO fields exactly like Astro

---

## Media module (`src/features/media/`)

Current Next implementation is DB-backed and already supports:

- file upload to `public/uploads/*`
- `MediaAsset` persistence via Prisma
- usage scanning/tracking

Parity requirement when products/collections become JSON-on-disk:

- Add a “reference rewriting” layer when replacing/renaming media:
  - update product JSON files
  - update collection JSON files
  - update page JSON (if pages are JSON-driven)

---

## Navigation module (`src/features/navigation/`)

Current Next implementation already mirrors Astro’s header builder/mega-menu surface.

Remaining parity tasks:

- Ensure href resolution matches Astro’s URL shapes once `collections` and `products` routes exist:
  - `collection` should link to `/[locale]/collections/<slug>`
  - `product` should link to `/[locale]/products/<slug>`

This likely requires adapting `src/features/navigation/resolve-href.ts` which currently routes to legacy `/packages`.

---

## SEO module integration

For parity:

- Collection pages:
  - canonical/hreflang
  - breadcrumb JSON-LD
  - indexability rules (`robots`)
- Product pages:
  - canonical/hreflang
  - breadcrumb JSON-LD
  - product OG tags

Implementation approach:

- Centralize shared metadata generation in `src/features/seo/*` helpers.
- Each page route calls `generateMetadata()` with minimal logic and uses helpers.

---

## Caching & performance

Filesystem content + listing catalogs can be expensive in production.

Recommended approach:

- Use a server-side cache keyed by:
  - locale
  - data file mtimes (or a build id)
- In dev, keep it uncached for correctness.
- Ensure client listing bundles remain small:
  - keep Fuse dynamic import (client-only)
  - keep heavy faceting on server when possible

