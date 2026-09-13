/**
 * Stage 7 deprecation notes — intentional leftovers only.
 *
 * Canonical SoT: `Category` + `CategoryMembership`
 * Read path (PRODUCT): `categoriesDataService` → Category table, fallback CatalogCollection
 * Write path: admin still uses collections API which dual-writes Category
 *
 * Intentional compatibility aliases (do not remove until consumers gone):
 * - `/collections/*` redirects → `/categories/*`
 * - `/admin/collections` → `/admin/categories`
 * - `/api/collections` → same handlers as `/api/categories`
 * - `listCollections()` → `listCategories()`
 * - `Product.category` / `categories` strings — derived from Category labels
 * - Prisma legacy tables kept for dual-write / rollback until ops confirms cutover
 * - Listing filter section `"collections"` removed — Category owns FILTERS
 */
export const CATEGORY_STAGE7_INTENTIONAL_ALIASES = [
  "/collections",
  "/admin/collections",
  "/api/collections",
  "listCollections",
  "CatalogCollection",
  "Product.category",
  "Product.categories",
] as const;
