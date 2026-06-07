import { createCached, CACHE_TAGS } from "@/services/cache";
import { REVALIDATE } from "@/lib/config/performance";
import { prisma } from "@/lib/prisma";
import {
  contentPublicService,
  toLegacyHotelView,
  toLegacyPackageView,
  toLegacyServiceView,
} from "@/features/content/content-public.service";

function marketingCacheOpts() {
  return {
    tags: [CACHE_TAGS.marketing],
    revalidate: REVALIDATE.marketing,
  };
}

async function ensureContent() {
  await contentPublicService.ensureReady();
}

export const getCompanyInfoCached = createCached(
  () => prisma.companyInfo.findUnique({ where: { id: "default" } }),
  ["company-info"],
  { tags: [CACHE_TAGS.company], revalidate: REVALIDATE.static }
);

export function getPublishedPackagesCached(categorySlug?: string) {
  return createCached(
    async () => {
      await ensureContent();
      const items = await contentPublicService.listItemsByTypeSlug("catalog-items", {
        collectionSlug: categorySlug,
      });
      return items.map(toLegacyPackageView);
    },
    ["published-packages", categorySlug ?? "all"],
    marketingCacheOpts()
  )();
}

export function getPackageBySlugCached(slug: string) {
  return createCached(
    async () => {
      await ensureContent();
      const item = await contentPublicService.getItemByTypeAndSlug("catalog-items", slug);
      return item ? toLegacyPackageView(item) : null;
    },
    ["package", slug],
    { tags: [CACHE_TAGS.package(slug), CACHE_TAGS.marketing], revalidate: REVALIDATE.packages }
  )();
}

export const getCategoriesCached = createCached(
  async () => {
    await ensureContent();
    return contentPublicService.listCollections("catalog-items");
  },
  ["package-categories"],
  { tags: [CACHE_TAGS.categories, CACHE_TAGS.marketing], revalidate: REVALIDATE.static }
);

export const getServicesCached = createCached(
  async () => {
    await ensureContent();
    const items = await contentPublicService.listItemsByTypeSlug("offerings");
    return items.map(toLegacyServiceView);
  },
  ["services"],
  marketingCacheOpts()
);

export const getHotelsCached = createCached(
  async () => {
    await ensureContent();
    const items = await contentPublicService.listItemsByTypeSlug("listings");
    return items.map(toLegacyHotelView);
  },
  ["hotels"],
  marketingCacheOpts()
);

export function getGalleriesCached() {
  return createCached(
    async () => {
      const rows = await prisma.gallery.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          slug: true,
          titleEn: true,
          titleAr: true,
          excerptEn: true,
          excerptAr: true,
          coverUrl: true,
          sortOrder: true,
          media: {
            where: { isPublished: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { mediaUrl: true },
          },
          _count: { select: { media: { where: { isPublished: true } } } },
        },
        orderBy: { sortOrder: "asc" },
      });

      return rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        titleEn: row.titleEn,
        titleAr: row.titleAr,
        excerptEn: row.excerptEn,
        excerptAr: row.excerptAr,
        coverUrl: row.coverUrl ?? row.media[0]?.mediaUrl ?? null,
        mediaCount: row._count.media,
      }));
    },
    ["galleries"],
    marketingCacheOpts()
  )();
}

export function getGalleryBySlugCached(slug: string) {
  return createCached(
    async () => {
      const row = await prisma.gallery.findFirst({
        where: { slug, isPublished: true },
        select: {
          id: true,
          slug: true,
          titleEn: true,
          titleAr: true,
          excerptEn: true,
          excerptAr: true,
          descriptionEn: true,
          descriptionAr: true,
          infoEn: true,
          infoAr: true,
          coverUrl: true,
          media: {
            where: { isPublished: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              titleEn: true,
              titleAr: true,
              excerptEn: true,
              excerptAr: true,
              descriptionEn: true,
              descriptionAr: true,
              infoEn: true,
              infoAr: true,
              mediaUrl: true,
              mediaKind: true,
              sortOrder: true,
            },
          },
        },
      });

      if (!row) return null;

      return {
        id: row.id,
        slug: row.slug,
        titleEn: row.titleEn,
        titleAr: row.titleAr,
        excerptEn: row.excerptEn,
        excerptAr: row.excerptAr,
        descriptionEn: row.descriptionEn,
        descriptionAr: row.descriptionAr,
        infoEn: row.infoEn,
        infoAr: row.infoAr,
        coverUrl: row.coverUrl,
        mediaCount: row.media.length,
        media: row.media,
      };
    },
    ["gallery", slug],
    marketingCacheOpts()
  )();
}

