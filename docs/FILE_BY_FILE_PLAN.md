# File-by-File Migration Plan (Initial Mapping)

This plan enumerates the key Astro files that implement the requested subsystems and maps them to the intended Next.js destination locations.

Status values: Pending / In Progress / Complete.

---

## Design system & tokens

- **Source**: `sample/src/styles/global.css`
  - **Destination**: `src/app/globals.css`
  - **Purpose**: global CSS variables, responsive token scales, shared utility classes, base animation contracts
  - **Dependencies**: `src/features/theme/theme-css.ts` (should emit required CSS vars)
  - **Status**: Pending

- **Source**: `sample/tailwind.config.js`
  - **Destination**: Tailwind config in Next.js (project currently uses Tailwind v4 via CSS import)
  - **Purpose**: ensure breakpoints + var-based color mapping parity
  - **Dependencies**: current Tailwind 4 setup
  - **Status**: Pending

- **Source**: `sample/src/theme/resolver.ts` + `sample/src/content/settings/theme.json`
  - **Destination**: `src/features/theme/*` (+ existing preset JSON under `src/data/presets/*`)
  - **Purpose**: theme resolution and CSS var emission
  - **Dependencies**: existing Prisma `SiteTheme` tokens model
  - **Status**: Pending

---

## Media manager

- **Source**: `sample/src/lib/media-library.ts`
  - **Destination**: `src/lib/local-media-storage.ts` + `src/features/media/*` (augment)
  - **Purpose**: file scanning, metadata, allowed extensions, size caps
  - **Dependencies**: Prisma media asset storage (existing)
  - **Status**: Pending

- **Source**: `sample/src/pages/api/media/replace.ts`
  - **Destination**: `src/app/api/media/replace/route.ts` (new)
  - **Purpose**: replace asset + update all references (products/pages/collections/settings)
  - **Dependencies**: decision on whether products/collections remain JSON-on-disk vs DB-backed
  - **Status**: Pending

- **Source**: `sample/src/pages/api/media/relationships.ts`
  - **Destination**: `src/app/api/media/relationships/route.ts` or `src/features/media/*` endpoints
  - **Purpose**: show where assets are used (admin)
  - **Dependencies**: `src/features/media/media-usage-scanner.service.ts` (existing)
  - **Status**: Pending

---

## Collections

- **Source**: `sample/src/data/collections.json`
  - **Destination**: `src/data/collections.json` (new)
  - **Purpose**: canonical collection registry
  - **Dependencies**: loaders in `src/features/collections/*`
  - **Status**: Pending

- **Source**: `sample/src/lib/collections.ts`
  - **Destination**: `src/features/collections/engine/collections.ts` (new)
  - **Purpose**: rule engine + mapping product → engine product
  - **Dependencies**: `src/features/products/*` types
  - **Status**: Pending

- **Source**: `sample/src/lib/product-collections.ts`
  - **Destination**: `src/features/collections/engine/product-collections.ts` (new)
  - **Purpose**: compute product↔collection relationships, deepest match, orphan/ambiguity detection
  - **Dependencies**: hierarchy helpers + locale collection loader
  - **Status**: Pending

- **Source**: `sample/src/lib/collection-sync.ts`
  - **Destination**: `src/features/collections/collection-sync.service.ts` (new, server-only)
  - **Purpose**: sync report generation + locale override writing
  - **Dependencies**: filesystem access in Next runtime
  - **Status**: Pending

- **Source**: `sample/src/pages/[locale]/collections/index.astro`
  - **Destination**: `src/app/[locale]/collections/page.tsx` (new)
  - **Purpose**: collection listing page
  - **Dependencies**: theme tokens, SEO helpers
  - **Status**: Pending

- **Source**: `sample/src/pages/[locale]/collections/[slug].astro`
  - **Destination**: `src/app/[locale]/collections/[slug]/page.tsx` (new)
  - **Purpose**: collection detail + listing island equivalent
  - **Dependencies**: product listing client component + facets/filter pipeline
  - **Status**: Pending

---

## Products

- **Source**: `sample/src/schemas/product.schema.json`
  - **Destination**: `src/features/products/schema/product.schema.json` (new)
  - **Purpose**: canonical product contract
  - **Dependencies**: zod mirror used for validation
  - **Status**: Pending

- **Source**: `sample/src/types/product.ts`
  - **Destination**: `src/features/products/types.ts` (new)
  - **Purpose**: strict TS types matching schema
  - **Dependencies**: none
  - **Status**: Pending

- **Source**: `sample/src/lib/products.ts`
  - **Destination**: `src/features/products/products.service.ts` (new, server)
  - **Purpose**: load product files with locale fallback merge + validation issue reporting
  - **Dependencies**: filesystem utilities, zod validators
  - **Status**: Pending

- **Source**: `sample/src/pages/api/products.ts`
  - **Destination**: `src/app/api/products/route.ts` (new)
  - **Purpose**: admin CRUD, triggers collection sync per product save
  - **Dependencies**: auth guards + syncSingleProduct
  - **Status**: Pending

- **Source**: `sample/src/pages/api/products/import.ts`
  - **Destination**: `src/app/api/products/import/route.ts` (new)
  - **Purpose**: bulk import pipeline
  - **Dependencies**: import pipeline port
  - **Status**: Pending

- **Source**: `sample/src/lib/product-listing/*`
  - **Destination**: `src/features/products/listing/*` (new)
  - **Purpose**: listing catalog build, filtering, search, URL state
  - **Dependencies**: collections module for scopes
  - **Status**: Pending

- **Source**: `sample/src/pages/[locale]/products/index.astro`
  - **Destination**: `src/app/[locale]/products/page.tsx` (new)
  - **Purpose**: products listing page
  - **Dependencies**: listing pipeline
  - **Status**: Pending

- **Source**: `sample/src/pages/[locale]/products/[slug].astro`
  - **Destination**: `src/app/[locale]/products/[slug]/page.tsx` (new)
  - **Purpose**: PDP with tabs/variations/reviews + SEO
  - **Dependencies**: theme resolver + product UI components
  - **Status**: Pending

---

## Mega menu

- **Source**: `sample/src/data/header.json`
  - **Destination**: JsonStore seed / migration script (new)
  - **Purpose**: initialize header workspace in Next
  - **Dependencies**: `src/features/navigation/*`
  - **Status**: Pending

- **Source**: `sample/src/lib/menuEngine.ts`
  - **Destination**: `src/features/navigation/menu-engine.ts` (already present)
  - **Purpose**: menu utilities
  - **Status**: Complete

- **Source**: `sample/src/components/Header/MegaMenu/MegaMenuSurface.tsx`
  - **Destination**: `src/features/navigation/components/header/MegaMenu/MegaMenuSurface.tsx` (already present)
  - **Purpose**: mega menu rendering
  - **Status**: Complete

---

## Motion

- **Source**: `sample/src/styles/global.css` (`[data-animation]` + `.revealed`)
  - **Destination**: `src/app/globals.css` + `src/components/motion/*`
  - **Purpose**: entrance/scroll reveal
  - **Status**: Pending

