import type { SearchAutocompleteSettings } from "@/capabilities/search/settings/admin-search-settings.schema";

export type PublicAutocompleteConfig = {
  instantSuggestions: boolean;
  suggestDebounceMs: number;
  suggestMinLength: number;
  suggestLimit: number;
  showRecent: boolean;
  showPopular: boolean;
  showTrending: boolean;
  showHistory: boolean;
  showSuggestions: boolean;
  showResultPreviews: boolean;
  groupResults: boolean;
  keyboardNavigation: boolean;
  recentLimit: number;
  historyLimit: number;
  popularQueries: string[];
};

const DEFAULT: PublicAutocompleteConfig = {
  instantSuggestions: true,
  suggestDebounceMs: 200,
  suggestMinLength: 1,
  suggestLimit: 8,
  showRecent: true,
  showPopular: true,
  showTrending: true,
  showHistory: true,
  showSuggestions: true,
  showResultPreviews: true,
  groupResults: true,
  keyboardNavigation: true,
  recentLimit: 8,
  historyLimit: 50,
  popularQueries: [],
};

export function resolvePublicAutocompleteConfig(
  raw?: Partial<SearchAutocompleteSettings> | null
): PublicAutocompleteConfig {
  if (!raw) return { ...DEFAULT };
  return {
    instantSuggestions: raw.instantSuggestions !== false,
    suggestDebounceMs:
      typeof raw.suggestDebounceMs === "number"
        ? Math.min(800, Math.max(0, raw.suggestDebounceMs))
        : typeof raw.debounceMs === "number"
          ? Math.min(800, Math.max(0, raw.debounceMs))
          : DEFAULT.suggestDebounceMs,
    suggestMinLength:
      typeof raw.suggestMinLength === "number"
        ? Math.min(4, Math.max(0, Math.floor(raw.suggestMinLength)))
        : DEFAULT.suggestMinLength,
    suggestLimit:
      typeof raw.suggestLimit === "number"
        ? Math.min(20, Math.max(4, Math.floor(raw.suggestLimit)))
        : DEFAULT.suggestLimit,
    showRecent: raw.showRecent !== false,
    showPopular: raw.showPopular !== false,
    showTrending: raw.showTrending !== false,
    showHistory: raw.showHistory !== false,
    showSuggestions: raw.showSuggestions !== false,
    showResultPreviews: raw.showResultPreviews !== false,
    groupResults: raw.groupResults !== false,
    keyboardNavigation: raw.keyboardNavigation !== false,
    recentLimit:
      typeof raw.recentLimit === "number"
        ? Math.min(20, Math.max(3, Math.floor(raw.recentLimit)))
        : DEFAULT.recentLimit,
    historyLimit:
      typeof raw.historyLimit === "number"
        ? Math.min(200, Math.max(10, Math.floor(raw.historyLimit)))
        : DEFAULT.historyLimit,
    popularQueries: Array.isArray(raw.popularQueries)
      ? raw.popularQueries.map(String).filter(Boolean)
      : DEFAULT.popularQueries,
  };
}
