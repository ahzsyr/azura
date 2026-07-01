import type { Product, ProductConditionOption } from "@/features/products/types";
import type { ProductVariationCombination } from "@/features/products/types";

export type VariationDimension = {
  type: string;
  options: string[];
  default: string;
};

function optionLabel(option: string | { value?: string }): string {
  if (typeof option === "string") return option;
  return option.value ?? "";
}

export function buildVariationDimensions(product: Product): VariationDimension[] {
  const dims: VariationDimension[] = [];
  for (const v of product.variations ?? []) {
    const type = v.type ?? "Option";
    const opts = (v.options ?? []).map((o) => optionLabel(o as string | { value?: string }));
    if (!opts.length) continue;
    const def = v.default?.trim() || opts[0];
    dims.push({ type, options: opts, default: def });
  }
  const conditions = product.condition_options ?? [];
  if (conditions.length > 0 && !dims.some((d) => d.type.toLowerCase() === "condition")) {
    dims.push({
      type: "Condition",
      options: conditions as string[],
      default: conditions[0] as ProductConditionOption,
    });
  }
  return dims;
}

export function initialSelectedFromDimensions(dimensions: VariationDimension[]): Record<string, string> {
  const selected: Record<string, string> = {};
  for (const d of dimensions) {
    selected[d.type] = d.default;
  }
  return selected;
}

function isSetComboPrice(value: unknown): value is number {
  if (value === null || value === undefined || value === "") return false;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n);
}

export function priceForSelection(
  product: Product,
  combo: ProductVariationCombination | undefined,
): { price: number; compare: number | null; sku?: string } {
  const base = product.price.value;
  const baseCompare =
    product.old_price != null && Number.isFinite(product.old_price) && product.old_price > 0
      ? product.old_price
      : null;

  if (!combo) return { price: base, compare: baseCompare, sku: product.mpn };

  if (isSetComboPrice(combo.price)) {
    const price = Number(combo.price);
    const compare =
      combo.old_price != null && Number.isFinite(Number(combo.old_price)) && Number(combo.old_price) > 0
        ? Number(combo.old_price)
        : baseCompare;
    return { price, compare, sku: typeof combo.sku === "string" ? combo.sku : undefined };
  }

  if (typeof combo.price_adjustment === "number" && Number.isFinite(combo.price_adjustment)) {
    return { price: base + combo.price_adjustment, compare: baseCompare, sku: typeof combo.sku === "string" ? combo.sku : undefined };
  }

  return { price: base, compare: baseCompare, sku: product.mpn };
}

export function findMatchingCombination(
  combinations: ProductVariationCombination[] | undefined,
  dimensions: VariationDimension[],
  selected: Record<string, string>,
): ProductVariationCombination | undefined {
  if (!combinations?.length) return undefined;
  return combinations.find((combo) => {
    const attrs = combo.attributes ?? combo;
    if (!attrs || typeof attrs !== "object") return false;
    const map = attrs as Record<string, unknown>;
    return dimensions.every((d) => {
      const key = d.type;
      const val = selected[key];
      const comboVal = map[key] ?? map[key.toLowerCase()];
      return String(comboVal ?? "").trim() === val;
    });
  });
}