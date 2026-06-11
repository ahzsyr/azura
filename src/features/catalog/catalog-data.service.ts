import type { CatalogCardData } from "@/features/catalog/types";
import { LEGACY_SOURCE_TO_TYPE, TYPE_TO_LEGACY_SOURCE } from "@/features/content/content-type.registry";
import { loadContentItems } from "@/features/content/content-data.service";
import type { ContentCardData } from "@/features/content/types";

export type CatalogBlockConfig = {
  source: "packages" | "hotels" | "services";
  categorySlug?: string;
  city?: string;
  serviceType?: string;
  featuredOnly?: boolean;
  manualIds?: string[];
  limit?: number;
};

function contentCardToCatalogCard(card: ContentCardData): CatalogCardData {
  const source = TYPE_TO_LEGACY_SOURCE[card.contentTypeSlug] ?? "packages";
  const attrs = card.attributes;
  return {
    id: card.id,
    slug: card.slug ?? undefined,
    source,
    nameEn: card.titleEn,
    nameAr: card.titleAr,
    excerptEn: card.excerptEn,
    excerptAr: card.excerptAr,
    descriptionEn: card.descriptionEn,
    descriptionAr: card.descriptionAr,
    price: attrs.price,
    currency: attrs.currency as string | undefined,
    duration: attrs.duration as number | undefined,
    category: card.collection,
    city: attrs.city as string | undefined,
    stars: attrs.stars as number | undefined,
    type: (attrs.offeringType as string | undefined) ?? (attrs.type as string | undefined),
    icon: attrs.icon as string | undefined,
    ctaLabelEn: attrs.ctaLabelEn as string | undefined,
    ctaLabelAr: attrs.ctaLabelAr as string | undefined,
    ctaHref: attrs.ctaHref as string | undefined,
    isFeatured: card.isFeatured,
    images: card.images,
  };
}

export async function loadCatalogItems(config: CatalogBlockConfig): Promise<CatalogCardData[]> {
  const typeSlug = LEGACY_SOURCE_TO_TYPE[config.source];
  if (!typeSlug) return [];

  const cards = await loadContentItems({
    contentTypeSlug: typeSlug,
    collectionSlug: config.categorySlug,
    featuredOnly: config.featuredOnly,
    manualIds: config.manualIds,
    limit: config.limit,
    attributeFilters: {
      ...(config.city ? { city: config.city } : {}),
      ...(config.serviceType ? { offeringType: config.serviceType } : {}),
    },
  });

  let filtered = cards;
  if (config.city) {
    filtered = filtered.filter((c) => c.attributes.city === config.city);
  }
  if (config.serviceType) {
    filtered = filtered.filter((c) => c.attributes.offeringType === config.serviceType);
  }

  return filtered.map(contentCardToCatalogCard);
}