export function getGalleryHomePreviewCached(limit = 8) {
  return createCached(
    async () =>
      prisma.galleryMedia.findMany({
        where: { isPublished: true, gallery: { isPublished: true } },
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          mediaUrl: true,
          mediaKind: true,
          gallery: { select: { slug: true } },
        },
        orderBy: [{ gallery: { sortOrder: "asc" } }, { sortOrder: "asc" }],
        take: limit,
      }).then((rows) =>
        rows.map((row) => ({
          id: row.id,
          titleEn: row.titleEn,
          titleAr: row.titleAr,
          mediaUrl: row.mediaUrl,
          mediaKind: row.mediaKind,
          gallerySlug: row.gallery.slug,
        }))
      ),
    ["gallery-home-preview", String(limit)],
    marketingCacheOpts()
  )();
}

const testimonialPublicSelect = {
  id: true,
  name: true,
  location: true,
  rating: true,
  contentEn: true,
  contentAr: true,
  imageUrl: true,
  videoUrl: true,
} as const;

export function getTestimonialsCached(limit?: number) {
  return createCached(
    async () =>
      prisma.testimonial.findMany({
        where: { isPublished: true },
        select: testimonialPublicSelect,
        orderBy: { sortOrder: "asc" },
        ...(limit ? { take: limit } : {}),
      }),
    ["testimonials", String(limit ?? "all")],
    marketingCacheOpts()
  )();
}

export function getTestimonialsByIdsCached(ids: string[]) {
  const key = ids.length ? ids.join(",") : "none";
  return createCached(
    async () => {
      if (ids.length === 0) return [];
      const rows = await prisma.testimonial.findMany({
        where: { id: { in: ids }, isPublished: true },
        select: testimonialPublicSelect,
      });
      const byId = new Map(rows.map((r) => [r.id, r]));
      return ids.map((id) => byId.get(id)).filter(Boolean) as typeof rows;
    },
    ["testimonials-by-ids", key],
    marketingCacheOpts()
  )();
}

export function getTestimonialCollectionBySlugCached(slug: string) {
  return createCached(
    async () => {
      const row = await prisma.testimonialCollection.findFirst({
        where: { slug, isPublished: true },
        select: {
          id: true,
          slug: true,
          titleEn: true,
          titleAr: true,
          excerptEn: true,
          excerptAr: true,
          items: {
            where: { testimonial: { isPublished: true } },
            orderBy: { sortOrder: "asc" },
            select: {
              testimonial: { select: testimonialPublicSelect },
            },
          },
        },
      });
      if (!row) return null;
      const testimonials = row.items
        .map((i) => i.testimonial)
        .filter((t): t is NonNullable<typeof t> => t != null);
      return {
        id: row.id,
        slug: row.slug,
        titleEn: row.titleEn,
        titleAr: row.titleAr,
        excerptEn: row.excerptEn,
        excerptAr: row.excerptAr,
        testimonials,
      };
    },
    ["testimonial-collection", slug],
    marketingCacheOpts()
  )();
}

export function getFaqSetsCached() {
  return createCached(
    async () =>
      prisma.faqSet.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          slug: true,
          titleEn: true,
          titleAr: true,
          excerptEn: true,
          excerptAr: true,
          descriptionEn: true,
          descriptionAr: true,
          _count: { select: { items: { where: { isPublished: true } } } },
        },
        orderBy: { sortOrder: "asc" },
      }).then((rows) =>
        rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          titleEn: row.titleEn,
          titleAr: row.titleAr,
          excerptEn: row.excerptEn,
          excerptAr: row.excerptAr,
          descriptionEn: row.descriptionEn,
          descriptionAr: row.descriptionAr,
          itemCount: row._count.items,
        }))
      ),
    ["faq-sets"],
    marketingCacheOpts()
  )();
}

