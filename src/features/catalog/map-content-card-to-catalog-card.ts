import type { CatalogCardData } from "@/features/catalog/types";
import { TYPE_TO_LEGACY_SOURCE } from "@/features/content/content-type.registry";
import type { ContentCardData } from "@/features/content/types";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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

/** Legacy catalog chrome only for mapped types — custom types keep their own slug. */
export function resolveCatalogCardSource(contentTypeSlug: string): string {
  return TYPE_TO_LEGACY_SOURCE[contentTypeSlug] ?? contentTypeSlug;
}

export function mapContentCardToCatalogCard(card: ContentCardData): CatalogCardData {
  const source = resolveCatalogCardSource(card.contentTypeSlug);
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
    city: readString(attrs.city),
    locationEn: readString(attrs.locationEn) ?? readString(attrs.location),
    locationAr: readString(attrs.locationAr),
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
