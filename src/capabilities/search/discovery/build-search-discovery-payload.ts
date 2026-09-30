import type { SearchEntityType } from "@prisma/client";
import { SEARCH_ENTITY_TYPES, ENTITY_LABELS, labelForContentTypeSlug } from "@/capabilities/search/constants";
import type { CatalogSearchDiscovery } from "@/capabilities/search/engine/discovery/catalog-search-discovery";
import type { AdminSearchSettings } from "@/capabilities/search/settings/admin-search-settings.schema";
import { toPublicSearchConfig } from "@/capabilities/search/settings/public-search-config";
import { resolvePublicAutocompleteConfig } from "@/capabilities/search/settings/search-autocomplete-config";
import { buildSearchAnalyticsReport } from "@/capabilities/search/analytics/search-analytics-report.service";
import { getShortLanguageLocale } from "@/shared/layout/direction/direction-utils";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";
import type { LocalizedValueMap } from "@/features/translation/types";

export type SearchDiscoveryPayload = {
  contentTypes: {
    slug: string;
    label: string;
    labelEn?: string;
    labelAr?: string;
    icon: string;
    routePrefix: string | null;
    searchEnabled: boolean;
  }[];
  entityTypes: SearchEntityType[];
  entityLabels: Record<SearchEntityType, { en: string; ar: string }>;
  kinds: string[];
  siteCatalog: CatalogSearchDiscovery["siteCatalog"];
  config: ReturnType<typeof toPublicSearchConfig>;
  autocomplete: ReturnType<typeof resolvePublicAutocompleteConfig>;
  audience: "public" | "admin";
  popularQueries?: string[];
  trendingQueries?: string[];
};

function firstNonEmpty(...values: Array<string | undefined | null>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function resolveContentTypePluralLabel(
  slug: string,
  labelPlural: LocalizedValueMap,
  preferArabic: boolean
): { label: string; labelEn: string; labelAr: string } {
  const fromMapEn = firstNonEmpty(labelPlural.en, ...Object.values(labelPlural));
  const fromMapAr = firstNonEmpty(labelPlural.ar, labelPlural.en, ...Object.values(labelPlural));
  const labelEn = fromMapEn || labelForContentTypeSlug(slug, "en");
  const labelAr = fromMapAr || labelForContentTypeSlug(slug, "ar");
  return {
    label: preferArabic ? labelAr : labelEn,
    labelEn,
    labelAr,
  };
}

export function buildSearchDiscoveryPayload(
  admin: AdminSearchSettings,
  discovery: CatalogSearchDiscovery,
  audience: "public" | "admin",
  analyticsLocale = "en"
): SearchDiscoveryPayload {
  const normalizedLocale = getShortLanguageLocale(analyticsLocale);
  const useArabicLabels = isArabicLocale(normalizedLocale);
  const contentTypeFilters = discovery.contentTypes.map((t) => {
    const labels = resolveContentTypePluralLabel(t.slug, t.labelPlural, useArabicLabels);
    return {
      slug: t.slug,
      label: labels.label,
      labelEn: labels.labelEn,
      labelAr: labels.labelAr,
      icon: t.icon,
      routePrefix: t.routePrefix,
      searchEnabled: t.search.enabled,
    };
  });

  const src = discovery.sources;
  const includeMedia =
    audience === "admin"
      ? admin.adminSearch?.includeMedia !== false
      : src.media;

  const entityTypes = SEARCH_ENTITY_TYPES.filter((et) => {
    if (et === "MEDIA") return includeMedia;
    if (et === "CONTENT_TYPE") return src.contentTypeLandings && discovery.contentTypes.length > 0;
    if (et === "CONTENT_COLLECTION") return src.collections && discovery.contentCollections.length > 0;
    if (et === "CONTENT_ITEM") return discovery.hasSearchableContentItems;
    if (et === "CMS_PAGE") return src.pages;
    if (et === "POST") return src.posts;
    if (et === "FAQ") return src.faqs;
    if (et === "TESTIMONIAL") return src.testimonials;
    if (et === "CATALOG_PRODUCT") return discovery.siteCatalog.products;
    if (et === "CATALOG_COLLECTION") return discovery.siteCatalog.collections;
    if (et === "CATALOG_CATEGORY") return discovery.siteCatalog.categories;
    return false;
  });

  const entityLabels = Object.fromEntries(
    entityTypes.map((et) => [et, ENTITY_LABELS[et]])
  ) as Record<SearchEntityType, { en: string; ar: string }>;

  const autocomplete = resolvePublicAutocompleteConfig(admin.autocomplete);
  let popularQueries = autocomplete.popularQueries.slice(0, autocomplete.recentLimit);
  let trendingQueries = admin.autocomplete.trendingQueries?.slice(0, autocomplete.recentLimit) ?? [];

  return {
    contentTypes: contentTypeFilters,
    entityTypes,
    entityLabels,
    kinds: discovery.kinds,
    siteCatalog: discovery.siteCatalog,
    config: toPublicSearchConfig(admin),
    autocomplete,
    audience,
    popularQueries,
    trendingQueries,
  };
}

export async function buildSearchDiscoveryPayloadAsync(
  admin: AdminSearchSettings,
  discovery: CatalogSearchDiscovery,
  audience: "public" | "admin",
  analyticsLocale = "en"
): Promise<SearchDiscoveryPayload> {
  const base = buildSearchDiscoveryPayload(admin, discovery, audience, analyticsLocale);
  try {
    const report = await buildSearchAnalyticsReport(analyticsLocale);
    if (report.topSearchTerms.length) {
      base.popularQueries = report.topSearchTerms.slice(0, 8).map((t) => t.term);
    }
    if (report.noResultSearches.length) {
      base.trendingQueries = report.topSearchTerms
        .slice(0, 5)
        .map((t) => t.term)
        .filter((t) => !base.popularQueries?.includes(t));
    }
  } catch {
    /* keep admin defaults */
  }
  return base;
}
