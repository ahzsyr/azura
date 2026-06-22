import type { Product as DbProduct, Prisma } from "@prisma/client";
import type { Product } from "@/features/products/types";
import { normalizeProductPayload } from "@/features/products/lib/product-payload-normalize";

export type ProductDbMeta = {
  sourceType?: string | null;
  sourceFile?: string | null;
  status?: string;
  collectionSlugs?: string[];
};

export type ProductDbWriteInput = {
  canonicalSlug: string;
  product: Product;
  meta?: ProductDbMeta;
};

function toJsonArray(value: string[] | undefined): Prisma.InputJsonValue | undefined {
  if (!value || value.length === 0) return undefined;
  return value as Prisma.InputJsonValue;
}

export function extractDenormalizedFields(product: Product) {
  const priceValue = product.price?.value != null ? Number(product.price.value) : null;
  const priceCurrency = product.price?.currency ?? null;
  const category =
    product.category != null && String(product.category).trim() !== ""
      ? String(product.category).trim()
      : null;

  return {
    sku:
      (product.mpn || product.manufacturer_part_number || product.id || "").trim() || null,
    priceValue,
    priceCurrency,
    availability: product.availability ?? null,
    stockStatus: product.stock_status ?? null,
    brand: product.brand?.trim() || null,
    category,
    categories: toJsonArray(product.categories),
    tags: toJsonArray(product.tags),
  };
}

export function toDbRow(input: ProductDbWriteInput): Prisma.ProductCreateInput {
  const { canonicalSlug, product, meta } = input;
  const normalized = normalizeProductPayload(product, canonicalSlug);
  const denorm = extractDenormalizedFields(normalized);

  return {
    canonicalSlug,
    sku: denorm.sku,
    priceValue: denorm.priceValue,
    priceCurrency: denorm.priceCurrency,
    availability: denorm.availability,
    stockStatus: denorm.stockStatus,
    brand: denorm.brand,
    category: denorm.category,
    categories: denorm.categories,
    tags: denorm.tags,
    collectionSlugs: toJsonArray(meta?.collectionSlugs),
    status: meta?.status ?? "published",
    sourceType: meta?.sourceType ?? null,
    sourceFile: meta?.sourceFile ?? null,
    payload: normalized as unknown as Prisma.InputJsonValue,
  };
}

export function toDbUpdateData(input: ProductDbWriteInput): Prisma.ProductUpdateInput {
  const create = toDbRow(input);
  const { canonicalSlug: _canonicalSlug, ...rest } = create;
  return rest;
}

export function fromDbRow(row: DbProduct): Product {
  const payload = row.payload as unknown as Product;
  const slug = row.canonicalSlug;
  if (payload && typeof payload === "object") {
    return normalizeProductPayload(payload, slug);
  }
  return normalizeProductPayload(
    {
      id: row.sku ?? slug,
      productTitle: slug,
      price: {
        value: row.priceValue != null ? Number(row.priceValue) : 0,
        currency: (row.priceCurrency as Product["price"]["currency"]) ?? "USD",
      },
      media: { images: [] },
      reviews: { rating: 0, count: 0 },
    },
    slug,
  );
}

export function collectionSlugsFromRow(row: DbProduct): string[] {
  if (!row.collectionSlugs || !Array.isArray(row.collectionSlugs)) return [];
  return row.collectionSlugs.filter((s): s is string => typeof s === "string");
}

const PRICE_PATHS = ["price", "old_price"];
const STOCK_PATHS = ["stock_status", "availability"];
const BRAND_PATHS = ["brand"];
const CATEGORY_PATHS = ["category", "categories"];
const TAG_PATHS = ["tags"];
const SKU_PATHS = ["mpn", "manufacturer_part_number", "id"];

function pathMatchesAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}.`));
}

/** Build Prisma update with only denormalized columns affected by changed paths. */
export function buildSelectiveDenormUpdate(
  product: Product,
  changedPaths: string[],
): Prisma.ProductUpdateInput {
  const update: Prisma.ProductUpdateInput = {};
  const denorm = extractDenormalizedFields(product);

  if (changedPaths.some((p) => pathMatchesAny(p, PRICE_PATHS))) {
    update.priceValue = denorm.priceValue;
    update.priceCurrency = denorm.priceCurrency;
  }
  if (changedPaths.some((p) => pathMatchesAny(p, STOCK_PATHS))) {
    update.stockStatus = denorm.stockStatus;
    update.availability = denorm.availability;
  }
  if (changedPaths.some((p) => pathMatchesAny(p, BRAND_PATHS))) {
    update.brand = denorm.brand;
  }
  if (changedPaths.some((p) => pathMatchesAny(p, CATEGORY_PATHS))) {
    update.category = denorm.category;
    update.categories = denorm.categories;
  }
  if (changedPaths.some((p) => pathMatchesAny(p, TAG_PATHS))) {
    update.tags = denorm.tags;
  }
  if (changedPaths.some((p) => pathMatchesAny(p, SKU_PATHS))) {
    update.sku = denorm.sku;
  }

  return update;
}
