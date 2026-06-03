# Catalog Comparison Framework

Schema-driven comparison for any **Content Type** created in Admin → Catalog → Content. No per-type UI code paths.

## Enable comparison

1. Open **Admin → Catalog → Content Types → [type]**
2. In **Comparison**, enable the content type and select comparable fields
3. Set max items, display mode (`table` | `cards` | `hybrid`), labels, order, and groups
4. Save

Storefront routes:

- **Workspace:** `/{locale}/compare` — shows items from the compare list immediately; tab ribbon when multiple content types have selections
- **Per type:** `/{locale}/compare/{routePrefix}` — shareable deep link (uses `ContentType.routePrefix` from admin)
- Legacy URL segments (`packages` → `catalog-items`, etc.) still resolve for old bookmarks

**Products** use a filesystem `ComparisonDataAdapter` (spec groups, Astro-style). **CMS types** use Prisma `ContentItem` + `fieldSchema` compare flags.

## Architecture

| Module | Path |
|--------|------|
| ComparisonSchemaResolver | `src/features/comparison/comparison-schema-resolver.ts` |
| ComparisonEngine | `src/features/comparison/comparison-engine.ts` |
| ComparisonRegistry | `src/features/comparison/comparison-registry.ts` |
| ComparisonDataAdapter | `src/features/comparison/comparison-data-adapter.ts` |
| ComparisonStore | `src/features/comparison/comparison-store.ts` |
| CompareWorkspace | `src/features/comparison/components/compare-workspace.tsx` |
| ComparisonProvider | `src/features/comparison/comparison-provider.tsx` |
| ComparisonDrawer | `src/features/comparison/components/comparison-drawer.tsx` |
| ComparisonTable | `src/features/comparison/components/comparison-table.tsx` |
| AddToCompareButton | `src/features/comparison/components/add-to-compare-button.tsx` |

Configuration is stored in `ContentType.adminConfig` (`isComparable`, `comparisonSettings`) and `fieldSchema` (`compare`, `compareOrder`, `compareGroup`, etc.).

## Compare store

- Key: `az_catalog_compare` in `localStorage`
- Shape: `Record<contentTypeSlug, itemId[]>`
- Cross-type mixing is prevented: each slug is an isolated bucket
- Event: `az:catalog-compare-changed`

## APIs

- `GET /api/compare/{routePrefix}?ids=id1,id2&locale=...&mode=all|differences|hideEqual`
- `GET /api/compare/{routePrefix}/search?q=...&locale=...`

Routes resolve legacy segments to canonical slugs, then load via `loadCompareBundle` / `searchCompareItems`.

## Card integration

When `contentType.isComparable` is true, list/detail pages pass `getComparePropsForType()` into `ContentCard` or use `AddToCompareButton` with `variant="card"` (circular overlay, active state, max-item feedback).

## Tests

```bash
npm run test:comparison
```
