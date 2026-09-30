import "server-only";

import type { CmsPage } from "@prisma/client";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { readCatalogBrandProfiles } from "@/features/catalog/admin/catalog-taxonomy";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { prefixToCatalogLocaleCode } from "@/features/catalog/locales";
import { localeService } from "@/features/i18n/locale.service";
import { getProductPageLayoutTemplateMeta, validateTemplateId } from "@/features/products/layout-templates/registry-meta";
import { PAGE_REGISTRY_PROVIDERS, type PageProviderContext } from "./page-registry.providers";
import type { UnifiedPageEntry } from "./types";

export type ListUnifiedPagesInput = {
  cmsPages: CmsPage[];
  cmsDisplayTitles?: Map<string, string>;
  localePrefix?: string;
};

/** Read-only aggregator. Never writes page data. */
export async function listUnifiedPages(input: ListUnifiedPagesInput): Promise<UnifiedPageEntry[]> {
  const localePrefix = input.localePrefix ?? "en";
  const catalogLocale = await prefixToCatalogLocaleCode(localePrefix).catch(() => "en-us");
  const [collections, brandProfiles, site] = await Promise.all([
    collectionsDataService.loadAll({ localePrefix }).catch(() => []),
    readCatalogBrandProfiles(catalogLocale).catch(() => []),
    readSiteSettings(catalogLocale).catch(() => ({})),
  ]);

  const ctx: PageProviderContext = {
    cmsPages: input.cmsPages,
    cmsDisplayTitles: input.cmsDisplayTitles,
    collections,
    brandProfiles,
    site: site as Record<string, unknown>,
  };

  const entries = PAGE_REGISTRY_PROVIDERS.flatMap((provide) => provide(ctx));
  entries.sort((a, b) => a.title.localeCompare(b.title));
  return entries;
}

export async function getDefaultLocalePrefix(): Promise<string> {
  const enabled = await localeService.listEnabled().catch(() => []);
  return enabled.find((l) => l.isDefault)?.urlPrefix ?? enabled[0]?.urlPrefix ?? "en";
}

export function getTemplateLabel(templateId: string): string {
  return getProductPageLayoutTemplateMeta(validateTemplateId(templateId)).label;
}
