export type {
  SearchAnalyticsEvent,
  SearchContentKind,
  SearchFacetFilter,
  SearchIndexRecord,
  SearchQueryInput,
  SearchQueryPlan,
  SearchResult,
  SearchSuggestion,
  SearchVisibility,
  ResolvedSearchSettings,
} from "./types";

export { SearchEngine, searchEngine, type SearchPageResult } from "./engine/search-engine";
export { SearchIndexer, frameworkSearchIndexer } from "./indexer/search-indexer";
export type { RebuildResult } from "./indexer/rebuild-from-discovery";
export { InvalidSearchIndexRecordError } from "./indexer/validate-index-record";
export { SearchRegistry, searchRegistry } from "./registry/search-registry";
export {
  defineSearchProvider,
  type SearchProvider,
  type SearchProviderContext,
  type SearchProviderDefinition,
} from "./providers/search-provider";
export { BUILTIN_SEARCH_PROVIDERS } from "./providers/builtin-providers";
export { SearchQueryBuilder, searchQueryBuilder } from "./query/search-query-builder";
export { SearchFilterEngine, searchFilterEngine } from "./filter/search-filter-engine";
export { SearchRankingEngine, searchRankingEngine } from "./ranking/search-ranking-engine";
export { SearchResultMapper, searchResultMapper } from "./mapper/search-result-mapper";
export { SearchAnalytics, searchAnalytics } from "./analytics/search-analytics";
export { SearchSettingsManager, searchSettingsManager } from "./settings/search-settings-manager";
export {
  buildSearchBody,
  extractFacetValues,
  extractSearchableAttributeText,
  isFieldSearchable,
  type SearchableFieldDefinition,
  type SearchFieldConfig,
} from "./schema/search-field-schema";
export {
  entityTypeToKind,
  kindToEntityType,
  kindsToEntityTypes,
  kindFromMetadata,
} from "./schema/kind-map";
export {
  resolveContentTypeSearchConfig,
  resolveCatalogSearchSiteConfig,
  type ContentTypeSearchConfig,
  type CatalogSearchSiteConfig,
} from "./schema/content-type-search-config";
export {
  discoverCatalogSearchSources,
  type CatalogSearchDiscovery,
} from "./discovery/catalog-search-discovery";
export { syncCatalogSearchIndexes } from "./indexer/catalog-index-sync";
export { CATALOG_SEARCH_PROVIDERS } from "./providers/catalog-providers";
export * from "./indexing";
