import { isDescendantOrSelf } from "@/features/collections/collection-navigation";
import type { Collection } from "@/features/collections/types";
import {
  buildCategoryFacetIndex,
  recordMatchesCategoryFacetValue,
  type CategoryTaxonomyNode,
} from "@/features/categories/resolve-category-for-facet";
import type { ProductConditionOption } from "../types";
import type { ListingFilterState, ProductListingRecord } from "./types";

export type FilterListingOptions = {
  collectionScopeBySlug?: Map<string, Pick<Collection, "slug" | "parentSlug">>;
  listingMode?: "product" | "collection";
  /** Full taxonomy (incl. hidden) so Category facet filters resolve to settings Categories. */
  categoryTaxonomy?: CategoryTaxonomyNode[];
};

function normTag(s: string): string {
  return s.trim().toLowerCase();
}

function matchesQuery(record: ProductListingRecord, q: string, fuzzySlugs?: Set<string>): boolean {
  const trimmed = q.trim();
  if (!trimmed) return true;
  if (fuzzySlugs?.has(record.slug)) return true;
  const ql = trimmed.toLowerCase();
  return record.searchText.includes(ql);
}

function matchesCategories(
  r: ProductListingRecord,
  categories: string[],
  categoryIndex: ReturnType<typeof buildCategoryFacetIndex> | null,
): boolean {
  if (categories.length === 0) return true;
  if (categoryIndex) {
    return categories.some((selected) => recordMatchesCategoryFacetValue(r, selected, categoryIndex));
  }
  const cat = r.category ?? "";
  return categories.includes(cat);
}

function matchesBrands(r: ProductListingRecord, brands: string[]): boolean {
  if (brands.length === 0) return true;
  return !!r.brand && brands.includes(r.brand);
}

function matchesCollections(r: ProductListingRecord, collections: string[]): boolean {
  if (collections.length === 0) return true;
  return collections.some((s) => r.collectionSlugs.includes(s));
}

function matchesTags(r: ProductListingRecord, tags: string[]): boolean {
  if (tags.length === 0) return true;
  const tagSet = new Set(r.tags.map(normTag));
  return tags.some((t) => tagSet.has(normTag(t)));
}

function matchesConditions(r: ProductListingRecord, conditions: string[]): boolean {
  if (conditions.length === 0) return true;
  return conditions.some((c) => r.conditions.includes(c as ProductConditionOption));
}

function matchesVariations(
  r: ProductListingRecord,
  variations: Record<string, string[]>,
): boolean {
  const entries = Object.entries(variations).filter(([, selected]) => selected.length > 0);
  if (entries.length === 0) return true;
  return entries.every(([type, selected]) => {
    const available = r.variationFacets[type] ?? [];
    return selected.some((opt) => available.includes(opt));
  });
}

function hasFacetDimensions(state: ListingFilterState): boolean {
  if (state.categories.length > 0) return true;
  if (state.brands.length > 0) return true;
  if (state.collections.length > 0) return true;
  if (state.tags.length > 0) return true;
  if (state.conditions.length > 0) return true;
  for (const opts of Object.values(state.variations)) {
    if (opts.length > 0) return true;
  }
  return false;
}

function matchesFacetDimensionsOr(
  r: ProductListingRecord,
  state: ListingFilterState,
  categoryIndex: ReturnType<typeof buildCategoryFacetIndex> | null,
): boolean {
  const checks: boolean[] = [];
  if (state.categories.length > 0) {
    checks.push(matchesCategories(r, state.categories, categoryIndex));
  }
  if (state.brands.length > 0) {
    checks.push(matchesBrands(r, state.brands));
  }
  if (state.collections.length > 0) {
    checks.push(matchesCollections(r, state.collections));
  }
  if (state.tags.length > 0) {
    checks.push(matchesTags(r, state.tags));
  }
  if (state.conditions.length > 0) {
    checks.push(matchesConditions(r, state.conditions));
  }
  const varEntries = Object.entries(state.variations).filter(([, selected]) => selected.length > 0);
  if (varEntries.length > 0) {
    checks.push(
      varEntries.some(([type, selected]) => {
        const available = r.variationFacets[type] ?? [];
        return selected.some((opt) => available.includes(opt));
      }),
    );
  }
  return checks.length === 0 || checks.some(Boolean);
}

export function filterListingCatalog(
  records: ProductListingRecord[],
  state: ListingFilterState,
  fuzzyMatchSlugs?: Set<string>,
  options?: FilterListingOptions,
): ProductListingRecord[] {
  const scope = state.collectionScope?.trim() || null;
  const scopeBySlug = options?.collectionScopeBySlug;
  const categoryIndex = options?.categoryTaxonomy?.length
    ? buildCategoryFacetIndex(options.categoryTaxonomy)
    : null;
  const useOr = state.logic === "or" && hasFacetDimensions(state);

  return records.filter((r) => {
    if (!matchesQuery(r, state.q, fuzzyMatchSlugs)) return false;

    if (scope && scopeBySlug) {
      const bySlug = scopeBySlug as Map<string, Collection>;
      const listingMode = options?.listingMode ?? "collection";
      if (listingMode === "collection") {
        if (!isDescendantOrSelf(r.slug, scope, bySlug)) return false;
      } else {
        const slugs = r.collectionSlugs?.length ? r.collectionSlugs : [];
        if (!slugs.some((s) => isDescendantOrSelf(s, scope, bySlug))) return false;
      }
    }

    if (useOr) {
      if (!matchesFacetDimensionsOr(r, state, categoryIndex)) return false;
    } else {
      if (!matchesCategories(r, state.categories, categoryIndex)) return false;
      if (!matchesBrands(r, state.brands)) return false;
      if (!matchesCollections(r, state.collections)) return false;
      if (!matchesTags(r, state.tags)) return false;
      if (!matchesConditions(r, state.conditions)) return false;
      if (!matchesVariations(r, state.variations)) return false;
    }

    if (state.priceMin != null && r.priceMax < state.priceMin) return false;
    if (state.priceMax != null && r.priceMin > state.priceMax) return false;

    if (state.stockOnly && !r.in_stock) return false;

    return true;
  });
}

export function paginateListing<T>(
  items: T[],
  page: number,
  per: number,
): { items: T[]; total: number; totalPages: number; firstItem: number; lastItem: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / per));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * per;
  const slice = items.slice(start, start + per);
  const firstItem = total === 0 ? 0 : start + 1;
  const lastItem = Math.min(start + per, total);
  return { items: slice, total, totalPages, firstItem, lastItem };
}
