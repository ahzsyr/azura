# RFC-002: Catalog Storage Migration (Product → ContentItem)

> **Status:** Approved for implementation (Phase 3)  
> **Strategy:** ContentItem-first — no Prisma table rename in this phase  
> **Constitution:** [constitution.md](./constitution.md) v1.0-draft

---

## Summary

Unify showcase storage by migrating **`Product` rows into `ContentItem`** under builtin ContentType slug **`products`**, while keeping Prisma model names (`ContentType`, `ContentItem`) unchanged.

Single write path: **`entityService.saveEntity`**. Legacy `Product` table becomes read-only, then removable.

---

## Constitution check

| Test | Result |
|------|--------|
| 1 — Concept decomposition | Pass — Entity preset `product` on content engine |
| 2 — Single Ownership | Pass — writes via `entityService`; SEO/i18n unchanged |
| 3 — Capability Ownership | Pass — search uses CONTENT_ITEM + `metadata.presetId` |
| 4 — ViewModel boundary | Deferred — Phase 4 |
| 5 — Preset Creep | Pass — product PDP/compare stay in preset extensions |
| 6 — Parallel engine | Pass — absorbs into content platform |
| 7 — Entity vs Page | Pass |
| 8 — Deployment Profile | Pass — showroom/marketing profiles |

---

## Field mapping

| `Product` | `ContentItem` |
|-----------|---------------|
| `canonicalSlug` | `slug` |
| `payload` + denormalized columns | `attributes` (+ `_denorm`) |
| `status` | `status` (mapped to `ContentStatus`) |
| `collectionSlugs` | `metadata.collectionSlugs` |
| `id` | `metadata.migration.legacyProductId` |
| `LocalizedSlug` (Product) | repointed to ContentItem |
| `EntityTranslation` (Product) | copied to ContentItem (`productTitle` → `title`) |
| Media in payload | `ContentItemMedia` rows |

---

## Cutover flags

| Env | Effect |
|-----|--------|
| `AZURA_ENTITY_DUAL_WRITE=1` | `saveProductToDb` mirrors to ContentItem |
| `AZURA_ENTITY_WRITE_PRIMARY=1` | `saveEntity` primary; optional dual-write to Product |
| `AZURA_ENTITY_READ_CONTENT=1` | Product reads prefer ContentItem |
| `AZURA_PRODUCT_TABLE_READONLY=1` | Block `productRepository` writes |

Recommended sequence: dual-write → migrate data → read-content → write-primary → table read-only → reindex → remove legacy search docs.

---

## Collections

**Bridge only:** `CatalogCollection` + rule engine remain. `entityService.listCollections('product')` wraps `collectionsDataService`. Full merge into `ContentCollection` deferred.

---

## Rollback

`npm run entities:rollback-products` deletes migrated ContentItem rows (and related media/translations/search docs). Product table unchanged unless write-primary was enabled without dual-write.

---

## Related

- [entity-migration-runbook.md](./entity-migration-runbook.md)
- [entity-adapter-layer.md](./entity-adapter-layer.md)
- [azura-v2.md § Phase 3](./azura-v2.md#phase-3--catalog-storage-migration)
