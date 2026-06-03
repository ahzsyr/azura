import type { ResolvedSearchFiltersConfig } from "@/features/search/settings/resolve-search-filters";
import { resolveSearchFilters } from "@/features/search/settings/resolve-search-filters";
import type { SearchFiltersSettings } from "@/features/search/settings/admin-search-settings.schema";

let cached: ResolvedSearchFiltersConfig | null = null;

export function setSearchFiltersConfig(config: ResolvedSearchFiltersConfig): void {
  cached = config;
}

export function getSearchFiltersConfig(): ResolvedSearchFiltersConfig {
  return cached ?? resolveSearchFilters(undefined);
}

export function resolveAndCacheSearchFilters(
  settings: SearchFiltersSettings | undefined,
  discoveredCustom: Parameters<typeof resolveSearchFilters>[1] = []
): ResolvedSearchFiltersConfig {
  const config = resolveSearchFilters(settings, discoveredCustom);
  setSearchFiltersConfig(config);
  return config;
}
