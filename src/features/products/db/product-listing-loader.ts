import "server-only";

import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { loadCollectionsFromDisk } from "@/features/collections/collection-sync.service";
import { prefixToCode } from "@/i18n/locale-registry.server";
import { translationService } from "@/features/translation/translation.service";
import { fromDbRow, collectionSlugsFromRow } from "@/features/products/db/product-db-mapper";
import {
  applyProductTranslations,
  loadLocalizedSlugsForProducts,
  loadProductLocaleContext,
  PRODUCT_ENTITY_TYPE,
} from "@/features/products/db/product-translation";
import { recordFromProduct } from "@/features/products/listing/record-from-product";
import type { IndexedProductListingRecord } from "@/features/products/index/product-index-types";
import { productRepository } from "@/repositories/product.repository";

export async function loadListingRecordsFromDb(
  localePrefix: string,
): Promise<IndexedProductListingRecord[]> {
  const languageCode = await prefixToCode(localePrefix);
  const rows = await productRepository.findAll();
  const collections = orderCollectionsHierarchy(
    (await loadCollectionsFromDisk()).filter((c) => c.visible !== false),
  );
  const ctx = await loadProductLocaleContext(localePrefix);
  const ids = rows.map((r) => r.id);
  const translationsMap = await translationService.getForEntities(PRODUCT_ENTITY_TYPE, ids);
  const slugById = await loadLocalizedSlugsForProducts(ids, languageCode);

  const records: IndexedProductListingRecord[] = [];

  for (const row of rows) {
    const translations = translationsMap.get(row.id) ?? [];
    const localizedSlug = slugById.get(row.id) ?? row.canonicalSlug;
    const product = applyProductTranslations(
      fromDbRow(row),
      row.canonicalSlug,
      ctx,
      translations,
    );
    const record = recordFromProduct(product, localizedSlug, collections);
    const storedSlugs = collectionSlugsFromRow(row);
    records.push({
      ...record,
      collectionSlugs: storedSlugs.length > 0 ? storedSlugs : record.collectionSlugs,
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  records.sort((a, b) => a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" }));
  return records;
}
