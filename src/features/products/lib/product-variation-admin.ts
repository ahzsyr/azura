/**
 * Admin helpers: Condition group ↔ condition_options sync and load-time migration.
 */
import type { Product, ProductConditionOption, ProductVariation } from "@/features/products/types";

const CONDITION_TYPE = "condition";

export function hasConditionVariationGroup(variations: ProductVariation[] | undefined): boolean {
  return (variations ?? []).some((v) => (v.type ?? "").trim().toLowerCase() === CONDITION_TYPE);
}

export function findConditionVariationIndex(variations: ProductVariation[] | undefined): number {
  return (variations ?? []).findIndex((v) => (v.type ?? "").trim().toLowerCase() === CONDITION_TYPE);
}

/** Surface Condition as a variation group when only legacy condition_options exist. */
export function variationsForAdminEditor(product: Product): ProductVariation[] {
  const variations = [...(product.variations ?? [])];
  if (hasConditionVariationGroup(variations)) return variations;

  const legacy = product.condition_options ?? [];
  if (!legacy.length) return variations;

  const options = legacy.map((o) => String(o));
  return [
    ...variations,
    {
      type: "Condition",
      options,
      default: options[0] ?? "new",
    },
  ];
}

export function needsConditionGroupMigration(product: Product): boolean {
  return (
    (product.condition_options?.length ?? 0) > 0 && !hasConditionVariationGroup(product.variations)
  );
}

export function createConditionVariationGroup(
  options: ProductConditionOption[] = ["new", "used", "refurbished"],
): ProductVariation {
  const opts = options.map(String);
  return {
    type: "Condition",
    options: opts,
    default: opts[0] ?? "new",
  };
}

/** Sync condition_options from a Condition variation group before save. */
export function syncConditionOptionsFromVariations(product: Product): Product {
  const variations = product.variations ?? [];
  const idx = findConditionVariationIndex(variations);
  if (idx < 0) return product;

  const group = variations[idx]!;
  const options = (group.options ?? [])
    .map((o) => String(o).trim())
    .filter(Boolean) as ProductConditionOption[];

  if (!options.length) return product;

  return {
    ...product,
    condition_options: options,
  };
}
