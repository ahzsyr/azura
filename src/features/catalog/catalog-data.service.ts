import type { CatalogCardData } from "@/features/catalog/types";
import { LEGACY_SOURCE_TO_TYPE, TYPE_TO_LEGACY_SOURCE } from "@/features/content/content-type.registry";
import { loadContentItems } from "@/features/content/content-data.service";
import type { ContentCardData } from "@/features/content/types";

export type CatalogBlockConfig = {
  source: "packages" | "hotels" | "services" | "catalog-items" | "listings" | "offerings";
  categorySlug?: string;
  city?: string;
  serviceType?: string;
  featuredOnly?: boolean;
  manualIds?: string[];
  limit?: number;
};

function normalizeCatalogSource(
  source: CatalogBlockConfig["source"]
): "packages" | "hotels" | "services" {
  if (source === "catalog-items") return "packages";
  if (source === "listings") return "hotels";
  if (source === "offerings") return "services";
  return source;
}

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
    href: card.href,
    images: card.images,
  };
}

export async function loadCatalogItems(config: CatalogBlockConfig): Promise<CatalogCardData[]> {
  const normalizedSource = normalizeCatalogSource(config.source);
  const typeSlug = LEGACY_SOURCE_TO_TYPE[normalizedSource];
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
