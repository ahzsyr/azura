/**
 * Variation selection + combination pricing for the product detail page.
 */
import type { Product, ProductConditionOption } from "@/features/products/types";
import type { ProductVariationCombination } from "./product-page-display";
import { buildDisplayPrices } from "./currency/display";
import type { ShopperCurrencyContext } from "./currency/types";
import type { ProductPrice } from "@/features/products/types";

export interface VariationDimension {
  type: string;
  options: string[];
  default: string;
}

export interface DisplayPriceMatrixEntry {
  selected: Record<string, string>;
  sku?: string;
  storePrice: number;
  storeCompare: number | null;
  displaySale: number;
  displayCompare: number | null;
}

export interface ProductPriceMatrixPayload {
  base: { displaySale: number; displayCompare: number | null; displayCode: string; numberLocale: string };
  entries: DisplayPriceMatrixEntry[];
  dimensions: VariationDimension[];
}

function optionLabel(option: string | { value?: string }): string {
  if (typeof option === "string") return option;
  return option.value ?? "";
}

/** Build variation dimensions from product.variations + condition_options. */
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
      default: conditions[0],
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

function storePriceForCombination(
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
      combo.old_price != null && Number.isFinite(combo.old_price) && combo.old_price > 0
        ? combo.old_price
        : baseCompare;
    return { price, compare, sku: combo.sku };
  }

  if (typeof combo.price_adjustment === "number" && Number.isFinite(combo.price_adjustment)) {
    return { price: base + combo.price_adjustment, compare: baseCompare, sku: combo.sku };
  }

  return { price: base, compare: baseCompare, sku: combo.sku };
}

export function findMatchingCombination(
  combinations: ProductVariationCombination[] | undefined,
  dimensions: VariationDimension[],
  selected: Record<string, string>,
): ProductVariationCombination | undefined {
  if (!combinations?.length || !dimensions.length) return undefined;
  const types = dimensions.map((d) => d.type);
  return combinations.find((c) => types.every((t) => c[t] === selected[t]));
}

/** Precompute display-currency prices for each combination (or single base when no combos). */
export function buildProductPriceMatrix(
  ctx: ShopperCurrencyContext,
  product: Product & { variation_combinations?: ProductVariationCombination[] },
): ProductPriceMatrixPayload {
  const dimensions = buildVariationDimensions(product);
  const combinations = product.variation_combinations ?? [];
  const baseDisplay = buildDisplayPrices(ctx, product.price, product.old_price);

  const entries: DisplayPriceMatrixEntry[] = [];

  if (combinations.length > 0 && dimensions.length > 0) {
    for (const combo of combinations) {
      const selected: Record<string, string> = {};
      for (const d of dimensions) {
        const val = combo[d.type];
        if (typeof val === "string") selected[d.type] = val;
      }
      if (Object.keys(selected).length < dimensions.length) continue;
      const store = storePriceForCombination(product, combo);
      const priceObj: ProductPrice = { value: store.price, currency: product.price.currency };
      const disp = buildDisplayPrices(ctx, priceObj, store.compare);
      entries.push({
        selected,
        sku: store.sku,
        storePrice: store.price,
        storeCompare: store.compare,
        displaySale: disp.sale,
        displayCompare: disp.compare,
      });
    }
  }

  if (!entries.length) {
    const selected = initialSelectedFromDimensions(dimensions);
    entries.push({
      selected,
      sku: product.mpn ?? product.manufacturer_part_number,
      storePrice: product.price.value,
      storeCompare: baseDisplay.compare != null ? product.old_price ?? null : null,
      displaySale: baseDisplay.sale,
      displayCompare: baseDisplay.compare,
    });
  }

  return {
    base: {
      displaySale: baseDisplay.sale,
      displayCompare: baseDisplay.compare,
      displayCode: baseDisplay.displayCode,
      numberLocale: baseDisplay.numberLocale,
    },
    entries,
    dimensions,
  };
}

export function matrixEntryForSelected(
  matrix: ProductPriceMatrixPayload,
  selected: Record<string, string>,
): DisplayPriceMatrixEntry {
  const hit = matrix.entries.find((e) =>
    matrix.dimensions.every((d) => e.selected[d.type] === selected[d.type]),
  );
  return hit ?? matrix.entries[0]!;
}

const COMBO_META_KEYS = new Set(["sku", "price", "old_price", "price_adjustment"]);

/** Human-readable mix label, e.g. "EU & Red & new". */
export function formatCombinationLabel(
  selected: Record<string, string>,
  dimensions?: VariationDimension[],
): string {
  if (dimensions?.length) {
    return dimensions.map((d) => selected[d.type] ?? "").filter(Boolean).join(" & ");
  }
  return Object.entries(selected)
    .filter(([k]) => !COMBO_META_KEYS.has(k))
    .map(([, v]) => v)
    .filter(Boolean)
    .join(" & ");
}

function combinationKey(
  dimensions: VariationDimension[],
  row: ProductVariationCombination,
): string {
  return dimensions.map((d) => `${d.type}::${row[d.type] ?? ""}`).join("|");
}

/** Generate combination rows without prices (inherit base from Pricing & Stock). */
export function generateVariationCombinations(product: Product): ProductVariationCombination[] {
  const dims = buildVariationDimensions(product);
  if (!dims.length) return [];

  const combos: ProductVariationCombination[] = [];

  function walk(idx: number, acc: Record<string, string>) {
    if (idx >= dims.length) {
      combos.push({
        ...acc,
        sku: product.mpn,
      });
      return;
    }
    const dim = dims[idx]!;
    for (const opt of dim.options) {
      walk(idx + 1, { ...acc, [dim.type]: opt });
    }
  }
  walk(0, {});
  return combos;
}

/** Regenerate cartesian combos; preserve sku/price/old_price on matching dimension keys. */
export function mergeVariationCombinations(
  product: Product,
  existing: ProductVariationCombination[] | undefined,
): ProductVariationCombination[] {
  const dims = buildVariationDimensions(product);
  const fresh = generateVariationCombinations(product);
  if (!dims.length) return [];
  if (!existing?.length) return fresh;

  const byKey = new Map<string, ProductVariationCombination>();
  for (const row of existing) {
    byKey.set(combinationKey(dims, row), row);
  }

  return fresh.map((row) => {
    const prev = byKey.get(combinationKey(dims, row));
    if (!prev) return row;
    const merged: ProductVariationCombination = { ...row };
    if (prev.sku != null && String(prev.sku).trim()) merged.sku = prev.sku;
    if (isSetComboPrice(prev.price)) merged.price = Number(prev.price);
    if (prev.old_price != null && Number.isFinite(Number(prev.old_price))) {
      merged.old_price = Number(prev.old_price);
    }
    if (typeof prev.price_adjustment === "number" && Number.isFinite(prev.price_adjustment)) {
      merged.price_adjustment = prev.price_adjustment;
    }
    return merged;
  });
}

export type { ProductConditionOption };
