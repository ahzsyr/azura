# Astro → Next.js Migration Report (Audit + Plan)

Scope: migrate the Astro implementation in `sample/` into the current Next.js app (root `src/`) while preserving URL structure, SEO behavior, data schemas, relationships, and accessibility; modernize with Next.js App Router, RSC, strict TypeScript, and Zod.

This document covers **Phase 1 (Deep Analysis)** and initial **Phase 2 (Gap Analysis)** based on repository audit.

---

## Repos audited

### Astro source

- Root: `sample/`
- Framework: Astro 6 (`sample/package.json`)
- Content/CMS: Keystatic (`sample/keystatic.config.ts`)
- Search: prebuilt JSON index + Fuse (`sample/scripts/build-search-index.mjs`, `sample/public/data/search-index*.json`, `sample/src/lib/product-listing/search.ts`)
- SEO: custom sitemap, schema graph/validators, canonical routing (`sample/src/lib/seo/**`, `sample/src/pages/sitemap*.ts`)
- i18n routing: **custom middleware + locale-prefixed pages** (`sample/src/middleware.ts`, pages under `sample/src/pages/[locale]/...`)

### Next.js target

- Root: project root `src/`
- Framework: Next.js 16 App Router, TS strict, Tailwind 4, Zod, Framer Motion (`package.json`)
- Existing feature modules: `src/features/*` (navigation/media/theme/search/seo/builder/etc.)

---

## Phase 1 — Deep Analysis

### Collection System (Astro)

#### Data structure & schema

- **Global collection registry**: `sample/src/data/collections.json`
  - Array of collections with:
    - `id`, `slug`, `name`, `description`, `badge`, `coverImage`, `iconImage`
    - `seo`: `{ metaTitle, metaDescription, keywords?, og*, twitter*, canonicalPath }`
    - `conditions`: rule engine (`match: "any" | "all"`, `rules[]`)
    - `parentSlug` (hierarchy), `visible`, `showInNav`, `featured`, `tags`, timestamps
- **Locale-scoped collection overrides**:
  - Written into: `sample/src/data/<locale>/collections/<slug>.json`
  - Created by sync engine; preserves existing locale customizations.

Core types/engine:

- Rule evaluation + collection shape: `sample/src/lib/collections.ts`
- Product→collection bridging + hierarchy inheritance: `sample/src/lib/product-collections.ts`
- Sync/orphan/ambiguity detection + locale file writing: `sample/src/lib/collection-sync.ts`

#### Loading logic

- Public pages load **localized collections** through the i18n layer:
  - `loadAllCollections(locale)` and `loadCollection(locale, slug)` from `sample/src/lib/i18n/*` (entrypoint imported by routes).
- Product matching for a collection page:
  - Loads products normalized for rule engine: `loadProductsForCollectionRules(locale)` (`sample/src/lib/collections.ts`)
  - Filters to products matching the collection rules: `getCollectionProducts(collection, catalog)` (`sample/src/lib/collections.ts`)

#### Dynamic routing & URLs

- Collection index: `sample/src/pages/[locale]/collections/index.astro`
- Collection detail: `sample/src/pages/[locale]/collections/[slug].astro`
- URL shape: `/<localePrefix>/collections` and `/<localePrefix>/collections/<slug>`
  - `astro.config.mjs` uses `trailingSlash: 'never'` and file build output.
  - Locale prefix is required; middleware resolves/redirects.

#### Filtering / searching / sorting / pagination (collection page)

On a collection detail page (`sample/src/pages/[locale]/collections/[slug].astro`):

- Builds in-memory `ProductListingRecord[]` (adapter layer) for `ProductListingIsland`.
- Uses:
  - `aggregateFacets(records, allCollections)` from `sample/src/lib/product-listing/catalog.ts`
  - `filterStateFromSearchParams()` from `sample/src/lib/product-listing/url-state.ts`
- Pagination for noscript fallback is server-side slicing; JS island provides richer UX.

#### SEO integration

Collection page:

- Canonical URL + hreflang links:
  - `buildHreflangLinks(base, /collections/<slug>, locale.code)`
- Breadcrumb JSON-LD rendered inline.
- Per-collection SEO fields come from `collection.seo` and are merged into page SEO input.

#### Relationships between collections and products

- Relationship is **computed**, not stored:
  - A product belongs to collections when it matches `collection.conditions.rules`.
  - Parent collections can be included via `includeParents` option (used in listing catalog build).
