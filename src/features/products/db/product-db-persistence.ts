import "server-only";

import type { Product } from "@/features/products/types";
import { orderCollectionsHierarchy } from "@/features/collections/collection-hierarchy";
import { loadCollectionsFromDisk } from "@/features/collections/collection-sync.service";
import { catalogProductToCollectionProduct } from "@/features/collections/engine";
import { getCollectionsMatchingProduct } from "@/features/products/product-collections";
import {
  toDbRow,
  type ProductDbMeta,
  type ProductDbWriteInput,
} from "@/features/products/db/product-db-mapper";
import {
  upsertProductLocaleTranslations,
} from "@/features/products/db/product-translation";
import { productRepository } from "@/repositories/product.repository";
import {
  isEntityDualWriteEnabled,
  isEntityWritePrimaryEnabled,
  isProductTableReadOnly,
} from "@/features/entities/entity-flags";
import { syncProductToContentItem } from "@/features/entities/migration/sync-product-content-item";
import { entityService } from "@/features/entities/entity.service";

export type ProductPersistMeta = ProductDbMeta & {
  localeCode?: string;
  localizedSlug?: string;
};

export async function computeCollectionSlugs(
  canonicalSlug: string,
  product: Product,
): Promise<string[]> {
  const collections = orderCollectionsHierarchy(
    (await loadCollectionsFromDisk()).filter((c) => c.visible !== false),
  );
  const engine = catalogProductToCollectionProduct(canonicalSlug, product);
  const matches = getCollectionsMatchingProduct(engine, collections, { includeParents: true });
  return matches.map((c) => c.slug);
}

export async function saveProductToDb(
  canonicalSlug: string,
  product: Product,
  meta?: ProductPersistMeta,
): Promise<void> {
  if (isEntityWritePrimaryEnabled() && process.env.NODE_ENV === "development") {
    console.warn(
      "[entityService] saveProductToDb: AZURA_ENTITY_WRITE_PRIMARY is set; prefer entityService.saveEntity",
    );
  }
  const collectionSlugs = meta?.collectionSlugs ?? (await computeCollectionSlugs(canonicalSlug, product));

  if (isProductTableReadOnly() && !isEntityWritePrimaryEnabled()) {
    throw new Error(
      "Product table is read-only. Set AZURA_ENTITY_WRITE_PRIMARY=1 to save via entityService.",
    );
  }

  if (isEntityWritePrimaryEnabled()) {
    await entityService.saveEntity({
      presetId: "product",
      slug: canonicalSlug,
      fields: product as unknown as Record<string, unknown>,
      localeCode: meta?.localeCode,
      localizedSlug: meta?.localizedSlug ?? canonicalSlug,
      collectionSlugs,
    });

    if (!isEntityDualWriteEnabled() || isProductTableReadOnly()) {
      return;
    }
  }

  const input: ProductDbWriteInput = {
    canonicalSlug,
    product,
    meta: { ...meta, collectionSlugs },
  };
  const row = await productRepository.upsert(input);

  if (meta?.localeCode) {
    await upsertProductLocaleTranslations(
      row.id,
      meta.localeCode,
      product,
      meta.localizedSlug ?? canonicalSlug,
    );
  }

  if (isEntityDualWriteEnabled() && !isEntityWritePrimaryEnabled()) {
    await syncProductToContentItem({
      canonicalSlug,
      product,
      legacyProductId: row.id,
      collectionSlugs,
      localeCode: meta?.localeCode,
      localizedSlug: meta?.localizedSlug ?? canonicalSlug,
    });
  }
}

export async function productExistsInDb(canonicalSlug: string): Promise<boolean> {
  return productRepository.exists(canonicalSlug);
}

export async function productExistsLocalized(localeCode: string, slug: string): Promise<boolean> {
  return productRepository.existsLocalized(localeCode, slug);
}

export type CatalogProductTableCheck =
  | { ok: true }
  | { ok: false; message: string };

/** Verify the Product table exists before bulk import (Supabase migration). */
export async function assertCatalogProductTableReady(): Promise<CatalogProductTableCheck> {
  try {
    await productRepository.count();
    return { ok: true };
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : "";
    const message = e instanceof Error ? e.message : String(e);
    if (
      code === "P2021" ||
      /relation.*Product.*does not exist/i.test(message) ||
      /table.*Product.*doesn't exist/i.test(message)
    ) {
      return {
        ok: false,
        message:
          "Product table missing in database. Run database/postgres/04-catalog-products-table.sql in Supabase SQL Editor.",
      };
    }
    throw e;
  }
}

export { toDbRow };