export function getFaqSetBySlugCached(slug: string) {
  return createCached(
    async () => {
      const row = await prisma.faqSet.findFirst({
        where: { slug, isPublished: true },
        select: {
          id: true,
          slug: true,
          titleEn: true,
          titleAr: true,
          excerptEn: true,
          excerptAr: true,
          descriptionEn: true,
          descriptionAr: true,
          items: {
            where: { isPublished: true },
            select: {
              id: true,
              questionEn: true,
              questionAr: true,
              answerEn: true,
              answerAr: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
      if (!row) return null;
      return {
        id: row.id,
        slug: row.slug,
        titleEn: row.titleEn,
        titleAr: row.titleAr,
        excerptEn: row.excerptEn,
        excerptAr: row.excerptAr,
        descriptionEn: row.descriptionEn,
        descriptionAr: row.descriptionAr,
        itemCount: row.items.length,
        items: row.items,
      };
    },
    ["faq-set", slug],
    marketingCacheOpts()
  )();
}

export function getPricingPlanSetBySlugCached(slug: string) {
  return createCached(
    async () => {
      const { pricingPlanSetService } = await import("@/features/pricing-plans/service");
      return pricingPlanSetService.getBySlug(slug);
    },
    ["pricing-plan-set", slug],
    marketingCacheOpts()
  )();
}

export function getReleaseSetBySlugCached(slug: string) {
  return createCached(
    async () => {
      const { releaseSetService } = await import("@/features/releases/service");
      return releaseSetService.getBySlug(slug);
    },
    ["release-set", slug],
    marketingCacheOpts()
  )();
}

export function getPricingCalculatorBySlugCached(slug: string) {
  return createCached(
    async () => {
      const { pricingCalculatorService } = await import("@/features/pricing-calculators/service");
      return pricingCalculatorService.getBySlug(slug);
    },
    ["pricing-calculator", slug],
    marketingCacheOpts()
  )();
}

export function getKnowledgeBaseBySlugCached(
  slug: string,
  categorySlug?: string,
  limit?: number
) {
  return createCached(
    async () => {
      const { knowledgeBaseService } = await import("@/features/knowledge-base/service");
      return knowledgeBaseService.getBySlug(slug, { categorySlug, limit });
    },
    ["knowledge-base", slug, categorySlug ?? "all", String(limit ?? "all")],
    marketingCacheOpts()
  )();
}

export function getDocPortalBySlugCached(
  slug: string,
  versionSlug?: string,
  rootSectionSlug?: string
) {
  return createCached(
    async () => {
      const { docPortalService } = await import("@/features/documentation/service");
      return docPortalService.getBySlug(slug, { versionSlug, rootSectionSlug });
    },
    ["doc-portal", slug, versionSlug ?? "default", rootSectionSlug ?? "all"],
    marketingCacheOpts()
  )();
}

export function getStatusBoardBySlugCached(slug: string) {
  return createCached(
    async () => {
      const { statusBoardService } = await import("@/features/status/service");
      return statusBoardService.getBySlug(slug);
    },
    ["status-board", slug],
    marketingCacheOpts()
  )();
}

export function getTeamDirectoryBySlugCached(
  slug: string,
  departmentId?: string,
  limit?: number
) {
  return createCached(
    async () => {
      const { teamDirectoryService } = await import("@/features/team/service");
      return teamDirectoryService.getBySlug(slug, { departmentId, limit });
    },
    ["team-directory", slug, departmentId ?? "all", String(limit ?? "all")],
    marketingCacheOpts()
  )();
}

export function getPartnerProgramBySlugCached(
  slug: string,
  categorySlug?: string,
  locationFilter?: string,
  limit?: number
) {
  return createCached(
    async () => {
      const { partnerProgramService } = await import("@/features/partners/service");
      return partnerProgramService.getBySlug(slug, { categorySlug, locationFilter, limit });
    },
    [
      "partner-program",
      slug,
      categorySlug ?? "all",
      locationFilter ?? "all",
      String(limit ?? "all"),
    ],
    marketingCacheOpts()
  )();
}
