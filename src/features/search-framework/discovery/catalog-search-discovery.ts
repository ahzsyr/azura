import "server-only";

import { prisma } from "@/lib/prisma";
import { getIndexerLocales } from "@/i18n/indexer-locales";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { urlPrefixToCatalogLocale } from "@/features/catalog/locales";
import {
  resolveCatalogSearchSiteConfig,
  resolveContentTypeSearchConfig,
} from "@/features/search-framework/schema/content-type-search-config";
import { resolveAdminSearchSettings } from "@/features/search/settings/resolve-admin-search-settings";
import type { SearchSourcesSettings } from "@/features/search/settings/admin-search-settings.schema";
import {
  isContentTypeLandingsEnabled,
  isContentTypeSlugSearchable,
} from "@/features/search/settings/search-sources";
import type { SearchContentKind } from "@/features/search-framework/types";

export type DiscoveredContentType = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  labelPluralEn: string;
  labelPluralAr: string;
  routePrefix: string | null;
  icon: string;
  search: ReturnType<typeof resolveContentTypeSearchConfig>;
};

export type DiscoveredContentCollection = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  contentTypeId: string;
  contentTypeSlug: string;
  isPublished: boolean;
};

export type CatalogSearchDiscovery = {
  contentTypes: DiscoveredContentType[];
  contentCollections: DiscoveredContentCollection[];
  enabledContentTypeSlugs: Set<string>;
  enabledContentTypeIds: Set<string>;
  siteCatalog: ReturnType<typeof resolveCatalogSearchSiteConfig>;
  sources: SearchSourcesSettings;
  hasSearchableContentItems: boolean;
  indexerLocales: Awaited<ReturnType<typeof getIndexerLocales>>;
  /** Logical kinds currently indexed */
  kinds: SearchContentKind[];
};

export async function discoverCatalogSearchSources(): Promise<CatalogSearchDiscovery> {
  const [types, collections, indexerLocales, siteByLocale, sources] = await Promise.all([
    prisma.contentType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.contentCollection.findMany({
      where: { isPublished: true },
      include: { contentType: { select: { slug: true, isEnabled: true, adminConfig: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    getIndexerLocales(),
    loadSiteCatalogFlags(),
    loadSearchSourceFlags(),
  ]);

  const contentTypes: DiscoveredContentType[] = [];
  const enabledContentTypeSlugs = new Set<string>();
  const enabledContentTypeIds = new Set<string>();

  for (const row of types) {
    const search = resolveContentTypeSearchConfig(row.adminConfig, row.isEnabled);
    if (!search.enabled) continue;
    if (!isContentTypeSlugSearchable(row.slug, sources)) continue;

    contentTypes.push({
      id: row.id,
      slug: row.slug,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      labelPluralEn: row.labelPluralEn,
      labelPluralAr: row.labelPluralAr,
      routePrefix: row.routePrefix,
      icon: row.icon,
      search,
    });
    enabledContentTypeSlugs.add(row.slug);
    enabledContentTypeIds.add(row.id);
  }

  const contentCollections: DiscoveredContentCollection[] = [];
  for (const col of collections) {
    if (!sources.collections) continue;
    const typeSearch = resolveContentTypeSearchConfig(
      col.contentType.adminConfig,
      col.contentType.isEnabled
    );
    if (!typeSearch.enabled) continue;
    if (!isContentTypeSlugSearchable(col.contentType.slug, sources)) continue;
    contentCollections.push({
      id: col.id,
      slug: col.slug,
      nameEn: col.nameEn,
      nameAr: col.nameAr,
      excerptEn: col.excerptEn,
      excerptAr: col.excerptAr,
      contentTypeId: col.contentTypeId,
      contentTypeSlug: col.contentType.slug,
      isPublished: col.isPublished,
    });
  }

  const kinds: SearchContentKind[] = [];
  if (isContentTypeLandingsEnabled(sources)) kinds.push("content_type");
  if (sources.collections) kinds.push("content_collection");
  if (enabledContentTypeIds.size > 0) kinds.push("content_item");
  if (sources.pages) kinds.push("cms_page");
  if (sources.posts) kinds.push("post");
  if (sources.faqs) kinds.push("faq");
  if (sources.testimonials) kinds.push("testimonial");

  if (siteByLocale.products) kinds.push("catalog_product");
  if (siteByLocale.collections) kinds.push("catalog_collection");
  if (siteByLocale.categories) kinds.push("catalog_category");

  return {
    contentTypes,
    contentCollections,
    enabledContentTypeSlugs,
    enabledContentTypeIds,
    siteCatalog: siteByLocale,
    sources,
    hasSearchableContentItems: enabledContentTypeIds.size > 0,
    indexerLocales,
    kinds,
  };
}

async function loadSearchSourceFlags() {
  try {
    const en = await readSiteSettings("en-us");
    return resolveAdminSearchSettings(en).sources;
  } catch {
    return resolveAdminSearchSettings({}).sources;
  }
}

async function loadSiteCatalogFlags() {
  const merged = resolveCatalogSearchSiteConfig(null);
  try {
    const en = await readSiteSettings("en-us");
    const flags = resolveCatalogSearchSiteConfig(en.search);
    const admin = resolveAdminSearchSettings(en);
    const src = admin.sources;
    return {
      products: merged.products && flags.products && src.products,
      collections: merged.collections && flags.collections && src.collections,
      categories:
        merged.categories && flags.categories && (src.products || admin.catalog.categories),
    };
  } catch {
    return merged;
  }
}

/** Map url prefix → catalog locale for JSON index reads. */
export function catalogLocaleForUrlPrefix(urlPrefix: string): string {
  return urlPrefixToCatalogLocale(urlPrefix);
}
