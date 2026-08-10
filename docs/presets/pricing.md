# Pricing preset (`pricing`)

**Status:** Active (Phase 5 Slice 3)

## Classification

| Layer | Value |
|-------|-------|
| Preset ID | `pricing` |
| Storage | `portal` (Prisma: `PricingPlanSet`, `PricingPlanFeature`, `PricingPlan`) |
| Admin | `/admin/pricing-plans` (Content group) |
| Package | `src/presets/pricing/` |

## Templates

| templateId | Status | ViewModel |
|------------|--------|-----------|
| `plan-card` | active | `PricingPlanCardViewModel` |
| `plan-compare` | planned | — |

## Block binding

`pricing` block props (`source=planSet` only):

```ts
{
  source: "planSet",
  planSetSlug: "saas",
  presetId: "pricing",       // optional
  templateId: "plan-card",   // optional
  layout: "cards",
  highlightedPlanId: "",
  limit: 3,
}
```

Resolver: `resolvePricingPlansForBlock` → `entityService` + `PlanCardTemplate`.

`source=packages` (catalog/destination) is unchanged in Slice 3 — no `presetId` on that path.

`pricingCalculator` block is a separate feature (unchanged).

## Entity notes

- `PricingPlan` has no slug — `EntityRef.slug` uses entity `id`.
- Container scoped by `pricingPlanSetSlug` / `planSetSlug`.
- `PricingPlanFeature` rows are comparison matrix labels (collection layer).

## Translation

Legacy `entityType` strings: `PricingPlan`, `PricingPlanFeature`, `PricingPlanSet`.  
Preset bridge: `PRESET_ENTITY_ALIASES.pricing`.

## Admin writes

Read path uses `entityService` + adapter; writes remain on `pricingPlanSetService`.

## Capabilities (deferred)

Billing toggle stays client-side in `PricingTableView`; table layout builds matrix from `features` + `planViewModels[].featureValues`.
