import { rebuildSearchIndex } from "../actions";
import { frameworkSearchIndexer } from "../engine";
import { ensureSearchRuntimeConfig } from "../settings/search-runtime";
import { searchService } from "../service/search.service";
import { handleSearchAutocomplete } from "../service/autocomplete.service";

export const searchCapability = {
  id: "search" as const,
  indexer: frameworkSearchIndexer,
  search: searchService.search.bind(searchService),
  searchPage: searchService.searchPage.bind(searchService),
  suggest: searchService.suggestions.bind(searchService),
  autocomplete: handleSearchAutocomplete,
  ensureRuntimeConfig: ensureSearchRuntimeConfig,
  rebuildAll: rebuildSearchIndex,
  stats: searchService.stats.bind(searchService),
  statsByType: searchService.statsByType.bind(searchService),
};
