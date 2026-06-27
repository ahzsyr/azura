import type { ResolvedSearchSettings } from "@/capabilities/search/engine/types";

const DEFAULT_SETTINGS: ResolvedSearchSettings = {
  enabled: true,
  globalSearchEnabled: true,
  searchPageEnabled: false,
  searchPagePath: "/search",
  resultsPerPage: 20,
  instantSearch: true,
  debounceMs: 280,
  fuzziness: 0.35,
  defaultLimit: 20,
  suggestLimit: 8,
  minQueryLength: 2,
  fullTextMinLength: 2,
  maxResults: 20,
  searchMode: "hybrid",
  skipLikeWhenFullText: false,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export class SearchSettingsManager {
  private cached: ResolvedSearchSettings | null = null;

  resolve(raw?: Record<string, unknown> | null): ResolvedSearchSettings {
    if (!raw) return { ...DEFAULT_SETTINGS };

    const general =
      raw.general && typeof raw.general === "object" && !Array.isArray(raw.general)
        ? (raw.general as Record<string, unknown>)
        : null;

    const debounceMs =
      typeof general?.debounceMs === "number" && Number.isFinite(general.debounceMs)
        ? clamp(general.debounceMs, 0, 800)
        : typeof raw.debounceMs === "number" && Number.isFinite(raw.debounceMs)
          ? clamp(raw.debounceMs, 0, 800)
          : DEFAULT_SETTINGS.debounceMs;
    const fuzziness =
      typeof raw.fuzziness === "number" && Number.isFinite(raw.fuzziness)
        ? clamp(raw.fuzziness, 0.1, 0.6)
        : DEFAULT_SETTINGS.fuzziness;
    const enabled = general?.enabled !== false && raw.enabled !== false;
    const globalSearchEnabled =
      general?.globalSearchEnabled !== false && raw.globalSearchEnabled !== false;
    const searchPageEnabled =
      general?.searchPageEnabled === true || raw.searchPageEnabled === true;
    const searchPagePath =
      typeof general?.searchPagePath === "string" && general.searchPagePath.trim()
        ? String(general.searchPagePath).trim()
        : typeof raw.searchPagePath === "string" && raw.searchPagePath.trim()
          ? String(raw.searchPagePath).trim()
          : DEFAULT_SETTINGS.searchPagePath;
    const instantSearch = general?.instantSearch !== false && raw.instantSearch !== false;
    const resultsPerPage =
      typeof general?.resultsPerPage === "number" && Number.isFinite(general.resultsPerPage)
        ? clamp(Math.floor(general.resultsPerPage), 5, 100)
        : typeof raw.resultsPerPage === "number" && Number.isFinite(raw.resultsPerPage)
          ? clamp(Math.floor(raw.resultsPerPage), 5, 100)
          : DEFAULT_SETTINGS.resultsPerPage;
    const maxResults =
      typeof general?.maxResults === "number" && Number.isFinite(general.maxResults)
        ? clamp(Math.floor(general.maxResults), 8, 80)
        : typeof raw.maxResults === "number" && Number.isFinite(raw.maxResults)
          ? clamp(Math.floor(raw.maxResults), 8, 80)
          : DEFAULT_SETTINGS.maxResults;
    const defaultLimit = resultsPerPage;
    const searchMode =
      general?.mode === "basic" ||
      general?.mode === "advanced" ||
      general?.mode === "fuzzy" ||
      general?.mode === "hybrid"
        ? general.mode
        : raw.searchMode === "basic" ||
            raw.searchMode === "advanced" ||
            raw.searchMode === "fuzzy" ||
            raw.searchMode === "hybrid"
          ? raw.searchMode
          : DEFAULT_SETTINGS.searchMode;

    const ranking =
      raw.ranking && typeof raw.ranking === "object" && !Array.isArray(raw.ranking)
        ? (raw.ranking as Record<string, unknown>)
        : null;
    const performance =
      raw.performance && typeof raw.performance === "object" && !Array.isArray(raw.performance)
        ? (raw.performance as Record<string, unknown>)
        : null;

    const minQueryLength =
      typeof general?.minQueryLength === "number" && Number.isFinite(general.minQueryLength)
        ? clamp(Math.floor(general.minQueryLength), 1, 6)
        : typeof ranking?.fullTextMinLength === "number" && Number.isFinite(ranking.fullTextMinLength)
          ? clamp(Math.floor(ranking.fullTextMinLength), 1, 6)
          : typeof raw.minQueryLength === "number" && Number.isFinite(raw.minQueryLength)
            ? clamp(Math.floor(raw.minQueryLength), 1, 6)
            : DEFAULT_SETTINGS.minQueryLength;

    const fullTextMinLength = minQueryLength;

    return {
      enabled,
      globalSearchEnabled,
      searchPageEnabled,
      searchPagePath,
      resultsPerPage,
      instantSearch,
      debounceMs,
      fuzziness,
      defaultLimit,
      maxResults,
      suggestLimit:
        typeof raw.suggestLimit === "number" && Number.isFinite(raw.suggestLimit)
          ? clamp(Math.floor(raw.suggestLimit), 4, 20)
          : DEFAULT_SETTINGS.suggestLimit,
      minQueryLength,
      fullTextMinLength,
      searchMode,
      skipLikeWhenFullText: performance?.skipLikeWhenFullText === true,
    };
  }

  setCache(settings: ResolvedSearchSettings): void {
    this.cached = settings;
  }

  getCached(): ResolvedSearchSettings {
    return this.cached ?? { ...DEFAULT_SETTINGS };
  }

  async loadFromSiteRecord(site: Record<string, unknown>): Promise<ResolvedSearchSettings> {
    const raw =
      site.search && typeof site.search === "object" && !Array.isArray(site.search)
        ? (site.search as Record<string, unknown>)
        : null;
    const resolved = this.resolve(raw);
    this.setCache(resolved);
    return resolved;
  }
}

export const searchSettingsManager = new SearchSettingsManager();
