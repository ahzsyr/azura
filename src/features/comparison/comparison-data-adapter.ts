import "server-only";

import {
  fetchCompareItems,
  searchCompareCandidates,
} from "@/features/comparison/comparison-data.service";
import {
  fetchProductCompareBundle,
  searchProductCompareCandidates,
} from "@/features/comparison/product-comparison.service";
import { PRODUCT_COMPARE_SLUG } from "@/features/comparison/product-comparison.constants";
import type {
  CompareItemSnapshot,
  CompareRowEntry,
  CompareViewMode,
} from "@/features/comparison/types";

export type CompareLoadResult = {
  items: CompareItemSnapshot[];
  specEntries: CompareRowEntry[];
};

export type CompareSearchFilters = {
  collection?: string;
  tags?: string[];
};

export async function loadCompareBundle(
  contentTypeSlug: string,
  ids: string[],
  localePrefix: string,
  mode: CompareViewMode
): Promise<CompareLoadResult> {
  if (contentTypeSlug === PRODUCT_COMPARE_SLUG) {
    return fetchProductCompareBundle(ids, localePrefix, mode);
  }
  const items = await fetchCompareItems(contentTypeSlug, ids);
  return { items, specEntries: [] };
}

export async function searchCompareItems(
  contentTypeSlug: string,
  localePrefix: string,
  query: string,
  limit: number,
  filters?: CompareSearchFilters
): Promise<CompareItemSnapshot[]> {
  if (contentTypeSlug === PRODUCT_COMPARE_SLUG) {
    return searchProductCompareCandidates(localePrefix, query, limit, filters);
  }
  return searchCompareCandidates(contentTypeSlug, query, limit, {
    collectionSlug: filters?.collection,
    tags: filters?.tags,
  });
}

export function usesProductCompareAdapter(contentTypeSlug: string): boolean {
  return contentTypeSlug === PRODUCT_COMPARE_SLUG;
}
