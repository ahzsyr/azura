import "server-only";

import { loadAllProducts } from "@/features/collections/collection-sync.service";
import {
  selectDirectRuleMatches,
  type DirectRuleMatchResult,
  type DirectRuleProduct,
} from "@/features/categories/matching/direct-matches";
import { productToRuleFields } from "@/features/categories/matching";
import { fromDbRow } from "@/features/products/db/product-db-mapper";
import { isProductPublishedForSearch } from "@/features/products/lib/product-publish-status";
import { useCatalogProductsDb } from "@/features/products/products-source";
import type { Product as CatalogProduct } from "@/features/products/types";
import { productRepository } from "@/repositories/product.repository";

function toDirectRuleProduct(
  slug: string,
  product: CatalogProduct,
  publishStatus?: string | null,
): DirectRuleProduct {
  const fields = productToRuleFields(slug, product);
  return {
    slug,
    id: String(product.id ?? slug),
    name: String(fields.name ?? slug),
    publishStatus,
    fields,
  };
}

/** Published catalog products, with the same field bag Match preview uses. */
export async function loadPublishedProductsForRules(locale: string): Promise<DirectRuleProduct[]> {
  if (useCatalogProductsDb()) {
    const rows = await productRepository.findMany({ status: "published" });
    return rows
      .filter((row) => isProductPublishedForSearch(row.status))
      .map((row) => toDirectRuleProduct(row.canonicalSlug, fromDbRow(row), row.status));
  }

  const products = await loadAllProducts(locale);
  return products.map(({ slug, product }) => {
    const publishStatus = (product as { status?: string }).status;
    return toDirectRuleProduct(slug, product, publishStatus);
  });
}

/** Direct published matches for one category rule tree. */
export async function matchPublishedProductsToRules(
  locale: string,
  conditions: unknown,
  options?: { sampleLimit?: number; explainEntityIdOrSlug?: string },
): Promise<DirectRuleMatchResult> {
  const products = await loadPublishedProductsForRules(locale);
  return selectDirectRuleMatches(products, conditions, options);
}
