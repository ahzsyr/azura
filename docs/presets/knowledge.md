# Knowledge preset (`knowledge`)

**Status:** Active (Phase 5 Slice 1)  
**RFC:** [rfc-001-knowledge-base-reclassification.md](../rfc-001-knowledge-base-reclassification.md)

## Classification

| Layer | Value |
|-------|-------|
| Preset ID | `knowledge` |
| Storage | `portal` (Prisma: `KnowledgeBase`, `KnowledgeCategory`, `KnowledgeArticle`) |
| Admin | `/admin/knowledge-base` (Content group) |
| Package | `src/presets/knowledge/` |

## Templates

| templateId | Status | ViewModel |
|------------|--------|-----------|
| `knowledge-article-card` | active | `KnowledgeArticleCardViewModel` |
| `knowledge-article-detail` | active | `KnowledgeArticleDetailViewModel` |
| `knowledge-category-list` | planned | — |

## Block binding

`knowledgeBase` block props:

```ts
{
  presetId: "knowledge",              // default
  templateId: "knowledge-article-card", // optional
  knowledgeBaseSlug: "help",
  categorySlug: "",
  limit: 0,
  showSearch: true,
  showCategories: true,
  showRatings: true,
}
```

Resolver: `resolveKnowledgeArticlesForBlock` → `entityService` + `KnowledgeArticleCardTemplate`.

## Capabilities (deferred)

| Capability | Phase | Notes |
|------------|-------|-------|
| Search | 6 | Client-side filter in `KnowledgeBaseView` until Search Capability profile |
| Versioning | 6 | Article history — no preset-local store |

## Translation

Legacy `entityType` strings unchanged in DB: `KnowledgeArticle`, `KnowledgeCategory`, `KnowledgeBase`.  
Preset bridge: `PRESET_ENTITY_ALIASES.knowledge` in `entity-registry.ts`.

## Module boundary

**documentation** module (`documentationNav` block) and **status-page** module remain separate — not part of this preset.
