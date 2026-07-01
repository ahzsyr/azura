import type { CmsPagePublicView } from "@/features/cms/cms.service";
import type { CachedPagePayload } from "@/features/storage/page-cache";

/** Build a renderable CMS page view from a published page-cache payload (no DB). */
export function publicViewFromPageCache(cached: CachedPagePayload): CmsPagePublicView {
  const updatedAt = new Date(cached.updatedAt);
  const excerptEn = cached.excerptEn ?? "";
  const excerptAr = cached.excerptAr ?? "";
  const excerpt = cached.excerpt ?? (excerptEn || excerptAr || "");

  return {
    id: cached.id,
    slug: cached.slug,
    templateKey: null,
    status: "PUBLISHED",
    blocks: cached.blocks as CmsPagePublicView["blocks"],
    visualSettings: {},
    publishedAt: updatedAt,
    scheduledAt: null,
    createdAt: updatedAt,
    updatedAt,
    seoMeta: null,
    title: cached.title,
    excerpt,
    description: excerpt,
    titleEn: cached.titleEn,
    titleAr: cached.titleAr,
    excerptEn,
    excerptAr,
    descriptionEn: excerptEn,
    descriptionAr: excerptAr,
  };
}
