import type { CatalogCardData } from "@/features/catalog/types";
import {
  catalogAttributeFiltersForSource,
  catalogLimit,
  resolveCatalogTypeSlug,
} from "@/features/catalog/catalog-source";
import { TYPE_TO_LEGACY_SOURCE } from "@/features/content/content-type.registry";
import { serializeContentCard } from "@/features/content/content-data.service";
import { contentRepository } from "@/features/content/content.repository";
import { prisma } from "@/lib/prisma";
import type { EntityTranslation } from "@prisma/client";
import type { ContentCardData } from "@/features/content/types";

export { resolveCatalogTypeSlug } from "@/features/catalog/catalog-source";

export type CatalogBlockConfig = {
  source: string;
  categorySlug?: string;
  city?: string;
  serviceType?: string;
  featuredOnly?: boolean;
  manualIds?: string[];
  limit?: number;
  attributeFilters?: Record<string, string>;
  includeUnpublished?: boolean;
};

function normalizeAttributePrice(
  price: unknown,
  currency?: string,
): { price?: number; currency?: string } {
  if (price == null) return { price: undefined, currency };
  if (typeof price === "number") return { price, currency };
  if (typeof price === "string") {
    const parsed = parseFloat(price);
    return Number.isFinite(parsed) ? { price: parsed, currency } : { currency };
  }
  if (typeof price === "object" && price !== null && "value" in price) {
    const record = price as { value?: number; currency?: string };
    return {
      price: typeof record.value === "number" ? record.value : undefined,
      currency: record.currency ?? currency,
    };
  }
  return { currency };
}

function contentCardToCatalogCard(card: ContentCardData): CatalogCardData {
  const source = TYPE_TO_LEGACY_SOURCE[card.contentTypeSlug] ?? "packages";
  const attrs = card.attributes;
  const { price, currency } = normalizeAttributePrice(
    attrs.price,
    typeof attrs.currency === "string" ? attrs.currency : undefined,
  );
  const coverUrl = card.images[0]?.url;
  return {
    id: card.id,
    slug: card.slug ?? undefined,
    source,
    nameEn: card.title || card.titleEn,
    nameAr: card.titleAr,
    excerptEn: card.excerpt || card.excerptEn,
    excerptAr: card.excerptAr,
    descriptionEn: card.description || card.descriptionEn,
    descriptionAr: card.descriptionAr,
    price,
    currency,
    duration: attrs.duration as number | undefined,
    category: card.collection
      ? {
          id: card.collection.id,
          slug: card.collection.slug,
          nameEn: card.collection.nameEn || card.collection.name,
          nameAr: card.collection.nameAr || card.collection.name,
        }
      : undefined,
    city: attrs.city as string | undefined,
    stars: attrs.stars as number | undefined,
    type: (attrs.offeringType as string | undefined) ?? (attrs.type as string | undefined),
    icon: attrs.icon as string | undefined,
    ctaHref: attrs.ctaHref as string | undefined,
    isFeatured: card.isFeatured,
    imageUrl: coverUrl,
    href: card.href ?? (card.slug ? `/${card.contentTypeSlug}/${card.slug}` : `/${card.contentTypeSlug}`),
    images: card.images,
  };
}

export async function loadCatalogItems(config: CatalogBlockConfig): Promise<CatalogCardData[]> {
  const typeSlug = resolveCatalogTypeSlug(config.source);
  if (!typeSlug) return [];

  const items = await contentRepository.queryVisibleItemsForCatalog({
    contentTypeSlug: typeSlug,
    collectionSlug: config.categorySlug?.trim() || undefined,
    featuredOnly: config.featuredOnly,
    limit: catalogLimit(config.limit),
  });

  const type = await prisma.contentType.findUnique({ where: { slug: typeSlug } })
    ?? (items[0]
      ? await prisma.contentType.findUnique({ where: { id: items[0].contentTypeId } })
      : null);

  const itemIds = items.map((item) => item.id);
  const collectionIds = [...new Set(items.map((item) => item.collectionId).filter(Boolean))] as string[];
  const translations = itemIds.length
    ? await prisma.entityTranslation.findMany({
        where: {
          OR: [
            { entityType: "ContentItem", entityId: { in: itemIds } },
            { entityType: "ContentCollection", entityId: { in: collectionIds } },
          ],
        },
      })
    : [];

  const byItem = new Map<string, EntityTranslation[]>();
  const byCollection = new Map<string, EntityTranslation[]>();
  for (const row of translations) {
    const map = row.entityType === "ContentCollection" ? byCollection : byItem;
    const list = map.get(row.entityId) ?? [];
    list.push(row);
    map.set(row.entityId, list);
  }

  const cards = items.map((item) =>
    serializeContentCard(
      { ...item, contentType: type ?? undefined },
      byItem.get(item.id) ?? [],
      item.collectionId ? byCollection.get(item.collectionId) ?? [] : [],
    ),
  );

  const attributeFilters = catalogAttributeFiltersForSource(config.source, config);
  let filtered = cards;
  for (const [key, value] of Object.entries(attributeFilters)) {
    filtered = filtered.filter((card) => String(card.attributes[key] ?? "") === value);
  }
  if (filtered.length === 0 && cards.length > 0) {
    filtered = cards;
  }

  return filtered.map(contentCardToCatalogCard);
}
