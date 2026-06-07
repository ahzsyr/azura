import type { SearchEntityType } from "@prisma/client";
import { SEARCH_ENTITY_TYPES, ENTITY_LABELS } from "@/features/search/constants";
import type { CatalogSearchDiscovery } from "@/features/search-framework/discovery/catalog-search-discovery";
import type { AdminSearchSettings } from "@/features/search/settings/admin-search-settings.schema";
import { toPublicSearchConfig } from "@/features/search/settings/public-search-config";
import { resolvePublicAutocompleteConfig } from "@/features/search/settings/search-autocomplete-config";

export type SearchDiscoveryPayload = {
  contentTypes: {
    slug: string;
    labelEn: string;
    labelAr: string;
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
};

export function buildSearchDiscoveryPayload(
  admin: AdminSearchSettings,
  discovery: CatalogSearchDiscovery,
  audience: "public" | "admin"
): SearchDiscoveryPayload {
  const contentTypeFilters = discovery.contentTypes.map((t) => ({
    slug: t.slug,
    labelEn: t.labelPluralEn,
    labelAr: t.labelPluralAr,
    icon: t.icon,
    routePrefix: t.routePrefix,
    searchEnabled: t.search.enabled,
  }));

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

  return {
    contentTypes: contentTypeFilters,
    entityTypes,
    entityLabels,
    kinds: discovery.kinds,
    siteCatalog: discovery.siteCatalog,
    config: toPublicSearchConfig(admin),
    autocomplete: resolvePublicAutocompleteConfig(admin.autocomplete),
    audience,
  };
}
