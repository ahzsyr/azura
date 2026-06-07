import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createCached, CACHE_TAGS } from "@/services/cache";
import {
  contentPublicService,
  toLegacyPackageView,
  toLegacyServiceView,
} from "@/features/content/content-public.service";
import { jsonStoreService } from "./json-store.service";

/** Batched marketing homepage data — single round-trip, lean selects. */
export const loadMarketingHomeBatch = cache(async () => {
  await contentPublicService.ensureReady();
  const [company, packageItems, serviceItems, testimonials, gallery] = await Promise.all([
    prisma.companyInfo.findUnique({ where: { id: "default" } }),
    contentPublicService.listItemsByTypeSlug("catalog-items", { featuredOnly: true }),
    contentPublicService.listItemsByTypeSlug("offerings"),
    prisma.testimonial.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        name: true,
        location: true,
        rating: true,
        contentEn: true,
        contentAr: true,
        imageUrl: true,
        videoUrl: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
      take: 3,
    }),
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
      take: 8,
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
  ]);

  const packages = packageItems.slice(0, 3).map(toLegacyPackageView);
  const services = serviceItems.slice(0, 6).map(toLegacyServiceView);

  return { company, packages, services, testimonials, gallery };
});

const getAppSettingsCached = createCached(
  () => jsonStoreService.get<Record<string, unknown>>("settings", "app"),
  ["json-settings-app"],
  { tags: [CACHE_TAGS.json("settings")], revalidate: 600 }
);

export const storageLoaders = {
  marketingHome: loadMarketingHomeBatch,
  appSettings: getAppSettingsCached,
};
