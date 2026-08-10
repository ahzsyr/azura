import "server-only";

import { entityService } from "@/features/entities/entity.service";
import { productsDataService } from "@/features/products/products-data.service";

export type ProductEntityParityReport = {
  locale: string;
  legacyCount: number;
  entityCount: number;
  match: boolean;
  missingInEntity: string[];
  missingInLegacy: string[];
};

/** Compare legacy product list vs entityService for Phase 3 pilot gate. */
export async function verifyProductEntityParity(
  locale: string,
): Promise<ProductEntityParityReport> {
  const [{ products }, entityRows] = await Promise.all([
    productsDataService.getAllProducts(locale),
    entityService.listEntities("product", { locale, limit: 10_000 }),
  ]);

  const legacySlugs = new Set(products.map((p) => p.slug.trim()).filter(Boolean));
  const entitySlugs = new Set(entityRows.map((row) => row.ref.slug.trim()).filter(Boolean));

  const missingInEntity = [...legacySlugs].filter((slug) => !entitySlugs.has(slug));
  const missingInLegacy = [...entitySlugs].filter((slug) => !legacySlugs.has(slug));

  return {
    locale,
    legacyCount: legacySlugs.size,
    entityCount: entitySlugs.size,
    match: missingInEntity.length === 0 && missingInLegacy.length === 0,
    missingInEntity,
    missingInLegacy,
  };
}
