import { createCached, CACHE_TAGS } from "@/services/cache";
import { REVALIDATE } from "@/lib/config/performance";
import { prisma } from "@/lib/prisma";
import {
  loadTranslationsMap,
  mergeCanonicalFields,
} from "@/features/translation/bilingual-serialize";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type { EntityTranslation } from "@prisma/client";
import {
  contentPublicService,
  toLegacyHotelView,
  toLegacyPackageView,
  toLegacyServiceView,
} from "@/features/content/content-public.service";

async function loadTranslations(entityType: string, entityIds: string[]) {
  return loadTranslationsMap(entityType, entityIds);
}

type BilingualLegacySpread<T extends readonly string[]> = {
  [K in T[number] as `${K}En` | `${K}Ar`]: string;
};

function bilingualLegacySpread<const T extends readonly string[]>(
  translations: EntityTranslation[],
  fields: T,
): BilingualLegacySpread<T> {
  const ctx = { translations };
  const canonical = mergeCanonicalFields(translations, [...fields]);
  const out = {} as BilingualLegacySpread<T>;
  for (const field of fields) {
    (out as Record<string, string>)[`${field}En`] = canonical[field] ?? "";
    (out as Record<string, string>)[`${field}Ar`] = resolveTranslation(field, "ar", ctx);
  }
  return out;
}

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
  async () => {
    const { loadCompanyInfoWithTranslations } = await import(
      "@/features/translation/admin-entity-helpers"
    );
    return loadCompanyInfoWithTranslations();
  },
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

      const translations = await loadTranslations(
        "Gallery",
        rows.map((row) => row.id)
      );

      return rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        ...bilingualLegacySpread(translations.get(row.id) ?? [], ["title", "excerpt"]),
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
          coverUrl: true,
          media: {
            where: { isPublished: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              mediaUrl: true,
              mediaKind: true,
              sortOrder: true,
            },
          },
        },
      });

      if (!row) return null;

      const galleryTranslations = await loadTranslations("Gallery", [row.id]);
      const mediaTranslations = await loadTranslations(
        "GalleryMedia",
        row.media.map((m) => m.id)
      );
      const galleryT = galleryTranslations.get(row.id) ?? [];

      return {
        id: row.id,
        slug: row.slug,
        ...bilingualLegacySpread(galleryT, ["title", "excerpt", "description", "info"]),
        coverUrl: row.coverUrl,
        mediaCount: row.media.length,
        media: row.media.map((m) => ({
          id: m.id,
          mediaUrl: m.mediaUrl,
          mediaKind: m.mediaKind,
          sortOrder: m.sortOrder,
          ...bilingualLegacySpread(mediaTranslations.get(m.id) ?? [], [
            "title",
            "excerpt",
            "description",
            "info",
          ]),
        })),
      };
    },
    ["gallery", slug],
    marketingCacheOpts()
  )();
}

export function getGalleryHomePreviewCached(limit = 8) {
  return createCached(
    async () => {
      const rows = await prisma.galleryMedia.findMany({
        where: { isPublished: true, gallery: { isPublished: true } },
        select: {
          id: true,
          mediaUrl: true,
          mediaKind: true,
          gallery: { select: { slug: true } },
        },
        orderBy: [{ gallery: { sortOrder: "asc" } }, { sortOrder: "asc" }],
        take: limit,
      });
      const translations = await loadTranslations(
        "GalleryMedia",
        rows.map((row) => row.id)
      );
      return rows.map((row) => ({
        id: row.id,
        ...bilingualLegacySpread(translations.get(row.id) ?? [], ["title"]),
        mediaUrl: row.mediaUrl,
        mediaKind: row.mediaKind,
        gallerySlug: row.gallery.slug,
      }));
    },
    ["gallery-home-preview", String(limit)],
    marketingCacheOpts()
  )();
}

const testimonialPublicSelect = {
  id: true,
  name: true,
  location: true,
  rating: true,
  imageUrl: true,
  videoUrl: true,
} as const;

