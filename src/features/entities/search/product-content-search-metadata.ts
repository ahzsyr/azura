import type { SearchCardPayload } from "@/capabilities/search/types/search-card";
import type { ContentItemIndexSource } from "@/capabilities/search/engine/providers/builtin-providers";
import { PRODUCT_CONTENT_TYPE_SLUG } from "@/features/entities/migration/metadata";

export function buildProductContentSearchMetadata(
  item: ContentItemIndexSource,
): Record<string, unknown> | null {
  if (item.contentTypeSlug !== PRODUCT_CONTENT_TYPE_SLUG) return null;

  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const denorm = (attrs._denorm ?? {}) as Record<string, unknown>;
  const price = attrs.price as { value?: number; currency?: string } | undefined;
  const reviews = attrs.reviews as { rating?: number; count?: number } | undefined;
  const media = attrs.media as { images?: { url?: string }[] } | undefined;
  const primaryImage = media?.images?.[0]?.url;

  const card: SearchCardPayload = {
    slug: item.slug ?? "",
    imageUrl: typeof primaryImage === "string" ? primaryImage : undefined,
    brand: typeof denorm.brand === "string" ? denorm.brand : typeof attrs.brand === "string" ? attrs.brand : undefined,
    inStock:
      denorm.stockStatus === "in_stock" ||
      attrs.stock_status === "in_stock" ||
      attrs.availability === "InStock",
    price: price?.value != null
      ? {
          min: Number(price.value),
          max: Number(price.value),
          currency: price.currency,
        }
      : undefined,
    ...(reviews?.rating != null
      ? { rating: { value: reviews.rating, count: reviews.count ?? 0 } }
      : {}),
  };

  return {
    presetId: "product",
    contentTypeSlug: PRODUCT_CONTENT_TYPE_SLUG,
    adminPath: "/admin/products",
    card,
  };
}
