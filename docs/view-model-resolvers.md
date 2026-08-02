# ViewModel resolvers (Phase 4–5)

**Status:** Product + content preset slices shipped; knowledge, team-member, partner, and pricing presets (Phase 5 Slices 1–3) shipped.

## Pipeline

```text
entityService.getEntity / listEntities
  → resolveViewModel(presetId, templateId, entityId, ctx)
  → ViewModel (serializable)
  → Template component (ViewModel only)
```

| Module | Path |
|--------|------|
| ViewModel types | `src/view-models/` |
| Resolvers | `src/resolvers/` |
| Template registry | `src/templates/registry.ts` |
| Template renderers | `src/templates/product/`, `src/templates/content-preset/`, `src/templates/knowledge/`, `src/templates/team-member/`, `src/templates/partner/`, `src/templates/pricing/` |
| Block packages | `src/features/builder/blocks/{content,marketing,conversion,discovery,media,commerce,portal}/` |

## Active templates

| templateId | presetId | Resolver | Template |
|------------|----------|----------|----------|
| `product-card` | `product` | `resolveProductCardViewModel` | `ProductCardTemplate` |
| `product-detail` | `product` | `resolveProductDetailViewModel` | `ProductDetailTemplate` |
| `destination-card` | `destination` | `resolveContentPresetCardViewModel` | `ContentPresetCardTemplate` |
| `destination-detail` | `destination` | `resolveContentPresetDetailViewModel` | `ContentPresetDetailTemplate` |
| `service-card` | `service` | `resolveContentPresetCardViewModel` | `ContentPresetCardTemplate` |
| `service-detail` | `service` | `resolveContentPresetDetailViewModel` | `ContentPresetDetailTemplate` |
| `property-card` | `property` | `resolveContentPresetCardViewModel` | `ContentPresetCardTemplate` |
| `property-detail` | `property` | `resolveContentPresetDetailViewModel` | `ContentPresetDetailTemplate` |
| `knowledge-article-card` | `knowledge` | `resolveKnowledgeArticleCardViewModel` | `KnowledgeArticleCardTemplate` |
| `knowledge-article-detail` | `knowledge` | `resolveKnowledgeArticleDetailViewModel` | `KnowledgeArticleDetailTemplate` |
| `member-card` | `team-member` | `resolveTeamMemberCardViewModel` | `MemberCardTemplate` |
| `partner-card` | `partner` | `resolvePartnerCardViewModel` | `PartnerCardTemplate` |
| `plan-card` | `pricing` | `resolvePricingPlanCardViewModel` | `PlanCardTemplate` |

Planned stubs (`knowledge-category-list`, `plan-compare`, `product-compare`, …) remain in `src/templates/registry.ts`.

## Resolver API

```ts
import {
  resolveViewModel,
  resolveViewModelsForSelection,
  resolveViewModelsForContentList,
} from "@/resolvers";

await resolveViewModel("destination", "destination-card", entityId, {
  locale: "en",
  localePrefix: "en",
  displaySettings,
  compareProps,
});

await resolveViewModelsForContentList("destination", "destination-card", blockConfig, ctx);
```

### ResolverContext (content fields)

| Field | Used by |
|-------|---------|
| `displaySettings` | Content preset cards |
| `compareProps` | Compare overlay on cards |
| `contentTypeSlug` | Href + field mapping |

## Content preset cards

**Inputs:** `EntityRecord` from `entityService`, translations, display settings.

**Output:** `ContentPresetCardViewModel` — flattened title, excerpt, href, image, price/duration/city/stars/icon as applicable. **No `attributes` bag.**

**Consumers:** `ContentPresetCardTemplate`, `ContentListBlockRenderer`, `ContentListPage`, `ContentCard` (optional `viewModel`).

Preset → content type mapping via [`preset-template-map.ts`](../src/templates/preset-template-map.ts).

## Content preset detail

**Inputs:** `ContentItemView` loaded in resolver (not template), `ContentTypeView`, path.

**Output:** `ContentPresetDetailViewModel` — localized copy, media, `attributeSections`, blocks, inquiry/compare flags.

**Consumers:** `ContentDetailPage` → `ContentPresetDetailTemplate`.

`serializeContentItem` / `ContentItemView` remain as deprecated internal shims in `content-public.service`.

## Block binding

### Product blocks

```ts
{ presetId: "product", templateId: "product-card", source: "collection", ... }
```

### Content list blocks

```ts
{
  presetId: "destination",           // optional — derived from contentTypeSlug
  templateId: "destination-card",    // optional — derived from preset
  contentTypeSlug: "catalog-items",  // backward compatible
  collectionSlug: "...",
  ...
}
```

Schema: [`content-list-block.ts`](../src/features/content/schemas/content-list-block.ts).

### Knowledge base block

```ts
{
  presetId: "knowledge",
  templateId: "knowledge-article-card",
  knowledgeBaseSlug: "help",
  categorySlug: "",
  limit: 0,
}
```

Schema: [`portal-blocks.ts`](../src/features/portal-blocks/schemas/portal-blocks.ts).  
Resolver: [`resolve-knowledge-articles-for-block.ts`](../src/presets/knowledge/resolve-knowledge-articles-for-block.ts).

### Team directory block

```ts
{
  presetId: "team-member",
  templateId: "member-card",
  teamDirectorySlug: "company",
  departmentId: "",
  limit: 0,
}
```

Resolver: [`resolve-team-members-for-block.ts`](../src/presets/team-member/resolve-team-members-for-block.ts).

### Partner directory block

```ts
{
  presetId: "partner",
  templateId: "partner-card",
  partnerProgramSlug: "alliances",
  categorySlug: "",
  locationFilter: "",
  limit: 0,
}
```

Resolver: [`resolve-partners-for-block.ts`](../src/presets/partner/resolve-partners-for-block.ts).

### Pricing block (`source=planSet`)

```ts
{
  source: "planSet",
  presetId: "pricing",
  templateId: "plan-card",
  planSetSlug: "saas",
  layout: "cards",
  highlightedPlanId: "",
  limit: 3,
}
```

Schema: [`pricing-blocks.ts`](../src/features/pricing-plans/schemas/pricing-blocks.ts).  
Resolver: [`resolve-pricing-plans-for-block.ts`](../src/presets/pricing/resolve-pricing-plans-for-block.ts).

`source=packages` path is unchanged (catalog packages, no preset binding).

## Fitness Test 4

Templates under `src/templates/**` must not import storage layers.

```bash
npm run lint:templates
```

## Tests

```bash
npm run test:resolvers
```

## Deferred

- `product-compare` template
- `plan-compare` template
- `knowledge-category-list` template
- Remove `ContentItemView` from public API entirely
- Search Capability wiring for portal directory blocks (Phase 6)
