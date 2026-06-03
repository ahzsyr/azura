# Missing Features Report (Astro `sample/` → Next.js `src/`)

This report compares the Astro implementation against the current Next.js codebase and lists **missing or non-parity features** with source and target file locations, migration complexity, dependencies, risks, and a recommended implementation approach.

---

## Legend

- **Complexity**: S (small), M (medium), L (large)
- **Risk**: Low / Medium / High

---

## Collections System

### 1) Filesystem-backed collection registry + locale overrides

- **Astro source**
  - Global data: `sample/src/data/collections.json`
  - Locale overrides: `sample/src/data/<locale>/collections/<slug>.json`
  - Loader + hierarchy helpers: `sample/src/lib/i18n/*` (collection loaders) and `sample/src/lib/collections.ts`
- **Next.js equivalent (current)**
  - No `src/data/collections.json` equivalent present
  - No public `/[locale]/collections/*` routes found
- **Complexity**: L
- **Dependencies**
  - Locale routing strategy (Next `src/i18n/*`)
  - SEO (`src/features/seo/*`)
  - Design tokens for collections pages (theme CSS vars)
- **Risks**
  - URL parity: locale prefix + `trailingSlash: never` semantics
  - SEO parity: canonical/hreflang + breadcrumb JSON-LD
  - Performance: building listing catalogs at request time without caching
- **Recommended implementation**
  - Add `src/data/collections.json` and locale override folder structure identical to Astro.
  - Add `src/features/collections/*` with:
    - types mirrored from Astro `sample/src/lib/collections.ts`
    - server-only loaders reading from disk (or JsonStore if preferred) but emitting identical shapes
  - Add routes:
    - `src/app/[locale]/collections/page.tsx`
    - `src/app/[locale]/collections/[slug]/page.tsx`

### 2) Rule-based collection matching engine + sync workflow

- **Astro source**
  - Rule engine: `sample/src/lib/collections.ts`
  - Product→collection mapper: `sample/src/lib/product-collections.ts`
  - Sync + reporting: `sample/src/lib/collection-sync.ts`
  - Sync endpoint: `sample/src/pages/api/sync-collections.ts` (found via search; full parity to confirm)
- **Next.js equivalent (current)**
  - No collection sync engine found
- **Complexity**: L
- **Dependencies**
  - Products catalog (see Products section)
  - Admin UI (optional, but Astro uses admin surfaces to validate/sync)
- **Risks**
  - Server-only filesystem writes must not leak into client bundles
  - Correctly preserving ambiguity/orphan detection logic
- **Recommended implementation**
  - Port the engine logic with minimal refactors.
  - Provide a server action/route handler for:
    - validate only (dry run)
    - sync single product on save
    - full sync (optional)

---

## Products System

### 1) JSON Schema-driven product catalog on disk (multi-locale)

- **Astro source**
  - Schema: `sample/src/schemas/product.schema.json`
  - TS types: `sample/src/types/product.ts`
  - Loader/catalog: `sample/src/lib/products.ts`
  - Files:
    - `sample/src/data/<locale>/products/**/*.json`
    - `sample/src/data/products/**/*.json`
- **Next.js equivalent (current)**
  - No `src/data/<locale>/products` in the Next repo
  - No `Product` schema matching the Astro JSON contract found
- **Complexity**: L
- **Dependencies**
  - i18n locale resolution and fallback rules
  - Media URL strategy (`/uploads/*` and remote URLs)
  - SEO metadata generator
- **Risks**
  - Maintaining strict schema compatibility while moving runtime from Vite glob to Node fs
  - Locale fallback merging behavior (Astro merges from default locale under conditions)
- **Recommended implementation**
  - Add `src/features/products/*`:
    - `product.schema.json` copied verbatim
    - `types.ts` mirrored from Astro
    - `products.service.ts` implementing:
      - `getProduct(slug, locale)`
      - `getProductSlugs()`
      - `getAllProducts(locale)` (summaries)
      - validation issue reporting
  - Add route handlers mirroring Astro APIs (admin use):
    - `src/app/api/products/route.ts`
    - `src/app/api/products/import/route.ts`

### 2) Product listing pipeline (facets, filtering, fuzzy search, URL state)

- **Astro source**
  - `sample/src/lib/product-listing/catalog.ts`
  - `sample/src/lib/product-listing/aggregate-facets.ts`
  - `sample/src/lib/product-listing/filter.ts`
  - `sample/src/lib/product-listing/search.ts` (Fuse)
  - `sample/src/lib/product-listing/url-state.ts`
  - UI island: `sample/src/components/product/ProductListingIsland.tsx`
- **Next.js equivalent (current)**
  - No parallel “product listing” feature found; existing `src/features/catalog/*` is a different domain.
- **Complexity**: L
- **Dependencies**
  - Collections matching (for facets and scope)
  - Search config from theme (debounce/fuzziness)
- **Risks**
  - Reproducing exact query param contract (`q`, `category`, `brand`, `tag`, `var`, `price_min`, `scope`, etc.)
  - Keeping client bundle small (Fuse dynamic import is good to preserve)
- **Recommended implementation**
  - Port the listing logic mostly as-is into `src/features/products/listing/*`.
  - Implement `ProductListingClient` as a client component, with an RSC wrapper providing initial payload.

### 3) Product detail (PDP) behavior parity

