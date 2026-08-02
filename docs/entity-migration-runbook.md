# Entity migration runbook (Phase 3)

Operational guide for **Product → ContentItem** migration. See [RFC-002](./rfc-002-catalog-storage-migration.md).

---

## Prerequisites

1. Phase 2 `entityService` deployed
2. Backup database
3. Staging dry-run completed

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run entities:inventory` | Row counts, slug collisions, search doc counts |
| `npm run entities:migrate-products` | Migrate Product → ContentItem |
| `npm run entities:migrate-products -- --dry-run` | Preview migrations |
| `npm run entities:verify-migration` | Parity checks |
| `npm run entities:reindex-products` | Reindex migrated items as CONTENT_ITEM |
| `npm run entities:reindex-products -- --remove-legacy` | Also delete CATALOG_PRODUCT search docs |
| `npm run entities:rollback-products` | Remove migrated ContentItem rows |

---

## Pilot gate

Before migration on production:

```http
GET /api/products?parity=1&locale=en
```

Response `parity.match` should be `true` (legacy vs `entityService` slug parity).

---

## Recommended cutover

### Stage 1 — Dual-write (no data migration yet)

```env
AZURA_ENTITY_DUAL_WRITE=1
```

Save a product in admin; verify ContentItem row appears under `products` type.

### Stage 2 — Bulk migrate

```bash
npm run entities:migrate-products
npm run entities:verify-migration
```

### Stage 3 — Read cutover

```env
AZURA_ENTITY_READ_CONTENT=1
```

Verify PDP, admin product list, search.

### Stage 4 — Write cutover

```env
AZURA_ENTITY_WRITE_PRIMARY=1
AZURA_ENTITY_DUAL_WRITE=0   # optional: stop Product table writes
```

### Stage 5 — Product table read-only

```env
AZURA_PRODUCT_TABLE_READONLY=1
```

### Stage 6 — Search

```bash
npm run entities:reindex-products -- --remove-legacy
npm run search:verify
```

---

## Rollback

1. `AZURA_ENTITY_WRITE_PRIMARY=0` and `AZURA_ENTITY_READ_CONTENT=0`
2. `npm run entities:rollback-products`
3. `npm run entities:verify-migration`

Product table data remains unless explicitly deleted.

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Missing products after read cutover | `entities:verify-migration`; re-run migrate |
| Search missing price/brand | `entities:reindex-products` |
| Save fails with read-only error | Enable `AZURA_ENTITY_WRITE_PRIMARY=1` |
| Slug collision | `entities:inventory` — resolve duplicate slugs before migrate |
