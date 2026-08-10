import "server-only";

import { resolveProductSource } from "@/features/builder/blocks/commerce/commerce-showcase/lib/resolve-product-source";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ProductSelectionConfig } from "@/features/builder/blocks/commerce/product-blocks/schemas/product-blocks";

/**
 * @deprecated Prefer `resolveProductCardViewModelsForBlock` for template-registry rendering.
 */
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
