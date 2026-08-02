# Entity adapter layer (Phase 2)

> **Constitution:** [domain-model.md](./domain-model.md) · **Master plan:** [azura-v2.md](./azura-v2.md#phase-2--entity-engine-unification-interface-first)

Phase 2 introduces a **read-only unified facade** for showcase records. Storage remains split (`ContentItem` + `Product`); no Prisma migration in this phase.

---

## Purpose

| Before Phase 2 | After Phase 2 |
|----------------|---------------|
| New code might call `productsDataService`, `contentPublicService`, or `contentRepository` directly | **New code calls `entityService`** |
| Preset identity scattered across content type slugs and product tables | **Preset manifest** in `preset-registry.ts` |
| No shared Entity vocabulary in TypeScript | **Canonical types** in `src/features/entities/types.ts` |

**Exit criterion:** New features import `@/features/entities` — not legacy product/content data services for entity reads.

---

## Module layout

```text
src/features/entities/
  types.ts                 # Entity, EntityType, Collection contracts
  preset-registry.ts       # Preset manifest + legacy bridge helpers
  entity.service.ts        # Public facade (server-only)
  errors.ts                # UnknownEntityPresetError, EntityPresetNotActiveError
  adapters/
    content-item.adapter.ts
    product.adapter.ts
    normalize.ts           # Pure mappers (testable without DB)
  index.ts                 # Barrel export
```

---

## Preset manifest (active)

| Preset ID | User label | Storage | Legacy bridge | Admin href |
|-----------|------------|---------|---------------|------------|
| `product` | Products | `product` | `productsDataService` | `/admin/products` |
| `service` | Services | `content_item` | `ContentType` slug `offerings` | `/admin/content/offerings` |
| `destination` | Destinations | `content_item` | `ContentType` slug `catalog-items` | `/admin/content/catalog-items` |
| `property` | Properties | `content_item` | `ContentType` slug `listings` | `/admin/content/listings` |

### Legacy source mapping

| Legacy catalog source | Preset ID |
|-----------------------|-----------|
| `packages` | `destination` |
| `hotels` | `property` |
| `services` | `service` |

### Planned presets (registered, not readable yet)

`project`, `case-study`, `team-member`, `partner`, `knowledge`, `pricing`, `event` — `status: planned`, `storage: portal`.  
`entityService.listEntities()` throws `EntityPresetNotActiveError` for these until Phase 5 reclassification.

---

## `entityService` API

Import:

```typescript
import { entityService } from "@/features/entities";
```

### Registry

| Method | Returns |
|--------|---------|
| `listEntityTypes({ includePlanned? })` | `EntityTypeDefinition[]` — active presets by default |
| `getEntityType(presetId)` | Manifest row or `null` |
| `resolvePresetByContentTypeSlug(slug)` | e.g. `offerings` → `service` |
| `resolvePresetByLegacySource(source)` | e.g. `packages` → `destination` |

### Reads

| Method | Description |
|--------|-------------|
| `listEntities(presetId, options?)` | Unified list rows |
| `getEntity(presetId, idOrSlug, options?)` | Full record with normalized `fields` |
| `listCollections(presetId, options?)` | Content collections or product catalog collections |

### Options

```typescript
type EntityListOptions = {
  locale?: string;       // URL prefix — required for product reads (defaults to site default)
  search?: string;
  status?: ContentStatus;
  collectionSlug?: string;
  limit?: number;
  includeDeleted?: boolean;  // admin / content_item only
};
```

### Examples

```typescript
// List services (content-backed)
const services = await entityService.listEntities("service", {
  status: "PUBLISHED",
});

// Get a product by slug
const product = await entityService.getEntity("product", "widget-pro", {
  locale: "en",
});

// Resolve preset from legacy block config
const preset = entityService.resolvePresetByContentTypeSlug("catalog-items");
// → "destination"
```

---

## Adapter responsibilities

### Content item adapter

- **List:** `contentRepository.listItemsAsListRows(contentTypeSlug, …)`
- **Get (public):** `contentPublicService.getItemByTypeAndSlug` when `status` is published and not `includeDeleted`
- **Get (admin):** `contentRepository.getItemById` or slug match via repository list
- **Collections:** `contentRepository.listCollections` for the content type

Maps `ContentListItem` / `ContentItemView` → `EntityListRow` / `EntityRecord` via `adapters/normalize.ts`.

### Product adapter

- **List:** `productsDataService.listProductPickerEntries` or `getAllProducts` (with search)
- **Get:** `productsDataService.getProduct`
- **Collections:** `collectionsDataService.loadAll`

Maps `Product` / `ProductSummary` → unified shapes.

---

## Normalization rules

| Legacy field | Entity field |
|--------------|--------------|
| `ContentItem.attributes` | `EntityRecord.fields` |
| `ContentItemView.title` | `EntityRecord.title` |
| `Product.price`, `brand`, … | `EntityRecord.fields` |
| `productTitle` / `name` | `EntityRecord.title` |
| Cover image / `primary_image` | `thumbnailUrl` |

Resolvers (Phase 4) read **`EntityRecord`** via `entityService` and produce **ViewModels** for templates. Templates must not read `EntityRecord.fields` directly — see [view-model-resolvers.md](./view-model-resolvers.md).

---

## What is NOT in Phase 2

| Item | Phase |
|------|-------|
| ~~`entityService` write methods~~ | **Phase 3 — implemented** |
| Prisma table rename `Entity` / `EntityType` | Deferred post-Phase 3 |
| Portal preset adapters (team, partner, knowledge) | Phase 5 |
| Admin unified entity list UI | Phase 8 (optional spike deferred) |
| Mass refactor of existing call sites | Phases 3–4 |

---

## Phase 3 — Write API and migration

**Implemented:** `entityService.saveEntity`, `entityService.deleteEntity`

```typescript
await entityService.saveEntity({
  presetId: "product",
  slug: "widget-pro",
  fields: productPayload,
  localeCode: "en",
  collectionSlugs: ["electronics"],
});
```

**Cutover flags:** see [entity-migration-runbook.md](./entity-migration-runbook.md)

| Env | Effect |
|-----|--------|
| `AZURA_ENTITY_DUAL_WRITE=1` | Mirror Product saves to ContentItem |
| `AZURA_ENTITY_WRITE_PRIMARY=1` | `saveEntity` is primary write path |
| `AZURA_ENTITY_READ_CONTENT=1` | Reads prefer ContentItem for product preset |
| `AZURA_PRODUCT_TABLE_READONLY=1` | Block Product table writes |

**Deprecated (new code):** `productsDataService`, direct `productRepository` writes, `saveProductToDb` when write-primary is on.

**Docs:** [RFC-002](./rfc-002-catalog-storage-migration.md) · [entity-migration-runbook.md](./entity-migration-runbook.md)

---

## Migration guide for developers

### Do (new code)

```typescript
import { entityService } from "@/features/entities";

const items = await entityService.listEntities("destination");
const entity = await entityService.getEntity("property", slug, { locale });
```

### Do not (new code)

| Avoid | Use instead |
|-------|-------------|
| `productsDataService.getProduct` / `getAllProducts` | `entityService.getEntity("product", …)` |
| `contentPublicService.getItemByTypeAndSlug` (entity reads) | `entityService.getEntity(presetId, …)` |
| `contentRepository.listItems` / `listItemsAsListRows` (entity lists) | `entityService.listEntities(presetId, …)` |

Existing routes, blocks, and admin pages may keep legacy imports until their phase migration. Do not add **new** direct dependencies on legacy entity loaders.

---

## Errors

| Error | When |
|-------|------|
| `UnknownEntityPresetError` | Invalid `presetId` string |
| `EntityPresetNotActiveError` | Preset exists but `status: planned` |

---

## Tests

```bash
npx tsx --test src/features/entities/__tests__/preset-registry.test.ts
```

Covers preset manifest mappings and pure normalization functions.

---

## Related documents

- [domain-model.md](./domain-model.md) — Entity, EntityType, Collection definitions
- [glossary.md](./glossary.md) — Preset IDs and legacy mapping
- [admin-ia.md](./admin-ia.md) — Where admins manage each preset today
