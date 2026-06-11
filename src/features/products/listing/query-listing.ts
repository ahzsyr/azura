import "server-only";

import { filterListingCatalog, paginateListing } from "@/features/products/listing/filter";
import type { ListingFilterState, ProductListingRecord } from "@/features/products/listing/types";
import { aggregateFacets } from "@/features/products/listing/aggregate-facets";
import { collectionMapFromList } from "@/features/collections/collection-navigation";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import type { Collection } from "@/features/collections/types";
import {
  loadCollectionSlugIndex,
  loadFacetIndex,
  loadListingRecords,
  searchTokenLookup,
} from "@/features/products/index/product-index-loader";
import type { ProductListingQueryResult } from "@/features/products/index/product-index-types";
import type { IndexedProductListingRecord } from "@/features/products/index/product-index-types";
import { sortListingRecords, type CollectionSortKey } from "./sort-listing";

export type { CollectionSortKey };
export { sortListingRecords };

async function loadCollections(localePrefix: string): Promise<Collection[]> {
  const allCols = await collectionsDataService.loadAll({ localePrefix });
  return orderCollectionsHierarchy(allCols.filter((c) => c.visible !== false));
}

export async function queryProductListing(
  localePrefix: string,
  state: ListingFilterState,
  options?: {
    prefilteredRecords?: ProductListingRecord[];
    collectionSort?: CollectionSortKey;
    listingMode?: "product" | "collection";
  },
): Promise<ProductListingQueryResult> {
  const collections = await loadCollections(localePrefix);
  const scopeBySlug = collectionMapFromList(collections);
  const base =
    options?.prefilteredRecords ??
    ((await loadListingRecords(localePrefix)) as ProductListingRecord[]);

  let candidates = base;
  let searchSlugHits: Set<string> | undefined;

  if (state.q.trim()) {
    const tokenHits = await searchTokenLookup(localePrefix, state.q);
    if (tokenHits && tokenHits.size > 0) {
      searchSlugHits = tokenHits;
      candidates = candidates.filter((r) => tokenHits.has(r.slug));
    }
  }

  const filtered = filterListingCatalog(
    candidates,
    state,
    searchSlugHits,
    {
      collectionScopeBySlug: scopeBySlug,
      listingMode: options?.listingMode ?? "product",
    },
  );

  const sorted = options?.collectionSort
    ? sortListingRecords(filtered, options.collectionSort)
    : filtered;

  const pagination = paginateListing(sorted, state.page, state.per);
  const facetScope = state.collectionScope?.trim() || "global";
  const facets =
    (await loadFacetIndex(localePrefix, facetScope)) ??
    aggregateFacets(filtered, collections);

  return {
    records: pagination.items,
    facets,
    total: pagination.total,
    page: state.page,
    per: state.per,
    totalPages: pagination.totalPages,
  };
}

export async function queryRelatedListingRecords(
  localePrefix: string,
  options: {
    excludeSlug: string;
    collectionSlugs: string[];
    brand?: string;
    limit?: number;
  },
): Promise<ProductListingRecord[]> {
  const records = await loadListingRecords(localePrefix);
  const colSet = new Set(options.collectionSlugs);
  const limit = options.limit ?? 8;

  const related = records.filter((r) => {
    if (r.slug === options.excludeSlug) return false;
    if (colSet.size === 0) return r.brand === options.brand;
    return r.collectionSlugs.some((s) => colSet.has(s));
  });

  return related.slice(0, limit);
}

export async function queryListingRecordsBySlugs(
  localePrefix: string,
  slugs: string[],
): Promise<ProductListingRecord[]> {
  const records = await loadListingRecords(localePrefix);
  const bySlug = new Map(records.map((r) => [r.slug.toLowerCase(), r]));
  const out: ProductListingRecord[] = [];
  for (const slug of slugs) {
    const hit = bySlug.get(slug.toLowerCase());
    if (hit) out.push(hit);
  }
  return out;
}

export async function queryListingRecordsByIdentifiers(
  localePrefix: string,
  items: Array<{ slug?: string; mpn?: string; name?: string }>,
): Promise<ProductListingRecord[]> {
  const records = await loadListingRecords(localePrefix);
  const norm = (v?: string) => (v ?? "").trim().toLowerCase();

  return items
    .map((item) => {
      const itemSlug = norm(item.slug);
      if (itemSlug) {
        const bySlug = records.find((c) => norm(c.slug) === itemSlug);
        if (bySlug) return bySlug;
      }
      if (item.mpn) {
        const byMpn = records.find((c) => norm(c.mpn) === norm(item.mpn));
        if (byMpn) return byMpn;
      }
      return records.find((c) => norm(c.name) === norm(item.name));
    })
    .filter((c): c is IndexedProductListingRecord => Boolean(c));
}
