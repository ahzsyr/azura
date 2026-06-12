import "server-only";

import { resolveProductSource } from "@/features/commerce-showcase/lib/resolve-product-source";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ProductSelectionConfig } from "@/features/product-blocks/schemas/product-blocks";

export async function resolveProductsForBlock(
  localePrefix: string,
  config: ProductSelectionConfig,
): Promise<ProductListingRecord[]> {
  return resolveProductSource(localePrefix, {
    source: config.source,
    collectionSlug: config.collectionSlug,
    productSlugs: config.productSlugs,
    tags: config.tags,
    limit: config.limit,
    sortBy: config.sortBy,
  });
}