- Product detail uses deepest matching collection for breadcrumb trail:
  - `getDeepestMatchingCollectionSlug()` from `sample/src/lib/product-collections.ts`

#### Data flow diagram (Collections)

```mermaid
flowchart TD
  A[src/data/collections.json] --> B[loadAllCollections(locale)]
  P[src/data/**/products/**/*.json] --> C[getProductSlugs/getProduct]
  C --> D[catalogProductToCollectionProduct]
  D --> E[matchProductToCollection rules]
  B --> E
  E --> F[getCollectionProducts]
  F --> G[ProductListingRecord adapter]
  G --> H[ProductListingIsland filters/search/paging]
```

#### Migration strategy (Collections → Next.js)

- **Preserve the on-disk JSON schema** for `collections.json` and locale overrides.
- Port the rule engine with minimal changes:
  - `matchProductToCollection`, `catalogProductToCollectionProduct`, orphan/ambiguity detection.
- In Next.js:
  - Implement loaders as **server-only** services reading from `src/data/**` (or keep current storage layer if it already mirrors this behavior).
  - Public routes:
    - `/[locale]/collections` (index)
    - `/[locale]/collections/[slug]` (detail)
  - Provide `generateMetadata()` per route using SEO fields + canonical/hreflang.
  - Use RSC for data load; client components only for interactive listing UI.

---

### Products System (Astro)

#### Product schema

- JSON Schema (draft-07): `sample/src/schemas/product.schema.json`
- TypeScript mirror: `sample/src/types/product.ts`
- Storage:
  - Locale products: `sample/src/data/<locale>/products/**/*.json`
  - Legacy/default products: `sample/src/data/products/**/*.json`

Key schema features:

- Identity & titles: `id`, `productTitle`, `name`, `title`, `title_extended`
- Copy: `short_description`, `description`, `detailed_description[] { heading, text }`
- Commerce-ish: `price { value, currency, discount? }`, `old_price`, `availability`, `stock_status`
- Attributes: `mpn`, `manufacturer_part_number`, `ean`, `brand`, `warranty`
- Taxonomy: `category`, `categories[]`, `tags[]`
- Specs: `specifications[]` grouped sections
- Variants:
  - `variations[] { type, options, default }`
  - `variation_combinations[]` (price/SKU per mix)
- Media:
  - `media.images[] { url, alt, type }`, `videos[]`, `files[]`, etc.
- Reviews: aggregate + distribution + comments
- Localization meta: `localization { canonical_slug, source_locale, translation_status, uses_source_fallback }`
- Per-product overrides: CTA, page display toggles, add-to-cart, promo, trust

#### Loading logic

- Eager raw import in Vite bundle:
  - `import.meta.glob("../data/**/products/**/*.json", { query: "?raw", eager: true })` in `sample/src/lib/products.ts`
  - Builds catalog rows and detects:
    - duplicate slugs per locale
    - invalid JSON
    - Zod validation issues (`collectProductCatalogZodIssues`)
  - Locale fallback merge:
    - `shouldMergeLocaleFallback()` + `mergeProductLocaleFallback()` for non-default locales.
- API-based CRUD for admin:
  - `sample/src/pages/api/products.ts` (GET list/single, POST save, DELETE)
  - POST triggers `syncSingleProduct()` to keep collection relationships consistent.
  - Bulk import: `sample/src/pages/api/products/import.ts` → `runProductImportPipeline()`

#### Dynamic routing & SEO

- Product index: `sample/src/pages/[locale]/products/index.astro`
- Product detail (PDP): `sample/src/pages/[locale]/products/[slug].astro`
  - Canonical: `/<localePrefix>/products/<slug>`
  - Breadcrumb JSON-LD (either collections trail + product, or products index + product)
  - Hreflang links
  - OpenGraph: title/description/image/type="product"

#### Listing/filtering/search/sorting/pagination

Core listing pipeline:

- Build catalog (records + facets): `sample/src/lib/product-listing/catalog.ts`
  - Derives:
    - `searchText` for fast substring search
    - `variationFacets`, `conditions`
    - `collectionSlugs` (includes parents)
  - `aggregateFacets()` returns counts for sidebar filters.
- Filter: `sample/src/lib/product-listing/filter.ts`
  - Supports `collectionScope` and descendant scoping (hierarchy-aware)
  - Supports tags/brands/categories/variations, stockOnly, price range