async function serializeTestimonials(
  rows: Array<{
    id: string;
    name: string;
    location: string;
    rating: number;
    imageUrl: string | null;
    videoUrl: string | null;
  }>
) {
  const translations = await loadTranslations(
    "Testimonial",
    rows.map((row) => row.id)
  );
  return rows.map((row) => ({
    ...row,
    ...bilingualLegacySpread(translations.get(row.id) ?? [], ["content"]),
  }));
}

export function getTestimonialsCached(limit?: number) {
  return createCached(
    async () => {
      const rows = await prisma.testimonial.findMany({
        where: { isPublished: true },
        select: testimonialPublicSelect,
        orderBy: { sortOrder: "asc" },
        ...(limit ? { take: limit } : {}),
      });
      return serializeTestimonials(rows);
    },
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
      const serialized = await serializeTestimonials(rows);
      const byId = new Map(serialized.map((r) => [r.id, r]));
      return ids.map((id) => byId.get(id)).filter(Boolean) as typeof serialized;
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
      const collectionTranslations = await loadTranslations("TestimonialCollection", [row.id]);
      const collectionT = collectionTranslations.get(row.id) ?? [];
      const serializedTestimonials = await serializeTestimonials(testimonials);
      return {
        id: row.id,
        slug: row.slug,
        ...bilingualLegacySpread(collectionT, ["title", "excerpt"]),
        testimonials: serializedTestimonials,
      };
    },
    ["testimonial-collection", slug],
    marketingCacheOpts()
  )();
}

export function getFaqSetsCached() {
  return createCached(
    async () => {
      const rows = await prisma.faqSet.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          slug: true,
          _count: { select: { items: { where: { isPublished: true } } } },
        },
        orderBy: { sortOrder: "asc" },
      });
      const translations = await loadTranslations(
        "FaqSet",
        rows.map((row) => row.id)
      );
      return rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        ...bilingualLegacySpread(translations.get(row.id) ?? [], ["title", "excerpt", "description"]),
        itemCount: row._count.items,
      }));
    },
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
          items: {
            where: { isPublished: true },
            select: { id: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
      if (!row) return null;
      const setTranslations = await loadTranslations("FaqSet", [row.id]);
      const itemTranslations = await loadTranslations(
        "FaqItem",
        row.items.map((item) => item.id)
      );
      const setT = setTranslations.get(row.id) ?? [];
      return {
        id: row.id,
        slug: row.slug,
        ...bilingualLegacySpread(setT, ["title", "excerpt", "description"]),
        itemCount: row.items.length,
        items: row.items.map((item) => ({
          id: item.id,
          ...bilingualLegacySpread(itemTranslations.get(item.id) ?? [], ["question", "answer"]),
        })),
      };
    },
    ["faq-set", slug],
    marketingCacheOpts()
  )();
}

export function getPricingPlanSetBySlugCached(slug: string) {
  return createCached(
    async () => {
      const { pricingPlanSetService } = await import("@/presets/pricing/service");
      return pricingPlanSetService.getBySlug(slug);
    },
    ["pricing-plan-set", slug],
    marketingCacheOpts()
  )();
}

export function getReleaseSetBySlugCached(slug: string) {
  return createCached(
    async () => {
      const { releaseSetService } = await import("@/presets/release/service");
      return releaseSetService.getBySlug(slug);
    },
    ["release-set", slug],
    marketingCacheOpts()
  )();
}

export function getPricingCalculatorBySlugCached(slug: string) {
  return createCached(
    async () => {
      const { pricingCalculatorService } = await import("@/presets/pricing/calculators/service");
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
      const { knowledgeBaseService } = await import("@/presets/knowledge/service");
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
      const { docPortalService } = await import("@/modules/documentation/service");
      return docPortalService.getBySlug(slug, { versionSlug, rootSectionSlug });
    },
    ["doc-portal", slug, versionSlug ?? "default", rootSectionSlug ?? "all"],
    marketingCacheOpts()
  )();
}

export function getStatusBoardBySlugCached(slug: string) {
  return createCached(
    async () => {
      const { statusBoardService } = await import("@/modules/status-page/service");
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
      const { teamDirectoryService } = await import("@/presets/team-member/service");
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
      const { partnerProgramService } = await import("@/presets/partner/service");
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
