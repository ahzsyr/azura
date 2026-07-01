import "server-only";

import type { Prisma } from "@prisma/client";
import type { Product } from "@/features/products/types";
import {
  applyPatch,
  flattenPatchPaths,
  isEmptyPatch,
  productPatchAffectsCollections,
  productPatchAffectsListing,
  productPatchAffectsSearch,
} from "@/lib/patch";
import { normalizeProductPayload } from "@/features/products/lib/product-payload-normalize";
import {
  buildSelectiveDenormUpdate,
  fromDbRow,
} from "@/features/products/db/product-db-mapper";
import {
  buildProductTranslationInputs,
} from "@/features/products/db/product-translation";
import { productRepository } from "@/repositories/product.repository";
import { translationService } from "@/features/translation/translation.service";
import { PRODUCT_ENTITY_TYPE } from "@/features/products/db/product-translation";
import {
  computeCollectionSlugs,
  type ProductPersistMeta,
} from "@/features/products/db/product-db-persistence";

export type PatchProductResult =
  | {
      ok: true;
      noop?: boolean;
      product: Product;
      canonicalSlug: string;
      appliedPaths: string[];
    }
  | { ok: false; error: string };

const TRANSLATION_FIELD_MAP: Record<string, string> = {
  productTitle: "productTitle",
  name: "productTitle",
  title: "productTitle",
  description: "description",
  shortDescription: "shortDescription",
  seoTitle: "seoTitle",
  seoDescription: "seoDescription",
};

async function patchProductTranslations(
  entityId: string,
  localeCode: string,
  product: Product,
  slug: string,
  changedPaths: string[],
): Promise<void> {
  const translatablePaths = changedPaths.filter((p) => {
    const root = p.split(".")[0];
    return root in TRANSLATION_FIELD_MAP;
  });
  if (translatablePaths.length === 0) return;

  const inputs = buildProductTranslationInputs(entityId, localeCode, product, slug);
  const fieldsToUpdate = new Set(
    translatablePaths.map((p) => TRANSLATION_FIELD_MAP[p.split(".")[0]]),
  );
  const filtered = inputs.filter((input) => fieldsToUpdate.has(input.field));
  if (filtered.length > 0) {
    await translationService.upsertMany(filtered);
  }

  if (translatablePaths.some((p) => p === "slug" || p.startsWith("slug."))) {
    await translationService.upsertSlug(PRODUCT_ENTITY_TYPE, entityId, localeCode, slug);
  }
}

export async function patchProductToDb(
  existingCanonicalSlug: string,
  changes: Record<string, unknown>,
  meta?: ProductPersistMeta,
): Promise<PatchProductResult> {
  if (isEmptyPatch(changes)) {
    const row = await productRepository.findByCanonicalSlug(existingCanonicalSlug);
    if (!row) return { ok: false, error: "Product not found" };
    return {
      ok: true,
      noop: true,
      product: fromDbRow(row),
      canonicalSlug: row.canonicalSlug,
      appliedPaths: [],
    };
  }

  const row = await productRepository.findByCanonicalSlug(existingCanonicalSlug);
  if (!row) return { ok: false, error: "Product not found" };

  const existingProduct = fromDbRow(row);
  const merged = normalizeProductPayload(
    applyPatch(existingProduct, changes) as Product,
    row.canonicalSlug,
  );
  const appliedPaths = flattenPatchPaths(changes);

  const update: Prisma.ProductUpdateInput = {
    ...buildSelectiveDenormUpdate(merged, appliedPaths),
    payload: merged as unknown as Prisma.InputJsonValue,
  };

  if (productPatchAffectsCollections(appliedPaths)) {
    const collectionSlugs =
      meta?.collectionSlugs ?? (await computeCollectionSlugs(row.canonicalSlug, merged));
    update.collectionSlugs = collectionSlugs as Prisma.InputJsonValue;
  }

  const updated = await productRepository.patch(row.canonicalSlug, update);

  if (meta?.localeCode) {
    await patchProductTranslations(
      updated.id,
      meta.localeCode,
      merged,
      meta.localizedSlug ?? row.canonicalSlug,
      appliedPaths,
    );
  }

  return {
    ok: true,
    product: fromDbRow(updated),
    canonicalSlug: updated.canonicalSlug,
    appliedPaths,
  };
}

export { productPatchAffectsCollections, productPatchAffectsListing, productPatchAffectsSearch };
