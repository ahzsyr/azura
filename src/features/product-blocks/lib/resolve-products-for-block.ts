import "server-only";

import { collectionMapFromList } from "@/features/collections/collection-navigation";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { filterListingCatalog } from "@/features/products/listing/filter";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import {
  queryListingRecordsBySlugs,
  sortListingRecords,
} from "@/features/products/listing/query-listing";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ProductSelectionConfig } from "@/features/product-blocks/schemas/product-blocks";

export async function resolveProductsForBlock(
  localePrefix: string,
  config: ProductSelectionConfig,
): Promise<ProductListingRecord[]> {
  const limit = Math.min(48, Math.max(1, config.limit ?? 8));
  const sortBy = config.sortBy ?? "name-asc";

  if (config.source === "manual" && config.productSlugs.length > 0) {
    const records = await queryListingRecordsBySlugs(localePrefix, config.productSlugs);
    return records.slice(0, limit);
  }

  const all = await loadListingRecords(localePrefix);
  let candidates = [...all];

  if (config.source === "collection" && config.collectionSlug.trim()) {
    const collections = await collectionsDataService.loadAll({ localePrefix });
    const ordered = orderCollectionsHierarchy(collections.filter((c) => c.visible !== false));
    const scopeBySlug = collectionMapFromList(ordered);
    candidates = filterListingCatalog(
      candidates,
      {
        q: "",
        categories: [],
        brands: [],
        collections: [],
        collectionScope: config.collectionSlug.trim(),
        tags: [],
        conditions: [],
        variations: {},
        priceMin: null,
        priceMax: null,
        stockOnly: false,
        page: 1,
        per: 50,
      },
      undefined,
      { collectionScopeBySlug: scopeBySlug, listingMode: "product" },
    );
  }

  if (config.source === "tags" && config.tags.length > 0) {
    const tagSet = new Set(config.tags.map((t) => t.trim().toLowerCase()).filter(Boolean));
    candidates = candidates.filter((r) =>
      r.tags.some((t) => tagSet.has(t.trim().toLowerCase())),
    );
  }

  if (config.source === "featured") {
    const featured = candidates.filter((r) =>
      r.tags.some((t) => t.trim().toLowerCase() === "featured"),
    );
    candidates = featured.length > 0 ? featured : candidates;
    candidates.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else {
    candidates = sortListingRecords(candidates, sortBy);
  }

  return candidates.slice(0, limit);
}
