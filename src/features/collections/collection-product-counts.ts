import "server-only";

import { getCollectionProducts, loadProductsForCollectionRules } from "@/features/collections/collection-products";
import type { Collection } from "@/features/collections/types";
import { hasProductListingIndex, loadAllCollectionProductCounts } from "@/features/products/index/product-index-loader";
import { useCatalogProductsDb } from "@/features/products/products-source";

export async function loadCollectionProductCounts(
  localePrefix: string,
  collections: Collection[],
): Promise<Map<string, number>> {
  const useIndex = useCatalogProductsDb() || (await hasProductListingIndex(localePrefix));

  if (useIndex) {
    const indexedCounts = await loadAllCollectionProductCounts(
      localePrefix,
      collections.map((c) => c.slug),
    );
    const hasIndexedProducts = [...indexedCounts.values()].some((count) => count > 0);
    if (hasIndexedProducts || useCatalogProductsDb()) return indexedCounts;
  }

  const products = await loadProductsForCollectionRules(localePrefix);
  const counts = new Map<string, number>();
  for (const col of collections) {
    counts.set(col.slug, getCollectionProducts(col, products).length);
  }
  return counts;
}