- Fuzzy search: `sample/src/lib/product-listing/search.ts` uses `fuse.js` loaded dynamically
- URL ↔ state: `sample/src/lib/product-listing/url-state.ts`

#### Recommended Next.js implementation (Products)

- Preserve product JSON schema exactly; validate with Zod at ingestion boundary.
- Prefer filesystem-backed storage (for parity) behind a `features/products` service:
  - `getProduct(slug, locale)` with locale fallback merge
  - `getProductSlugs()` and `getAllProducts(locale)` for listing/SEO
  - `buildProductListingCatalog(locale)` for listing pages
- Implement Next routes (App Router):
  - `src/app/[locale]/products/page.tsx` (index)
  - `src/app/[locale]/products/[slug]/page.tsx` (PDP)
  - Route handlers for admin CRUD (if not already present): `src/app/api/products/**`
- SEO:
  - Use `generateMetadata()` + JSON-LD via `next/script` or server-rendered `<script type="application/ld+json">`.

---

### Mega Menu System (Astro)

#### Configuration & hierarchy

- Stored workspace JSON: `sample/src/data/header.json`
  - `menusDatabase` keyed by menu id (ex: `mainMenu`)
  - Each menu: `name`, `globalApply` (Desktop/Mobile/Both/none), `items[]`
  - Menu items (recursive):
    - `type`: `page | link | collection | product | image | ...`
    - `placement`: `desktop | mobile | both`
    - Optional mega-menu config:
      - `megaMenuType`: `grid | columns | mixed | tabbed | dropdown`
      - `megaMenu`: columns, tabs, per-child descriptions, icon toggles, etc.

Core logic:

- Engine functions: `sample/src/lib/menuEngine.ts`
- UI components:
  - Mega menu renderer: `sample/src/components/Header/MegaMenu/MegaMenuSurface.tsx`
  - Admin builder: `sample/src/admin/header-dashboard/MenuBuilder.tsx` (+ store/api modules)

#### Migration plan

Status: **Already largely migrated in Next.js**.

Evidence:

- Next has near-1:1 equivalents:
  - `src/features/navigation/menu-engine.ts`
  - `src/features/navigation/components/header/MegaMenu/MegaMenuSurface.tsx`
  - Admin UI: `src/features/navigation/admin/*`

Remaining work (verification-focused):

- Confirm the Next `MenuItem` type union fully covers Astro item types.
- Confirm `resolve-href` matches Astro’s `getItemHref()` behavior for:
  - page ids
  - collection/product ids
  - locale prefixing rules
- Confirm header workspace persistence (route handlers) and default `header.json` seeding.

---

### Media Manager System (Astro)

#### Storage & references

- Physical files: `public/uploads/<subDir>/<filename>`
  - subDirs: `images | videos | documents | audio | other`
- Metadata store: `src/data/media-library.json` (map by filename)
- Library builder/scanner: `sample/src/lib/media-library.ts`

Admin workflows:

- Upload endpoint(s): `sample/src/pages/api/media/*` (upload not included in reads yet; replace + relationships confirmed)
- Replace workflow: `sample/src/pages/api/media/replace.ts`
  - If extension changes, it writes new file, deletes old, then **updates references across**:
    - all products JSON (all locales + legacy)
    - all pages JSON under `src/content/pages`
    - `src/data/collections.json`
  - Updates metadata keys accordingly.
- Relationships: `sample/src/pages/api/media/relationships.ts` scans products/pages/collections/settings.

#### Next.js Image optimization strategy

Two-mode strategy to preserve parity:

- **Preserve source URLs**: keep storing URLs as `/uploads/...` in JSON (no rewrite).
- Render with `next/image` where possible:
  - For local `/uploads/...` images, configure `images` and use `unoptimized={false}` with proper `sizes`.
  - For remote URLs that appear in product media, whitelist domains in `next.config.ts`.
- Provide a thin `MediaImage` component that accepts the same `{ url, alt }` and chooses:
  - `<Image>` for local http(s) and public paths
  - `<img>` fallback for unsupported URLs (data URLs, etc.)

Status: **Next already has a `features/media` module**; needs parity-check against Astro replace/relationships semantics.

---

### Design System (Astro)

#### Tokens

Primary design tokens are CSS variables and Tailwind mappings:

