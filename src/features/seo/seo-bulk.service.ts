import { getPublicBrandName } from "@/config/site";
import { prisma } from "@/lib/prisma";
import { seoRepository } from "@/repositories/seo.repository";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import type { SeoMetaWriteData } from "@/repositories/seo.repository";

export type BulkFillScope = "all" | "static" | "cms" | "posts";
export type BulkFillMode = "empty-only" | "always";

function isEmpty(value: string | null | undefined): boolean {
  return !value?.trim();
}

function mergeMeta(
  existing: Partial<SeoMetaWriteData> | null | Record<string, unknown>,
  incoming: SeoMetaWriteData,
  mode: BulkFillMode
): SeoMetaWriteData {
  const base = existing as Partial<SeoMetaWriteData> | null;
  const pick = (key: keyof SeoMetaWriteData): string => {
    const next = incoming[key];
    const cur = base?.[key];
    if (mode === "always") return typeof next === "string" ? next : "";
    if (typeof next === "string" && isEmpty(cur as string)) return next;
    return typeof cur === "string" ? cur : typeof next === "string" ? next : "";
  };

  return {
    titleEn: pick("titleEn"),
    titleAr: pick("titleAr"),
    descriptionEn: pick("descriptionEn"),
    descriptionAr: pick("descriptionAr"),
    canonicalUrl: base?.canonicalUrl ?? null,
    robots: base?.robots ?? "index, follow",
    focusKeywords: base?.focusKeywords ?? null,
    ogTitleEn: base?.ogTitleEn ?? null,
    ogTitleAr: base?.ogTitleAr ?? null,
    ogImageUrl: base?.ogImageUrl ?? null,
    twitterCard: base?.twitterCard ?? "summary_large_image",
  };
}

function buildFromTitles(
  titleEn: string,
  titleAr: string,
  excerptEn?: string | null,
  excerptAr?: string | null
): SeoMetaWriteData {
  const brand = getPublicBrandName();
  const descEn = excerptEn?.trim() || `${titleEn} — ${brand} premium Umrah and Islamic travel.`;
  const descAr = excerptAr?.trim() || `${titleAr} — ${brand} للعمرة والسفر الإسلامي الفاخر.`;
  return {
    titleEn,
    titleAr,
    descriptionEn: descEn.slice(0, 320),
    descriptionAr: descAr.slice(0, 320),
    canonicalUrl: null,
    robots: "index, follow",
    focusKeywords: null,
    ogTitleEn: null,
    ogTitleAr: null,
    ogImageUrl: null,
    twitterCard: "summary_large_image",
  };
}

export const seoBulkService = {
  async bulkFillMetadata(scope: BulkFillScope, mode: BulkFillMode) {
    let updated = 0;

    if (scope === "all" || scope === "static") {
      for (const page of STATIC_SEO_PAGES) {
        const existing = await seoRepository.getByPageKey(page.pageKey);
        const incoming = buildFromTitles(page.label, page.label);
        const data = mergeMeta(existing, incoming, mode);
        await seoRepository.upsertMetaByPageKey(page.pageKey, data);
        updated++;
      }
    }

    if (scope === "all" || scope === "cms") {
      const pages = await prisma.cmsPage.findMany({
        select: { id: true, slug: true, titleEn: true, titleAr: true, excerptEn: true, excerptAr: true },
      });
      for (const page of pages) {
        const existing = await seoRepository.getByCmsPageId(page.id);
        const incoming = buildFromTitles(
          page.titleEn,
          page.titleAr,
          page.excerptEn,
          page.excerptAr
        );
        const data = mergeMeta(existing, incoming, mode);
        await seoRepository.upsertMetaByCmsPage(page.id, data);
        updated++;
      }
    }

    if (scope === "all" || scope === "posts") {
      const posts = await prisma.post.findMany({
        select: { id: true, titleEn: true, titleAr: true, excerptEn: true, excerptAr: true },
      });
      for (const post of posts) {
        const existing = await seoRepository.getByPostId(post.id);
        const incoming = buildFromTitles(
          post.titleEn,
          post.titleAr,
          post.excerptEn,
          post.excerptAr
        );
        const data = mergeMeta(existing, incoming, mode);
        await seoRepository.upsertMetaByPost(post.id, data);
        updated++;
      }
    }

    return { updated };
  },
};
