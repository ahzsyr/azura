import type { ContentItemView } from "@/features/content/content-public.types";
import type { ContentCardData } from "@/features/content/types";

export function itemViewToCardData(item: ContentItemView): ContentCardData {
  return {
    id: item.id,
    contentTypeSlug: item.contentTypeSlug,
    slug: item.slug,
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
    images: item.media.map((m) => ({ url: m.url, altEn: m.altEn, altAr: m.altAr })),
  };
}
