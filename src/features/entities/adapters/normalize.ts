import type { ContentItemView } from "@/features/content/content-public.types";
import type { ContentListItem } from "@/features/content/types";
import type { Product, ProductSummary } from "@/features/products/types";
import type {
  EntityListRow,
  EntityPresetId,
  EntityRecord,
  EntityRef,
} from "@/features/entities/types";

export function buildEntityRef(
  presetId: EntityPresetId,
  storage: EntityRef["storage"],
  id: string,
  slug: string,
): EntityRef {
  return { presetId, storage, id, slug };
}

export function mapContentListItemToEntityListRow(
  presetId: EntityPresetId,
  item: ContentListItem,
): EntityListRow {
  const slug = item.slug?.trim() || item.id;
  return {
    ref: buildEntityRef(presetId, "content_item", item.id, slug),
    title: item.titleEn || slug,
    status: item.status,
    thumbnailUrl: item.thumbnailUrl,
    isFeatured: item.isFeatured,
    isVisible: item.isVisible,
  };
}

export function mapContentItemViewToEntityRecord(
  presetId: EntityPresetId,
  item: ContentItemView,
): EntityRecord {
  const slug = item.slug?.trim() || item.id;
  return {
    ref: buildEntityRef(presetId, "content_item", item.id, slug),
    title: item.title || item.titleEn || slug,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    description: item.description || item.descriptionEn,
    excerpt: item.excerpt || item.excerptEn,
    status: item.status,
    thumbnailUrl: item.media.find((m) => m.isCover)?.url ?? item.media[0]?.url ?? null,
    collectionSlug: item.collection?.slug ?? null,
    isFeatured: item.isFeatured,
    isVisible: item.isVisible,
    href: item.href,
    fields: { ...item.attributes },
  };
}

export function mapProductSummaryToEntityListRow(
  presetId: EntityPresetId,
  summary: ProductSummary,
): EntityListRow {
  const slug = summary.slug.trim() || summary.id;
  return {
    ref: buildEntityRef(presetId, "product", summary.id, slug),
    title: summary.name || slug,
    status: summary.availability ?? summary.stock_status,
    thumbnailUrl: summary.primary_image ?? null,
  };
}

export function mapProductToEntityRecord(
  presetId: EntityPresetId,
  product: Product,
  slug: string,
): EntityRecord {
  const id = String(product.id).trim() || slug;
  const title =
    product.productTitle || product.name || product.title || slug;
  const primaryImage =
    product.media?.images?.[0]?.url ?? undefined;

  const fields: Record<string, unknown> = {
    price: product.price,
    brand: product.brand,
    category: product.category,
    categories: product.categories,
    tags: product.tags,
    availability: product.availability,
    stock_status: product.stock_status,
    short_description: product.short_description,
    description: product.description,
    mpn: product.mpn,
    specifications: product.specifications,
    variations: product.variations,
  };

  return {
    ref: buildEntityRef(presetId, "product", id, slug),
    title,
    description: product.description ?? product.short_description,
    excerpt: product.short_description,
    status: product.availability ?? product.stock_status,
    thumbnailUrl: primaryImage ?? null,
    fields,
  };
}
