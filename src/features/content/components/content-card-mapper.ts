import type { ContentItemView } from "@/features/content/content-public.types";
import type { ContentCardData } from "@/features/content/types";

export function itemViewToCardData(item: ContentItemView): ContentCardData {
  return {
    id: item.id,
    contentTypeSlug: item.contentTypeSlug,
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    description: item.description,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    excerptEn: item.excerptEn,
    excerptAr: item.excerptAr,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
    attributes: item.attributes,
    isFeatured: item.isFeatured,
    collection: item.collection ?? undefined,
    href: item.href,
    images: item.media.map((m) => ({ url: m.url, alt: m.alt, altEn: m.altEn, altAr: m.altAr })),
  };
}