- **Astro source**
  - Route: `sample/src/pages/[locale]/products/[slug].astro`
  - Modules: `sample/src/lib/product-page-display.ts`, `product-cta.ts`, `product-variation-pricing.ts`, etc.
  - SEO: JSON-LD, canonical/hreflang
- **Next.js equivalent (current)**
  - No `/[locale]/products/[slug]` route found
- **Complexity**: L
- **Dependencies**
  - Theme resolver and product page layout tokens
  - Media rendering component strategy
- **Risks**
  - SEO regressions: JSON-LD + canonical + og tags parity
  - Accessibility: tabs, galleries, compare/save list behaviors
- **Recommended implementation**
  - Create:
    - `src/app/[locale]/products/[slug]/page.tsx` (RSC)
    - `generateMetadata()` aligning with Astro’s `pageSeo`
  - Port UI components under `src/features/products/components/*` reusing Astro CSS where feasible.

---

## Mega Menu / Navigation

### 1) Parity verification and data seeding

- **Astro source**
  - Workspace JSON: `sample/src/data/header.json`
  - Engine: `sample/src/lib/menuEngine.ts`
  - Renderer: `sample/src/components/Header/MegaMenu/MegaMenuSurface.tsx`
- **Next.js equivalent (current)**
  - Engine: `src/features/navigation/menu-engine.ts` (near 1:1)
  - Renderer: `src/features/navigation/components/header/MegaMenu/MegaMenuSurface.tsx` (near 1:1)
  - Admin UI: `src/features/navigation/admin/*`
- **Complexity**: S–M
- **Dependencies**
  - Header workspace persistence (`src/app/api/admin/header-workspace/route.ts`)
  - Href resolution (`src/features/navigation/resolve-href.ts`)
- **Risks**
  - Menu item type union differences (Astro has `collection|product`; Next includes additional domain types like packages/posts)
  - Seed data shape differences (`header.json` vs JsonStore storage)
- **Recommended implementation**
  - Add an import/seed path to initialize Next header workspace from Astro `header.json` (one-time migration).
  - Diff `MenuItem` type and ensure all Astro fields exist (`megaMenu.childDescriptions`, dropdown icon flag, etc.).

---

## Media Manager

### 1) Reference rewriting on replace (filesystem JSON vs DB)

- **Astro source**
  - Replace endpoint: `sample/src/pages/api/media/replace.ts` (updates product JSON + pages + collections)
  - Relationships endpoint: `sample/src/pages/api/media/relationships.ts`
  - Storage: `public/uploads/*` + `src/data/media-library.json`
- **Next.js equivalent (current)**
  - Upload endpoint: `src/app/api/media/upload/route.ts` (writes `/uploads/*` and stores DB record)
  - Usage scanner: `src/features/media/media-usage-scanner.service.ts` (DB usage tracking)
  - No evidence of “replace and rewrite all JSON references” because Next content is DB-backed.
- **Complexity**: M–L (depends on whether products/collections remain JSON-on-disk after migration)
- **Dependencies**
  - Decision: store products/collections/pages as JSON-on-disk (Astro parity) vs Prisma entities (current Next patterns)
- **Risks**
  - Broken media references after replace if products/collections are filesystem JSON and not indexed in usage scanner
- **Recommended implementation**
  - If products/collections migrate as JSON-on-disk:
    - port Astro’s replace+rewrite logic into Next route handler.
  - If products/collections migrate into DB:
    - implement replace to update DB references and keep `mediaUsageScanner` authoritative.

---

## Design System / Tokens

### 1) Token parity: `--az-*` scale + breakpoints + Tailwind mapping

- **Astro source**
  - Tokens + keyframes: `sample/src/styles/global.css`
  - Tailwind mapping: `sample/tailwind.config.js` (notably `md: 1080px`)
  - Theme resolver: `sample/src/theme/resolver.ts`, `sample/src/content/settings/theme.json`
- **Next.js equivalent (current)**
  - Base vars and aliases: `src/app/globals.css` defines `--p`, `--a`, `--sur`, etc.
  - Theme feature: `src/features/theme/*` + `src/data/presets/*.json`
- **Complexity**: M
- **Dependencies**
  - Tailwind v4 config approach in Next
  - Existing design language of current Next app
- **Risks**
  - Breakpoint mismatch (Astro uses 1080px “md”; Next likely uses Tailwind defaults unless customized)
  - Visual regressions when migrating Astro CSS-heavy components
- **Recommended implementation**
  - Establish a compatibility layer:
    - ensure `--p --a --sec --sur --t --m --bg` exist
    - port `--az-fs-*` and `--az-sp-*` tokens to Next `globals.css`
  - Decide whether to align Tailwind breakpoints to Astro (recommended for parity).

---

## Motion / Animations

### 1) Scroll reveal + `[data-animation]` contract

- **Astro source**
  - CSS contract: `sample/src/styles/global.css` (`[data-animation]` + `.revealed`)
- **Next.js equivalent (current)**
  - Builder motion exists (`src/app/globals.css` includes block animations; `src/components/motion/*`)
- **Complexity**: M
- **Dependencies**
  - How blocks are rendered in Next builder
- **Risks**
  - Regressions in block entrance behavior and reduced-motion handling
- **Recommended implementation**
  - Preserve the attribute contract and implement IntersectionObserver in a small client utility for `.revealed`, or map to Framer Motion `whileInView`.

