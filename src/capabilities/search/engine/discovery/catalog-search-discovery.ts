import "server-only";

import { prisma } from "@/lib/prisma";
import { getIndexerLocales } from "@/i18n/indexer-locales";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { prefixToCatalogLocaleCode } from "@/features/catalog/locales";
import {
  resolveCatalogSearchSiteConfig,
  resolveContentTypeSearchConfig,
} from "@/capabilities/search/engine/schema/content-type-search-config";
import { resolveAdminSearchSettings } from "@/capabilities/search/settings/resolve-admin-search-settings";
import type { SearchSourcesSettings } from "@/capabilities/search/settings/admin-search-settings.schema";
import {
  isContentTypeLandingsEnabled,
  isContentTypeSlugSearchable,
} from "@/capabilities/search/settings/search-sources";
import type { SearchContentKind } from "@/capabilities/search/engine/types";
import { loadTranslationBundle } from "@/features/translation/translation-bundle";
import { localizedField } from "@/features/portal/lib/portal-translation";
import type { LocalizedValueMap } from "@/features/translation/types";

export type DiscoveredContentType = {
  id: string;
  slug: string;
  name: LocalizedValueMap;
  labelPlural: LocalizedValueMap;
  routePrefix: string | null;
  icon: string;
  search: ReturnType<typeof resolveContentTypeSearchConfig>;
};

export type DiscoveredContentCollection = {
  id: string;
  slug: string;
  name: LocalizedValueMap;
  excerpt: LocalizedValueMap;
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

  const enabledTypes = types.filter((row) => {
    const search = resolveContentTypeSearchConfig(row.adminConfig, row.isEnabled);
    return search.enabled && isContentTypeSlugSearchable(row.slug, sources);
  });

  const typeBundle = await loadTranslationBundle(
    enabledTypes.map((row) => ({ entityType: "ContentType", entityId: row.id }))
  );

  for (const row of enabledTypes) {
    const search = resolveContentTypeSearchConfig(row.adminConfig, row.isEnabled);
    contentTypes.push({
      id: row.id,
      slug: row.slug,
      name: localizedField(typeBundle, "ContentType", row.id, "name"),
      labelPlural: localizedField(typeBundle, "ContentType", row.id, "labelPlural"),
      routePrefix: row.routePrefix,
      icon: row.icon,
      search,
    });
    enabledContentTypeSlugs.add(row.slug);
    enabledContentTypeIds.add(row.id);
  }

  const eligibleCollections = collections.filter((col) => {
    if (!sources.collections) return false;
    const typeSearch = resolveContentTypeSearchConfig(
      col.contentType.adminConfig,
      col.contentType.isEnabled
    );
    return typeSearch.enabled && isContentTypeSlugSearchable(col.contentType.slug, sources);
  });

  const collectionBundle = await loadTranslationBundle(
    eligibleCollections.map((col) => ({ entityType: "ContentCollection", entityId: col.id }))
  );

  const contentCollections: DiscoveredContentCollection[] = [];
  for (const col of eligibleCollections) {
    contentCollections.push({
      id: col.id,
      slug: col.slug,
      name: localizedField(collectionBundle, "ContentCollection", col.id, "name"),
      excerpt: localizedField(collectionBundle, "ContentCollection", col.id, "excerpt"),
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

/** Map url prefix → catalog locale code for index reads. */
export async function catalogLocaleForUrlPrefix(urlPrefix: string): Promise<string> {
  return prefixToCatalogLocaleCode(urlPrefix);
}