- Tailwind tokens map to CSS vars: `sample/tailwind.config.js`
  - `colors.primary = var(--p)`, `accent = var(--a)`, `surface = var(--sur)`, etc.
  - Fonts: `var(--font-display/body/mono)`
  - Custom breakpoints: `md = 1080px` (non-standard)
- Global CSS defines:
  - Utility font classes + rich responsive tokens:
    - `--az-fs-*` (fluid typography)
    - `--az-sp-*` spacing
  - Animation triggers: `[data-animation]` and `.revealed`
  - Layout containers `az-container*`
  - A large set of component-specific rules
  - Source: `sample/src/styles/global.css`

Theme settings:

- User-selected preset + overrides: `sample/src/content/settings/theme.json`
- Resolver merges preset + overrides + site settings: `sample/src/theme/resolver.ts`

#### Design token map (Astro → conceptual)

- **Color tokens**:
  - `--p` primary, `--a` accent, `--sec` secondary, `--sur` surface, `--t` text, `--m` muted, `--bg` background
- **Typography**:
  - `--font-display`, `--font-body`, `--font-mono`
  - Fluid scale `--az-fs-*`
- **Spacing**:
  - `--az-sp-*`, `--az-gap-*`
- **Radius**:
  - `--az-radius-*` (used in multiple component styles; referenced in product css)

Status in Next: partially present via `src/app/globals.css` which already defines header-builder aliases (`--p`, `--a`, `--sur`, etc.) but **does not yet include the full Astro token set**.

---

### Animation & Motion System (Astro)

Identified motion layers:

- CSS entrance/scroll animations:
  - `[data-animation]` + `.revealed` pattern in `sample/src/styles/global.css`
  - Page-level keyframes for PDP entrance (`prd-hero-fade/slide`) in `sample/src/pages/[locale]/products/[slug].astro`
- GSAP is used in the project (configured in `astro.config.mjs` optimizeDeps) and appears in site/preloader scripts.
- Preloader + page transitions are part of theme resolver (`sample/src/theme/resolver.ts`) through:
  - `sitePreloader` config
  - `pageTransitions` config

Next already includes `framer-motion` + lazy motion utilities (`src/components/motion/*`).

Migration approach:

- Keep CSS-variable-driven motion presets (duration, entrance type) as data and map them to:
  - CSS animations for cheap, no-JS effects
  - Framer Motion variants for page transitions / component-level motion where needed
- Preserve `prefers-reduced-motion` behavior.

---

## Phase 2 — Gap Analysis (Initial)

### Already migrated / strong parity signals

- **Mega menu / header builder**: Next has near-identical files under `src/features/navigation/**`.
- **Media manager**: Next has `src/features/media/**` and uploadthing integration; needs parity check with Astro’s filesystem-based `/uploads` system and reference-rewrite semantics.
- **Theme/presets**: Next has `src/features/theme/**`; needs token-level parity with Astro CSS variables (`--az-fs-*`, `--az-sp-*`, breakpoint semantics like `md=1080px`).

### Likely missing / needs migration (from Astro systems)

- **Products JSON-on-disk catalog** (schema + loaders + API + locale fallback merge) — Astro is file-based; Next currently appears CMS/prisma driven for other domains.
- **Collections rule engine + sync workflow** (including locale collection file generation).
- **Product listing UX** (facet aggregation, fuzzy search, URL-state model) if not already present in Next under a different feature.
- **SEO schema graph + sitemap generators** specific to products/collections.

### Concrete missing-features list

See `docs/MISSING_FEATURES_REPORT.md` for the detailed, file-mapped gap analysis.

---

## Next steps (implementation sequence aligned with requested priority)

1. **Design system parity layer**
   - Bring Astro token contracts into Next (CSS vars + Tailwind mapping) without breaking existing styles.
2. **Media manager parity**
   - Ensure `/uploads/*` file storage + metadata + reference rewriting matches Astro behavior.
3. **Collections**
   - Port rule engine + loaders + routes + SEO + hierarchy UX.
4. **Products**
   - Port schema/types + loaders + listing pipeline + PDP behavior + admin endpoints.
5. **Mega menu**
   - Mostly verify parity; backfill any missing item types/fields.
6. **Animations**
   - Map Astro CSS/GSAP behaviors to Next (CSS + Framer Motion) preserving reduced-motion safeguards.

