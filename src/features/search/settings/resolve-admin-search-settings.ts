import { z } from "zod";
import {
  adminSearchSettingsSchema,
  searchHeaderLayoutSchema,
  searchInputStyleSchema,
  searchPanelWidthSchema,
  searchShortcutSchema,
  type AdminSearchSettings,
} from "@/features/search/settings/admin-search-settings.schema";
import { resolveSearchSources } from "@/features/search/settings/search-sources";
import {
  normalizeRankingPriorityOrder,
  normalizeRankingWeights,
} from "@/features/search/settings/search-ranking-signals";
import { migrateFiltersRaw } from "@/features/search/settings/resolve-search-filters";
import { searchSemanticProviderSchema } from "@/features/search/settings/search-smart.schema";

function coerceEnum<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
): z.infer<T> | undefined {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function pickAppearanceField(
  s: Record<string, unknown>,
  key: string,
): unknown {
  const appearance =
    s.appearance && typeof s.appearance === "object" && !Array.isArray(s.appearance)
      ? (s.appearance as Record<string, unknown>)
      : {};
  const nested = appearance[key];
  if (nested !== undefined && nested !== "") return nested;
  return s[key];
}

function parseSearchRaw(site: Record<string, unknown>): Record<string, unknown> {
  const raw = site.search;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/** Map legacy / partial site.json `search` into normalized admin settings. */
export function resolveAdminSearchSettings(site: Record<string, unknown>): AdminSearchSettings {
  const s = parseSearchRaw(site);

  const fuzziness =
    s.fuzziness === "strict" || s.fuzziness === "balanced" || s.fuzziness === "fuzzy"
      ? s.fuzziness
      : typeof s.fuzziness === "number"
        ? s.fuzziness
        : undefined;

  const catalogRaw = s.catalog;
  const catalog =
    catalogRaw && typeof catalogRaw === "object" && !Array.isArray(catalogRaw)
      ? (catalogRaw as Record<string, unknown>)
      : {};

  const sourcesRaw = s.sources;
  const sources =
    sourcesRaw && typeof sourcesRaw === "object" && !Array.isArray(sourcesRaw)
      ? (sourcesRaw as Record<string, unknown>)
      : {};

  const generalRaw =
    s.general && typeof s.general === "object" && !Array.isArray(s.general)
      ? (s.general as Record<string, unknown>)
      : {};

  const minQueryLength =
    typeof generalRaw.minQueryLength === "number"
      ? generalRaw.minQueryLength
      : typeof s.minQueryLength === "number"
        ? s.minQueryLength
        : undefined;

  const maxResults =
    typeof generalRaw.maxResults === "number"
      ? generalRaw.maxResults
      : typeof s.maxResults === "number"
        ? s.maxResults
        : undefined;

  const debounceMs =
    typeof generalRaw.debounceMs === "number"
      ? generalRaw.debounceMs
      : typeof s.debounceMs === "number"
        ? s.debounceMs
        : undefined;

  const mode =
    generalRaw.mode === "basic" ||
    generalRaw.mode === "advanced" ||
    generalRaw.mode === "fuzzy" ||
    generalRaw.mode === "hybrid"
      ? generalRaw.mode
      : s.searchMode === "basic" ||
          s.searchMode === "advanced" ||
          s.searchMode === "fuzzy" ||
          s.searchMode === "hybrid"
        ? s.searchMode
        : undefined;

  const enabled = generalRaw.enabled !== false && s.enabled !== false;

  const general = {
    enabled,
    globalSearchEnabled:
      generalRaw.globalSearchEnabled !== false && s.globalSearchEnabled !== false,
    searchPageEnabled: generalRaw.searchPageEnabled === true || s.searchPageEnabled === true,
    searchPagePath:
      typeof generalRaw.searchPagePath === "string" && generalRaw.searchPagePath.trim()
        ? generalRaw.searchPagePath.trim()
        : typeof s.searchPagePath === "string" && s.searchPagePath.trim()
          ? s.searchPagePath.trim()
          : "/search",
    resultsPerPage:
      typeof generalRaw.resultsPerPage === "number"
        ? generalRaw.resultsPerPage
        : typeof s.resultsPerPage === "number"
          ? s.resultsPerPage
          : undefined,
    instantSearch: generalRaw.instantSearch !== false && s.instantSearch !== false,
    debounceMs,
    minQueryLength,
    maxResults,
    mode,
  };

  const merged = {
    enabled,
    general,
    fuzziness,
    listingFuzziness:
      typeof s.fuzziness === "number" && !["strict", "balanced", "fuzzy"].includes(String(s.fuzziness))
        ? s.fuzziness
        : typeof s.listingFuzziness === "number"
          ? s.listingFuzziness
          : 0.35,
    catalog: {
      products: catalog.products !== false && s.indexProducts !== false,
      collections: catalog.collections !== false,
      categories: catalog.categories !== false,
    },
    sources: resolveSearchSources(sources, catalog, s),
    ranking: (() => {
      const r =
        typeof s.ranking === "object" && s.ranking && !Array.isArray(s.ranking)
          ? (s.ranking as Record<string, unknown>)
          : {};
      const legacyTitle =
        typeof r.titleFieldWeight === "number"
          ? r.titleFieldWeight
          : undefined;
      const weightsRaw =
        r.weights && typeof r.weights === "object" && !Array.isArray(r.weights)
          ? (r.weights as Record<string, unknown>)
          : {};
      const weights = normalizeRankingWeights(
        Object.fromEntries(
          Object.entries(weightsRaw).filter(([, v]) => typeof v === "number")
        ) as Partial<Record<string, number>>,
        legacyTitle
      );
      return {
        ...r,
        weights,
        priorityOrder: normalizeRankingPriorityOrder(
          Array.isArray(r.priorityOrder) ? (r.priorityOrder as string[]) : undefined
        ),
        fullTextMinLength: minQueryLength,
      };
    })(),
    filters: migrateFiltersRaw(
      typeof s.filters === "object" && s.filters && !Array.isArray(s.filters)
        ? (s.filters as Record<string, unknown>)
        : {}
    ),
    autocomplete: (() => {
      const ac =
        typeof s.autocomplete === "object" && s.autocomplete && !Array.isArray(s.autocomplete)
          ? (s.autocomplete as Record<string, unknown>)
          : {};
      return {
        ...ac,
        debounceMs: typeof ac.debounceMs === "number" ? ac.debounceMs : debounceMs,
        suggestLimit:
          typeof ac.suggestLimit === "number"
            ? ac.suggestLimit
            : typeof s.suggestLimit === "number"
              ? s.suggestLimit
              : undefined,
        maxResults: typeof ac.maxResults === "number" ? ac.maxResults : maxResults,
        showRecent:
          typeof ac.showRecent === "boolean" ? ac.showRecent : s.showRecent !== false,
        showSuggestions:
          typeof ac.showSuggestions === "boolean"
            ? ac.showSuggestions
            : s.showSuggestions !== false,
        popularQueries: Array.isArray(ac.popularQueries)
          ? ac.popularQueries
          : Array.isArray(s.popularQueries)
            ? s.popularQueries
            : undefined,
      };
    })(),
    appearance: {
      inheritGlobalTheme:
        typeof (s.appearance as Record<string, unknown> | undefined)?.inheritGlobalTheme === "boolean"
          ? (s.appearance as { inheritGlobalTheme: boolean }).inheritGlobalTheme
          : s.inheritGlobalTheme !== false,
      modal: (() => {
        const raw =
          s.appearance && typeof s.appearance === "object" && !Array.isArray(s.appearance)
            ? (s.appearance as Record<string, unknown>).modal
            : undefined;
        const m =
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};
        return {
          panelStyle: m.panelStyle === "glass" ? "glass" : "solid",
          overlayOpacity: typeof m.overlayOpacity === "number" ? m.overlayOpacity : 78,
          overlayBlurPx: typeof m.overlayBlurPx === "number" ? m.overlayBlurPx : 16,
          panelOpacity: typeof m.panelOpacity === "number" ? m.panelOpacity : 98,
          panelBlurPx: typeof m.panelBlurPx === "number" ? m.panelBlurPx : 0,
        };
      })(),
      publicHeaderLayout: coerceEnum(
        searchHeaderLayoutSchema,
        pickAppearanceField(s, "publicHeaderLayout"),
      ),
      inputStyle: coerceEnum(searchInputStyleSchema, pickAppearanceField(s, "inputStyle")),
      panelWidth: coerceEnum(searchPanelWidthSchema, pickAppearanceField(s, "panelWidth")),
      placeholder:
        typeof pickAppearanceField(s, "placeholder") === "string" &&
        String(pickAppearanceField(s, "placeholder")).trim()
          ? String(pickAppearanceField(s, "placeholder")).trim()
          : undefined,
      showShortcutBadge: s.showShortcutBadge,
      keyboardShortcut: coerceEnum(searchShortcutSchema, pickAppearanceField(s, "keyboardShortcut")),
      showInHeader: s.showInHeader,
      showOnMobile: s.showOnMobile,
    },
    smart: (() => {
      const raw =
        typeof s.smart === "object" && s.smart && !Array.isArray(s.smart)
          ? (s.smart as Record<string, unknown>)
          : {};
      const semanticRaw =
        raw.semantic && typeof raw.semantic === "object" && !Array.isArray(raw.semantic)
          ? (raw.semantic as Record<string, unknown>)
          : {};
      return {
        ...raw,
        multiKeywordMode:
          raw.multiKeywordMode === "all" || raw.multiKeywordMode === "any"
            ? raw.multiKeywordMode
            : undefined,
        semantic: {
          ...semanticRaw,
          provider: coerceEnum(searchSemanticProviderSchema, semanticRaw.provider),
        },
      };
    })(),
    adminSearch:
      s.adminSearch && typeof s.adminSearch === "object" && !Array.isArray(s.adminSearch)
        ? (s.adminSearch as Record<string, unknown>)
        : {},
    analytics: s.analytics,
    performance: s.performance,
  };

  const parsed = adminSearchSettingsSchema.safeParse(merged);
  if (parsed.success) {
    return { ...parsed.data, enabled: parsed.data.general.enabled };
  }

  console.warn(
    "[resolveAdminSearchSettings] Invalid site.json search config — using defaults:",
    parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  );
  const fallback = adminSearchSettingsSchema.parse({});
  return { ...fallback, enabled: fallback.general.enabled };
}

/** Persist shape written back to site.json `search`. */
export function adminSearchSettingsToSiteJson(settings: AdminSearchSettings): Record<string, unknown> {
  const fuzziness =
    typeof settings.listingFuzziness === "number"
      ? settings.listingFuzziness
      : settings.fuzziness === "strict"
        ? 0.24
        : settings.fuzziness === "fuzzy"
          ? 0.48
          : 0.35;

  const g = settings.general;

  return {
    enabled: g.enabled,
    general: g,
    fuzziness: settings.fuzziness ?? "balanced",
    searchMode: g.mode,
    globalSearchEnabled: g.globalSearchEnabled,
    searchPageEnabled: g.searchPageEnabled,
    searchPagePath: g.searchPagePath,
    resultsPerPage: g.resultsPerPage,
    instantSearch: g.instantSearch,
    debounceMs: g.debounceMs,
    suggestLimit: settings.autocomplete.suggestLimit,
    maxResults: g.maxResults,
    minQueryLength: g.minQueryLength,
    showRecent: settings.autocomplete.showRecent,
    showSuggestions: settings.autocomplete.showSuggestions,
    publicHeaderLayout: settings.appearance.publicHeaderLayout,
    inputStyle: settings.appearance.inputStyle,
    panelWidth: settings.appearance.panelWidth,
    placeholder: settings.appearance.placeholder,
    showShortcutBadge: settings.appearance.showShortcutBadge,
    keyboardShortcut: settings.appearance.keyboardShortcut,
    showInHeader: settings.appearance.showInHeader,
    showOnMobile: settings.appearance.showOnMobile,
    catalog: {
      products: settings.sources.products,
      collections: settings.sources.collections,
      categories: settings.catalog.categories,
    },
    sources: settings.sources,
    ranking: {
      ...settings.ranking,
      fullTextMinLength: g.minQueryLength,
    },
    filters: settings.filters,
    autocomplete: {
      ...settings.autocomplete,
      debounceMs: g.debounceMs,
      maxResults: g.maxResults,
    },
    smart: settings.smart,
    appearance: settings.appearance,
    adminSearch: settings.adminSearch,
    analytics: settings.analytics,
    performance: settings.performance,
    listingFuzziness: fuzziness,
  };
}
