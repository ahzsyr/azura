import "server-only";

import type { EntityTranslation } from "@prisma/client";
import type { PublicLocaleContext } from "@/features/i18n/public-locale-context";
import { loadPublicLocaleContext } from "@/features/i18n/public-locale-context";
import { translationService } from "@/features/translation/translation.service";
import { getLocalizedField } from "@/lib/utils";
import type { Product } from "@/features/products/types";
import { prisma } from "@/lib/prisma";

export const PRODUCT_ENTITY_TYPE = "Product";

const TRANSLATABLE_PRODUCT_FIELDS = [
  "productTitle",
  "description",
  "shortDescription",
  "seoTitle",
  "seoDescription",
] as const;

function pickProductTitle(product: Product, fallbackSlug: string): string {
  return (
    product.productTitle?.trim() ||
    product.name?.trim() ||
    product.title?.trim() ||
    fallbackSlug
  );
}

export function applyProductTranslations(
  product: Product,
  canonicalSlug: string,
  ctx: PublicLocaleContext,
  translations: EntityTranslation[],
): Product {
  const options = {
    enabledLocales: ctx.enabledLocales,
    defaultCode: ctx.defaultCode,
    translations,
  };

  const productTitle = getLocalizedField(
    product as unknown as Record<string, unknown>,
    "productTitle",
    ctx.urlPrefix,
    options,
  );

  const title = productTitle.trim() || pickProductTitle(product, canonicalSlug);

  return {
    ...product,
    productTitle: title,
    name: title,
    title: product.title?.trim() ? product.title : title,
  };
}

export async function loadProductLocaleContext(
  urlPrefix: string,
): Promise<PublicLocaleContext> {
  return loadPublicLocaleContext(urlPrefix);
}

export async function resolveProductRow(
  urlPrefix: string,
  slug: string,
): Promise<{ row: Awaited<ReturnType<typeof prisma.product.findUnique>>; localizedSlug: string } | null> {
  const ctx = await loadProductLocaleContext(urlPrefix);
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const localized = await prisma.localizedSlug.findFirst({
    where: {
      entityType: PRODUCT_ENTITY_TYPE,
      localeCode: ctx.languageCode.toLowerCase(),
      slug: trimmed,
    },
  });

  if (localized) {
    const row = await prisma.product.findUnique({ where: { id: localized.entityId } });
    if (!row) return null;
    return { row, localizedSlug: localized.slug };
  }

  const row = await prisma.product.findUnique({ where: { canonicalSlug: trimmed } });
  if (!row) return null;

  const localizedSlug = await translationService.getLocalizedSlug(
    PRODUCT_ENTITY_TYPE,
    row.id,
    ctx.languageCode,
    row.canonicalSlug,
  );

  return { row, localizedSlug: localizedSlug || row.canonicalSlug };
}

export async function getLocalizedProductSlug(
  productId: string,
  canonicalSlug: string,
  languageCode: string,
): Promise<string> {
  return translationService.getLocalizedSlug(
    PRODUCT_ENTITY_TYPE,
    productId,
    languageCode,
    canonicalSlug,
  );
}

export async function loadLocalizedSlugsForProducts(
  productIds: string[],
  languageCode: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (productIds.length === 0) return out;

  const rows = await prisma.localizedSlug.findMany({
    where: {
      entityType: PRODUCT_ENTITY_TYPE,
      entityId: { in: productIds },
      localeCode: languageCode.toLowerCase(),
    },
  });

  for (const row of rows) {
    out.set(row.entityId, row.slug);
  }
  return out;
}

export function buildProductTranslationInputs(
  entityId: string,
  localeCode: string,
  product: Product,
  canonicalSlug: string,
): Array<{
  entityType: string;
  entityId: string;
  field: string;
  localeCode: string;
  value: string;
  status: "PUBLISHED";
}> {
  const inputs: Array<{
    entityType: string;
    entityId: string;
    field: string;
    localeCode: string;
    value: string;
    status: "PUBLISHED";
  }> = [];

  const loc = localeCode.toLowerCase();
  const title = pickProductTitle(product, canonicalSlug);
  inputs.push({
    entityType: PRODUCT_ENTITY_TYPE,
    entityId,
    field: "productTitle",
    localeCode: loc,
    value: title,
    status: "PUBLISHED",
  });

  for (const field of TRANSLATABLE_PRODUCT_FIELDS) {
    if (field === "productTitle") continue;
    const raw = product[field as keyof Product];
    if (typeof raw === "string" && raw.trim()) {
      inputs.push({
        entityType: PRODUCT_ENTITY_TYPE,
        entityId,
        field,
        localeCode: loc,
        value: raw.trim(),
        status: "PUBLISHED",
      });
    }
  }

  return inputs;
}

export async function upsertProductLocaleTranslations(
  entityId: string,
  localeCode: string,
  product: Product,
  slug: string,
): Promise<void> {
  const inputs = buildProductTranslationInputs(entityId, localeCode, product, slug);
  if (inputs.length > 0) {
    await translationService.upsertMany(inputs);
  }
  await translationService.upsertSlug(PRODUCT_ENTITY_TYPE, entityId, localeCode, slug);
}
