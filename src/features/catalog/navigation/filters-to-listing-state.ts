import {
  collectRuleLeaves,
  isMultiValueOperator,
  isUnaryOperator,
  type MatchingRuleOperator,
  type RuleLeaf,
} from "@/features/categories/matching";
import type { ListingFilterState } from "@/features/products/listing/types";
import { normalizeNavFilters } from "./normalize-nav-filters";
import type { CatalogNavigationItemFilters } from "./types";

const EMPTY_LISTING_FILTER: ListingFilterState = {
  q: "",
  categories: [],
  brands: [],
  collections: [],
  collectionScope: null,
  tags: [],
  conditions: [],
  variations: {},
  priceMin: null,
  priceMax: null,
  stockOnly: false,
  page: 1,
  per: 20,
};

function pushUnique(list: string[], value: string): void {
  const v = value.trim();
  if (!v || list.includes(v)) return;
  list.push(v);
}

function leafValues(leaf: RuleLeaf): string[] {
  if (isUnaryOperator(leaf.operator)) return [];
  if (isMultiValueOperator(leaf.operator) && leaf.values?.length) {
    return leaf.values.map((v) => String(v).trim()).filter(Boolean);
  }
  if (leaf.value != null && String(leaf.value).trim() !== "") {
    return [String(leaf.value).trim()];
  }
  return [];
}

/** Operators that contribute positive inclusion facets to the listing URL. */
function isInclusiveOperator(op: MatchingRuleOperator): boolean {
  return (
    op === "equals" ||
    op === "contains" ||
    op === "starts_with" ||
    op === "ends_with" ||
    op === "matches" ||
    op === "in" ||
    op === "contains_any" ||
    op === "contains_all"
  );
}

function parseSpecVariation(raw: string): { type: string; option: string } | null {
  const idx = raw.indexOf(":");
  if (idx <= 0) return null;
  const type = raw.slice(0, idx).trim();
  const option = raw.slice(idx + 1).trim();
  if (!type || !option) return null;
  return { type, option };
}

function applyLeaf(
  leaf: RuleLeaf,
  bags: {
    categories: string[];
    brands: string[];
    tags: string[];
    conditions: string[];
    collections: string[];
    variations: Record<string, string[]>;
    priceMin: number | null;
    priceMax: number | null;
    stockOnly: boolean;
  },
): void {
  const field = leaf.field.trim();
  const op = leaf.operator;

  if (field === "price") {
    if (op === "between" && leaf.values && leaf.values.length >= 2) {
      const min = Number(leaf.values[0]);
      const max = Number(leaf.values[1]);
      if (Number.isFinite(min)) bags.priceMin = min;
      if (Number.isFinite(max)) bags.priceMax = max;
      return;
    }
    const n = Number(leaf.value);
    if (!Number.isFinite(n)) return;
    if (op === "greater_than" || op === "greater_than_or_equal") bags.priceMin = n;
    if (op === "less_than" || op === "less_than_or_equal") bags.priceMax = n;
    if (op === "equals") {
      bags.priceMin = n;
      bags.priceMax = n;
    }
    return;
  }

  if (field === "stock") {
    const vals = leafValues(leaf).map((v) => v.toLowerCase());
    if (
      op === "equals" ||
      op === "contains" ||
      op === "in" ||
      op === "contains_any" ||
      op === "is_true"
    ) {
      if (op === "is_true" || vals.some((v) => v.includes("in-stock") || v === "in_stock")) {
        bags.stockOnly = true;
      }
    }
    return;
  }

  if (!isInclusiveOperator(op)) return;
  const values = leafValues(leaf);
  if (!values.length) return;

  const pushAll = (list: string[]) => {
    for (const v of values) pushUnique(list, v);
  };

  switch (field) {
    case "category":
    case "categories":
      pushAll(bags.categories);
      break;
    case "brand":
      pushAll(bags.brands);
      break;
    case "tag":
    case "tags":
      pushAll(bags.tags);
      break;
    case "condition":
      pushAll(bags.conditions);
      break;
    case "collection":
      pushAll(bags.collections);
      break;
    case "specification":
    case "variation":
    case "attribute": {
      for (const v of values) {
        const parsed = parseSpecVariation(v);
        if (!parsed) continue;
        if (!bags.variations[parsed.type]) bags.variations[parsed.type] = [];
        pushUnique(bags.variations[parsed.type]!, parsed.option);
      }
      break;
    }
    default: {
      if (field.startsWith("spec:")) {
        const type = field.slice("spec:".length).trim();
        if (!type) break;
        if (!bags.variations[type]) bags.variations[type] = [];
        for (const v of values) pushUnique(bags.variations[type]!, v);
      }
      break;
    }
  }
}

/**
 * Compile Matching Rules (or legacy flat filters) into a partial ListingFilterState
 * for catalog-navigation filter URLs.
 */
export function filtersToListingState(
  filters: CatalogNavigationItemFilters | null | undefined,
): Partial<ListingFilterState> {
  const root = normalizeNavFilters(filters);
  const leaves = collectRuleLeaves(root);
  if (!leaves.length) return {};

  const holder = {
    categories: [] as string[],
    brands: [] as string[],
    tags: [] as string[],
    conditions: [] as string[],
    collections: [] as string[],
    variations: {} as Record<string, string[]>,
    priceMin: null as number | null,
    priceMax: null as number | null,
    stockOnly: false,
  };
  for (const leaf of leaves) {
    applyLeaf(leaf, holder);
  }

  const out: Partial<ListingFilterState> = {};
  if (holder.categories.length) out.categories = holder.categories;
  if (holder.brands.length) out.brands = holder.brands;
  if (holder.tags.length) out.tags = holder.tags;
  if (holder.conditions.length) out.conditions = holder.conditions;
  if (holder.collections.length) out.collections = holder.collections;
  if (Object.keys(holder.variations).length) out.variations = holder.variations;
  if (holder.priceMin != null) out.priceMin = holder.priceMin;
  if (holder.priceMax != null) out.priceMax = holder.priceMax;
  if (holder.stockOnly) out.stockOnly = true;
  if (root.match === "any") out.logic = "or";

  return out;
}

/** Merge partial nav filters onto a base listing state (page/path context). */
export function mergeListingFilterPartial(
  base: ListingFilterState,
  partial: Partial<ListingFilterState>,
): ListingFilterState {
  return {
    ...base,
    ...partial,
    categories: partial.categories ?? base.categories,
    brands: partial.brands ?? base.brands,
    collections: partial.collections ?? base.collections,
    tags: partial.tags ?? base.tags,
    conditions: partial.conditions ?? base.conditions,
    variations: partial.variations ?? base.variations,
    collectionScope:
      partial.collectionScope !== undefined ? partial.collectionScope : base.collectionScope,
    logic: partial.logic ?? base.logic,
  };
}

export function emptyListingFilterState(): ListingFilterState {
  return { ...EMPTY_LISTING_FILTER, variations: {} };
}

/** Build a full ListingFilterState from nav filters alone (page 1, no path scope). */
export function listingStateFromNavFilters(
  filters: CatalogNavigationItemFilters | null | undefined,
): ListingFilterState {
  return mergeListingFilterPartial(emptyListingFilterState(), filtersToListingState(filters));
}
