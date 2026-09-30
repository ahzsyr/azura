export const PRODUCT_CONTENT_TYPE_SLUG = "products";

export type ProductMigrationMetadata = {
  source: "product";
  legacyProductId: string;
  canonicalSlug: string;
  migratedAt?: string;
};

export type ProductContentItemMetadata = {
  migration?: ProductMigrationMetadata;
  collectionSlugs?: string[];
  presetId?: "product";
};

export function parseProductContentItemMetadata(raw: unknown): ProductContentItemMetadata {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as ProductContentItemMetadata;
}

export function buildProductMigrationMetadata(
  legacyProductId: string,
  canonicalSlug: string,
  collectionSlugs?: string[],
): ProductContentItemMetadata {
  return {
    presetId: "product",
    collectionSlugs: collectionSlugs ?? [],
    migration: {
      source: "product",
      legacyProductId,
      canonicalSlug,
      migratedAt: new Date().toISOString(),
    },
  };
}

export function isMigratedProductItem(metadata: unknown): boolean {
  const parsed = parseProductContentItemMetadata(metadata);
  return parsed.migration?.source === "product";
}
