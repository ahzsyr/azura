import { isDescendantOrSelf } from "@/features/collections/collection-navigation";
import type { Collection } from "@/features/collections/types";
import type { ProductConditionOption } from "../types";
import type { ListingFilterState, ProductListingRecord } from "./types";

export type FilterListingOptions = {
  collectionScopeBySlug?: Map<string, Pick<Collection, "slug" | "parentSlug">>;
  listingMode?: "product" | "collection";
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

export function filterListingCatalog(
  records: ProductListingRecord[],
  state: ListingFilterState,
  fuzzyMatchSlugs?: Set<string>,
  options?: FilterListingOptions,
): ProductListingRecord[] {
  const scope = state.collectionScope?.trim() || null;
  const scopeBySlug = options?.collectionScopeBySlug;

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

    if (state.categories.length > 0) {
      const cat = r.category ?? "";
      if (!state.categories.includes(cat)) return false;
    }

    if (state.brands.length > 0) {
      if (!r.brand || !state.brands.includes(r.brand)) return false;
    }

    if (state.collections.length > 0) {
      if (!state.collections.some((s) => r.collectionSlugs.includes(s))) return false;
    }

    if (state.tags.length > 0) {
      const tagSet = new Set(r.tags.map(normTag));
      if (!state.tags.some((t) => tagSet.has(normTag(t)))) return false;
    }

    if (state.conditions.length > 0) {
      if (!state.conditions.some((c) => r.conditions.includes(c as ProductConditionOption))) return false;
    }

    for (const [type, selected] of Object.entries(state.variations)) {
      if (!selected.length) continue;
      const available = r.variationFacets[type] ?? [];
      if (!selected.some((opt) => available.includes(opt))) return false;
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