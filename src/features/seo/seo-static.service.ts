import { prisma } from "@/lib/prisma";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";import { seoRepository } from "@/repositories/seo.repository";
import { DEFAULT_ROBOTS, STATIC_SEO_PAGES } from "@/features/seo/constants";
import { translationService } from "@/features/translation/translation.service";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation";
const EMPTY_STATIC_META = {
  canonicalUrl: null,
  robots: DEFAULT_ROBOTS,
  focusKeywords: null,
  ogImageUrl: null,
  twitterCard: "summary_large_image" as const,
};

const WIRED_MERGE_SLUGS = Object.keys(CMS_WIRED_MARKETING_SLUGS).filter(
  (slug) => slug !== "why-choose-us",
);

const SEO_FIELDS = ["metaTitle", "metaDescription", "ogTitle", "ogDescription"] as const;

function isEmpty(value: string | null | undefined): boolean {
  return !value?.trim();
}

/** Merge a single wired slug's cmsPageId SeoMeta row into its pageKey row. Returns true when a duplicate was retired. */
export async function mergeWiredPageSeoForSlug(slug: string): Promise<boolean> {
  if (!WIRED_MERGE_SLUGS.includes(slug)) return false;

  const cmsPage = await prisma.cmsPage.findUnique({
    where: { slug },
    include: { seoMeta: true },
  });
  if (!cmsPage?.seoMeta) return false;

  const cmsMeta = cmsPage.seoMeta;
  let pageKeyMeta = await seoRepository.getByPageKey(slug);
  if (!pageKeyMeta) {
    pageKeyMeta = await seoRepository.upsertMetaByPageKey(slug, {
      canonicalUrl: cmsMeta.canonicalUrl,
      robots: cmsMeta.robots,
      focusKeywords: cmsMeta.focusKeywords,
      ogImageUrl: cmsMeta.ogImageUrl,
      twitterCard: cmsMeta.twitterCard,
      jsonLd: cmsMeta.jsonLd ?? undefined,
    });
  } else if (pageKeyMeta.id !== cmsMeta.id) {
    await seoRepository.upsertMetaByPageKey(slug, {
      canonicalUrl: isEmpty(pageKeyMeta.canonicalUrl) ? cmsMeta.canonicalUrl : pageKeyMeta.canonicalUrl,
      robots: isEmpty(pageKeyMeta.robots) ? cmsMeta.robots : pageKeyMeta.robots,
      focusKeywords: isEmpty(pageKeyMeta.focusKeywords)
        ? cmsMeta.focusKeywords
        : pageKeyMeta.focusKeywords,
      ogImageUrl: isEmpty(pageKeyMeta.ogImageUrl) ? cmsMeta.ogImageUrl : pageKeyMeta.ogImageUrl,
      twitterCard: isEmpty(pageKeyMeta.twitterCard) ? cmsMeta.twitterCard : pageKeyMeta.twitterCard,
      jsonLd: pageKeyMeta.jsonLd ?? cmsMeta.jsonLd ?? undefined,
    });
    pageKeyMeta = (await seoRepository.getByPageKey(slug))!;
  } else {
    return false;
  }

  const [pageKeyTranslations, cmsTranslations] = await Promise.all([
    translationService.getForEntity("SeoMeta", pageKeyMeta.id),
    translationService.getForEntity("SeoMeta", cmsMeta.id),
  ]);

  const pageKeyShape = legacyShapeFromTranslations(pageKeyTranslations, [...SEO_FIELDS]);
  const cmsShape = legacyShapeFromTranslations(cmsTranslations, [...SEO_FIELDS]);

  for (const [key, value] of Object.entries(cmsShape)) {
    if (isEmpty(pageKeyShape[key]) && !isEmpty(value)) {
      const field = SEO_FIELDS.find((f) => key.startsWith(f));
      if (!field) continue;
      const suffix = key.slice(field.length);
      const localeCode =
        suffix === "En" ? "en" : suffix === "Ar" ? "ar" : suffix.startsWith("_") ? suffix.slice(1) : "";
      if (!localeCode) continue;
      await translationService.upsert({
        entityType: "SeoMeta",
        entityId: pageKeyMeta.id,
        field,
        localeCode,
        value: value.trim(),
      });
    }
  }

  if (cmsMeta.id !== pageKeyMeta.id) {
    await prisma.entityTranslation.deleteMany({
      where: { entityType: "SeoMeta", entityId: cmsMeta.id },
    });
    await prisma.seoMeta.delete({ where: { id: cmsMeta.id } });
    return true;
  }

  return false;
}

/** Merge duplicate cmsPageId SeoMeta rows into pageKey rows for wired marketing slugs. */
export async function mergeWiredPageSeoDuplicates(): Promise<number> {
  let merged = 0;

  for (const slug of WIRED_MERGE_SLUGS) {
    if (await mergeWiredPageSeoForSlug(slug)) merged++;
  }

  return merged;
}

/** Create placeholder SeoMeta rows for registry pages that have no record yet. */
export async function ensureStaticSeoMetaRecords(): Promise<number> {
  let created = 0;

  for (const page of STATIC_SEO_PAGES) {
    const existing = await seoRepository.getByPageKey(page.pageKey);
    if (existing) continue;
    await seoRepository.upsertMetaByPageKey(page.pageKey, EMPTY_STATIC_META);
    created++;
  }

  await mergeWiredPageSeoDuplicates();

  return created;
}

/** @deprecated Use listPageSeoContexts from resolve-page-seo-context.ts */
export type CmsSeoDefaults = {
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  cmsPageId?: string;
};
