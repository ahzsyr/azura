import "server-only";

import {
  catalogProductToCollectionProduct,
  matchProductToCollection,
  ruleMetaToCollectionProduct,
  type CollectionEngineProduct,
} from "@/features/collections/engine";
import type { Collection } from "@/features/collections/types";
import { getUniqueProductIndexEntries } from "@/features/products/fs/product-catalog-index";
import { productsDataService } from "@/features/products/products-data.service";

export type { CollectionEngineProduct };

export function getCollectionProducts(
  collection: Collection,
  products: CollectionEngineProduct[],
): CollectionEngineProduct[] {
  const matched = products.filter((p) => matchProductToCollection(p, collection));
  const sortBy = collection.sortBy ?? "name-asc";
  return matched.sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "name-asc":
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

/** Loads products for collection rules (index metadata; full parse only when needed elsewhere). */
export async function loadProductsForCollectionRules(
  localePrefix: string,
): Promise<CollectionEngineProduct[]> {
  const entries = await getUniqueProductIndexEntries(localePrefix);
  return entries.map((e) => ruleMetaToCollectionProduct(e.ruleMeta));
}

/** Full engine products with prices (loads JSON for every product). */
export async function loadProductsForCollectionRulesFull(
  localePrefix: string,
): Promise<CollectionEngineProduct[]> {
  const slugs = await productsDataService.getProductSlugs(localePrefix);
  const out: CollectionEngineProduct[] = [];

  for (const slug of slugs) {
    const loaded = await productsDataService.getProduct(localePrefix, slug);
    if (!loaded) continue;
    out.push(catalogProductToCollectionProduct(slug, loaded.product));
  }

  return out;
}
