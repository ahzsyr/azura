import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createCached, CACHE_TAGS } from "@/services/cache";
import {
  contentPublicService,
  toLegacyPackageView,
  toLegacyServiceView,
} from "@/features/content/content-public.service";
import type { LegacyPackageView, LegacyServiceView } from "@/features/content/content-public.types";
import { loadCompanyInfoWithTranslations } from "@/features/translation/admin-entity-helpers";
import type { CompanyInfoView } from "@/features/translation/admin-entity-helpers";
import { jsonStoreService } from "./json-store.service";
import {
  getGalleryHomePreviewCached,
  getTestimonialsCached,
} from "@/services/data-loaders";

export type MarketingHomeBatch = {
  company: CompanyInfoView | null;
  packages: LegacyPackageView[];
  services: LegacyServiceView[];
  testimonials: Awaited<ReturnType<typeof getTestimonialsCached>>;
  gallery: Awaited<ReturnType<typeof getGalleryHomePreviewCached>>;
};

/** Batched marketing homepage data — single round-trip, lean selects. */
export const loadMarketingHomeBatch = cache(async (): Promise<MarketingHomeBatch> => {
  await contentPublicService.ensureReady();
  const [company, packageItems, serviceItems, testimonials, gallery] = await Promise.all([
    loadCompanyInfoWithTranslations(),
    contentPublicService.listItemsByTypeSlug("catalog-items", { featuredOnly: true }),
    contentPublicService.listItemsByTypeSlug("offerings"),
    getTestimonialsCached(3),
    getGalleryHomePreviewCached(8),
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
