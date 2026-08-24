import "server-only";

import {
  queryListingRecordsBySlugs,
  queryRelatedListingRecords,
} from "@/features/products/listing/query-listing";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { relatedProductsPropsSchema } from "@/features/builder/blocks/commerce/product-blocks/schemas/product-blocks";
import type { z } from "zod";

type RelatedConfig = Pick<
  z.infer<typeof relatedProductsPropsSchema>,
  "rule" | "anchorSlug" | "collectionSlug" | "brand" | "tags" | "productSlugs" | "limit"
>;

export async function resolveRelatedForBlock(
  localePrefix: string,
  config: RelatedConfig,
): Promise<ProductListingRecord[]> {
  const limit = Math.min(24, Math.max(1, config.limit ?? 4));

  if (config.rule === "manual" && config.productSlugs.length > 0) {
    return (await queryListingRecordsBySlugs(localePrefix, config.productSlugs)).slice(0, limit);
  }

  if (config.rule === "anchor" && config.anchorSlug.trim()) {
    const { loadListingRecords } = await import("@/features/products/index/product-index-loader");
    const records = await loadListingRecords(localePrefix);
    const anchor = records.find((r) => r.slug === config.anchorSlug.trim());
    return queryRelatedListingRecords(localePrefix, {
      excludeSlug: config.anchorSlug.trim(),
      collectionSlugs: anchor?.collectionSlugs ?? [],
      brand: anchor?.brand,
      limit,
    });
  }

  const excludeSlug = "";
  const collectionSlugs = config.rule === "collection" && config.collectionSlug.trim()
    ? [config.collectionSlug.trim()]
    : [];

  if (config.rule === "tags" && config.tags.length > 0) {
    const { loadListingRecords } = await import("@/features/products/index/product-index-loader");
    const records = await loadListingRecords(localePrefix);
    const tagSet = new Set(config.tags.map((t) => t.trim().toLowerCase()));
    return records
      .filter(
        (r) =>
          r.slug !== excludeSlug &&
          r.tags.some((t) => tagSet.has(t.trim().toLowerCase())),
      )
      .slice(0, limit);
  }

  if (config.rule === "brand" && config.brand.trim()) {
    return queryRelatedListingRecords(localePrefix, {
      excludeSlug,
      collectionSlugs: [],
      brand: config.brand.trim(),
      limit,
    });
  }

  return queryRelatedListingRecords(localePrefix, {
    excludeSlug,
    collectionSlugs,
    brand: config.brand.trim() || undefined,
    limit,
  });
}
