import "server-only";

import { readCatalogBrandProfiles } from "@/features/catalog/admin/catalog-taxonomy";
import { collectionMapFromList } from "@/features/collections/collection-navigation";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { filterListingCatalog } from "@/features/products/listing/filter";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import {
  queryListingRecordsBySlugs,
  queryRelatedListingRecords,
  sortListingRecords,
} from "@/features/products/listing/query-listing";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ProductSourceQuery } from "@/features/commerce-showcase/schemas/showcase-blocks";

function hasBadgeTag(record: ProductListingRecord, badge: string): boolean {
  const key = `badge:${badge}`.toLowerCase();
  return record.tags.some((t) => t.trim().toLowerCase() === key);
}

function hasSale(record: ProductListingRecord): boolean {
  if (record.old_price != null && record.old_price > record.priceMin) return true;
  const discount = record.price?.discount;
  return typeof discount === "number" && discount > 0;
}

export async function resolveProductSource(
  localePrefix: string,
  config: ProductSourceQuery,
): Promise<ProductListingRecord[]> {
  const limit = Math.min(48, Math.max(1, config.limit ?? 8));
  const sortBy = config.sortBy ?? "name-asc";

  if (config.source === "manual" && (config.productSlugs?.length ?? 0) > 0) {
    const records = await queryListingRecordsBySlugs(localePrefix, config.productSlugs ?? []);
    return records.slice(0, limit);
  }

  if (config.source === "recently_viewed") {
    return [];
  }

  const all = await loadListingRecords(localePrefix);
  let candidates = [...all];

  if (config.source === "collection" && config.collectionSlug?.trim()) {
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

  if (config.source === "brand" && config.brand?.trim()) {
    const brandKey = config.brand.trim().toLowerCase();
    candidates = candidates.filter((r) => {
      const productBrand = r.brand?.trim().toLowerCase() ?? "";
      return (
        productBrand === brandKey ||
        productBrand.replace(/\s+/g, "-") === brandKey
      );
    });
  }

  if (config.source === "category" && config.category?.trim()) {
    const cat = config.category.trim().toLowerCase();
    candidates = candidates.filter((r) => {
      const cats = [r.category, ...(r.categories ?? [])].filter(Boolean).map((c) =>
        String(c).trim().toLowerCase(),
      );
      return cats.includes(cat) || cats.some((c) => c.replace(/\s+/g, "-") === cat);
    });
  }

  if (config.source === "tags" && (config.tags?.length ?? 0) > 0) {
    const tagSet = new Set((config.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean));
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
  } else if (config.source === "best_sellers") {
    const tagged = candidates.filter((r) => hasBadgeTag(r, "bestseller"));
    candidates = tagged.length > 0 ? tagged : [...candidates].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (config.source === "new_arrivals") {
    const tagged = candidates.filter((r) => hasBadgeTag(r, "new_arrival"));
    candidates = tagged.length > 0 ? tagged : sortListingRecords(candidates, "newest");
  } else if (config.source === "trending") {
    const tagged = candidates.filter((r) => hasBadgeTag(r, "trending"));
    candidates = tagged.length > 0 ? tagged : [...candidates].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (config.source === "sale") {
    const onSale = candidates.filter(hasSale);
    candidates = onSale.length > 0 ? onSale : candidates;
  } else if (config.source === "recommended" && config.anchorSlug?.trim()) {
    const anchor = candidates.find((r) => r.slug === config.anchorSlug?.trim());
    return queryRelatedListingRecords(localePrefix, {
      excludeSlug: config.anchorSlug.trim(),
      collectionSlugs: anchor?.collectionSlugs ?? [],
      brand: anchor?.brand,
      limit,
    });
  } else {
    candidates = sortListingRecords(candidates, sortBy);
  }

  return candidates.slice(0, limit);
}

async function resolveBrandFilterKey(localePrefix: string, key: string): Promise<string> {
  const profiles = await readCatalogBrandProfiles(localePrefix);
  const match = profiles.find(
    (p) => p.slug.toLowerCase() === key.toLowerCase() || p.name.toLowerCase() === key.toLowerCase(),
  );
  return match?.name ?? key;
}

export async function resolveProductsForShowcaseTab(
  localePrefix: string,
  taxonomy: "category" | "brand",
  key: string,
  options: { limit?: number; sortBy?: ProductSourceQuery["sortBy"]; page?: number } = {},
): Promise<{ records: ProductListingRecord[]; total: number }> {
  const limit = Math.min(48, Math.max(1, options.limit ?? 8));
  const page = Math.max(1, options.page ?? 1);

  const brandName = taxonomy === "brand" ? await resolveBrandFilterKey(localePrefix, key) : key;
  const config: ProductSourceQuery =
    taxonomy === "brand"
      ? { source: "brand", brand: brandName, limit: 200, sortBy: options.sortBy }
      : { source: "category", category: key, limit: 200, sortBy: options.sortBy };

  const all = await resolveProductSource(localePrefix, config);
  const total = all.length;
  const start = (page - 1) * limit;
  return { records: all.slice(start, start + limit), total };
}
