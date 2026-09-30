import type { EntityRecord } from "@/features/entities/types";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ProductCurrency, ProductPrice } from "@/features/products/types";

function readPrice(fields: Record<string, unknown>): ProductPrice {
  const raw = fields.price;
  if (raw && typeof raw === "object" && "value" in raw) {
    const value = Number((raw as ProductPrice).value);
    const currency = (raw as ProductPrice).currency ?? "USD";
    const discount = (raw as ProductPrice).discount;
    return {
      value: Number.isFinite(value) ? value : 0,
      currency: currency as ProductCurrency,
      discount: discount ?? null,
    };
  }
  return { value: 0, currency: "USD" };
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

/** Fallback listing record when the product index is unavailable. */
export function mapEntityRecordToListingRecord(entity: EntityRecord): ProductListingRecord {
  const { fields, ref } = entity;
  const price = readPrice(fields);
  const categories = readStringArray(fields.categories);
  const tags = readStringArray(fields.tags);
  const name = entity.title || ref.slug;
  const primaryImage = entity.thumbnailUrl ?? undefined;

  return {
    slug: ref.slug,
    id: ref.id,
    name,
    brand: typeof fields.brand === "string" ? fields.brand : undefined,
    category: typeof fields.category === "string" ? fields.category : categories[0] ?? null,
    categories,
    tags,
    price,
    old_price: typeof fields.old_price === "number" ? fields.old_price : null,
    priceMin: price.value,
    priceMax: price.value,
    short_description: entity.excerpt,
    availability:
      typeof fields.availability === "string"
        ? (fields.availability as ProductListingRecord["availability"])
        : undefined,
    stock_status:
      typeof fields.stock_status === "string"
        ? (fields.stock_status as ProductListingRecord["stock_status"])
        : undefined,
    mpn: typeof fields.mpn === "string" ? fields.mpn : undefined,
    rating: typeof fields.rating === "number" ? fields.rating : undefined,
    reviews_count: typeof fields.reviews_count === "number" ? fields.reviews_count : undefined,
    primary_image: primaryImage,
    in_stock: fields.stock_status !== "out_of_stock",
    conditions: readStringArray(fields.conditions),
    variationFacets: {},
    collectionSlugs: entity.collectionSlug ? [entity.collectionSlug] : [],
    searchText: [name, ref.slug, fields.brand, categories.join(" ")].filter(Boolean).join(" "),
  };
}

export function mergeListingRecord(
  entity: EntityRecord,
  listing: ProductListingRecord | undefined,
): ProductListingRecord {
  if (listing) return listing;
  return mapEntityRecordToListingRecord(entity);
}
