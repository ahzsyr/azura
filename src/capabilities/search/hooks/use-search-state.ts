"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ENTITY_LABELS } from "@/capabilities/search/constants";
import type {
  PublicSearchConfig,
  PublicSearchFilterDef,
} from "@/capabilities/search/settings/public-search-config";
import {
  resolvePublicAutocompleteConfig,
  type PublicAutocompleteConfig,
} from "@/capabilities/search/settings/search-autocomplete-config";
import type {
  AutocompleteHit,
  AutocompletePayload,
  SearchDiscoveryPayload,
} from "@/capabilities/search/components/search-autocomplete.types";
import {
  getRecentSearches,
  getSearchHistory,
  pushSearchHistory,
  type SearchHistoryEntry,
} from "@/capabilities/search/components/search-history.storage";
import type { SearchEntityType } from "@prisma/client";
import { searchCopy, type SearchLocale } from "@/capabilities/search/components/search-ui/search-copy";
import { trackSearchAnalytics } from "@/capabilities/search/analytics/search-analytics.client";
import { useDebouncedValue } from "@/capabilities/search/query/use-debounced-value";
import {
  useSearchAutocompleteQuery,
  useSearchDiscoveryQuery,
} from "@/capabilities/search/query/use-search-queries";
import {
  isSearchLatencyEnabledForSurface,
  type SearchLatencySurface,
} from "@/capabilities/search/query/search-feature-flags";
import { searchAutocompleteKey } from "@/capabilities/search/query/search-query-keys";
import { useSearchPrefetch } from "@/capabilities/search/query/use-search-prefetch";
import {
  useSearchCacheHitMetrics,
  useSearchDedupMetrics,
} from "@/capabilities/search/query/use-search-dedup-metrics";

export type UseSearchStateOptions = {
  apiBase: string;
  discoveryUrl: string;
  locale: SearchLocale;
  config: PublicSearchConfig;
  adminMode?: boolean;
  /** When false, skips autocomplete fetch until enabled (e.g. modal closed). Default true. */
  active?: boolean;
  entityTypePreset?: SearchEntityType[];
  /** Initial query (e.g. from URL on search page). */
  initialQuery?: string;
  /** command mode skips facet mining for performance */
  panelMode?: "command" | "discovery";
  /** Rollout surface for latency optimizations (builder → page → modal). */
  surface?: SearchLatencySurface;
};

function useLegacySearchFetch(options: {
  autocompleteUrl: string;
  locale: SearchLocale;
  typesQuery: string;
  facetsQuery: string;
  active: boolean;
  debounceMs: number;
  query: string;
  searchError: string;
}) {
  const [results, setResults] = useState<AutocompleteHit[]>([]);
  const [suggestions, setSuggestions] = useState<AutocompleteHit[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [relatedTerms, setRelatedTerms] = useState<string[]>([]);
  const [apiGrouped, setApiGrouped] = useState<Record<string, AutocompleteHit[]> | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAutocomplete = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${options.autocompleteUrl}?q=${encodeURIComponent(q)}&locale=${options.locale}${options.typesQuery}${options.facetsQuery}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setError(options.searchError);
          return;
        }
        const data = (await res.json()) as AutocompletePayload;
        if (abortRef.current !== controller) return;
        setPopular(data.popular ?? []);
        setTrending(data.trending ?? []);
        setSuggestions(data.suggestions ?? []);
        setResults(data.results ?? []);
        setApiGrouped(data.grouped);
        setRelatedTerms(data.relatedTerms ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(options.searchError);
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [options.autocompleteUrl, options.locale, options.typesQuery, options.facetsQuery, options.searchError]
  );

  useEffect(() => {
    if (!options.active) return;
    const timer = setTimeout(() => void fetchAutocomplete(options.query), options.debounceMs);
    return () => clearTimeout(timer);
  }, [options.query, fetchAutocomplete, options.debounceMs, options.active]);

  const clearResults = useCallback(() => {
    abortRef.current?.abort();
    setResults([]);
    setSuggestions([]);
    setLoading(false);
    setError(null);
  }, []);

  return {
    results,
    suggestions,
    popular,
    trending,
    relatedTerms,
    apiGrouped,
    loading,
    error,
    clearResults,
  };
}

export function useSearchState({
  apiBase,
  discoveryUrl,
  locale,
  config,
  adminMode = false,
  active = true,
  entityTypePreset,
  initialQuery = "",
  panelMode = "discovery",
  surface = "modal",
}: UseSearchStateOptions) {
  const useQueryLayer = isSearchLatencyEnabledForSurface(surface);
  const [query, setQuery] = useState(initialQuery);
  const [activeTypes, setActiveTypes] = useState<SearchEntityType[]>(entityTypePreset ?? []);
  const [activeFacetFilters, setActiveFacetFilters] = useState<Record<string, string[]>>({});
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [historyEntries, setHistoryEntries] = useState<SearchHistoryEntry[]>([]);

  const t = searchCopy(locale);
  const autocompleteUrl = `${apiBase}/autocomplete`;

  const discoveryQuery = useSearchDiscoveryQuery(
    discoveryUrl,
    locale,
    apiBase,
    surface,
    useQueryLayer
  );

  const [legacyDiscovery, setLegacyDiscovery] = useState<SearchDiscoveryPayload | null>(null);
  const [legacyDiscoveryError, setLegacyDiscoveryError] = useState<string | null>(null);

  useEffect(() => {
    if (useQueryLayer) return;
    fetch(discoveryUrl)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setLegacyDiscovery(null);
          setLegacyDiscoveryError(typeof data?.detail === "string" ? data.detail : t.searchError);
          return;
        }
        setLegacyDiscovery(data as SearchDiscoveryPayload);
        setLegacyDiscoveryError(null);
      })
      .catch(() => {
        setLegacyDiscovery(null);
        setLegacyDiscoveryError(t.searchError);
      });
  }, [discoveryUrl, t.searchError, useQueryLayer]);

  const discovery = useQueryLayer ? (discoveryQuery.data ?? null) : legacyDiscovery;
  const discoveryError = useQueryLayer
    ? discoveryQuery.error
      ? t.searchError
      : null
    : legacyDiscoveryError;

  const runtimeConfig = discovery?.config ?? config;
  const ac: PublicAutocompleteConfig =
    discovery?.config?.autocomplete ??
    discovery?.autocomplete ??
    resolvePublicAutocompleteConfig(config.autocomplete as never);
  const minLen = runtimeConfig.minQueryLength;
  const debounceMs = ac.instantSuggestions ? ac.suggestDebounceMs : runtimeConfig.debounceMs;
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const typesQuery = useMemo(
    () => (activeTypes.length ? `&types=${activeTypes.join(",")}` : ""),
    [activeTypes]
  );

  const facetsQuery = useMemo(() => {
    const keys = Object.keys(activeFacetFilters);
    if (!keys.length) return "";
    const payload: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(activeFacetFilters)) {
      if (v.length) payload[k] = v;
    }
    if (!Object.keys(payload).length) return "";
    return `&facets=${encodeURIComponent(JSON.stringify(payload))}`;
  }, [activeFacetFilters]);

  const autocompleteQuery = useSearchAutocompleteQuery({
    apiBase,
    locale,
    q: debouncedQuery,
    types: activeTypes,
    facets: activeFacetFilters,
    enabled: useQueryLayer && active,
    surface,
  });

  const legacy = useLegacySearchFetch({
    autocompleteUrl,
    locale,
    typesQuery,
    facetsQuery,
    active: !useQueryLayer && active,
    debounceMs,
    query,
    searchError: t.searchError,
  });

  const autocompleteData = autocompleteQuery.data;

  useSearchDedupMetrics(
    searchAutocompleteKey({
      apiBase,
      locale,
      q: debouncedQuery,
      types: activeTypes,
      facets: activeFacetFilters,
    }),
    surface,
    "autocomplete"
  );

  useSearchCacheHitMetrics(
    autocompleteQuery.isFetching,
    autocompleteQuery.isFetched,
    surface,
    "autocomplete",
    debouncedQuery
  );

  const results = useQueryLayer ? (autocompleteData?.results ?? []) : legacy.results;
  const suggestions = useQueryLayer ? (autocompleteData?.suggestions ?? []) : legacy.suggestions;
  const popular = useQueryLayer ? (autocompleteData?.popular ?? []) : legacy.popular;
  const trending = useQueryLayer ? (autocompleteData?.trending ?? []) : legacy.trending;
  const relatedTerms = useQueryLayer ? (autocompleteData?.relatedTerms ?? []) : legacy.relatedTerms;
  const apiGrouped = useQueryLayer ? autocompleteData?.grouped : legacy.apiGrouped;
  const loading = useQueryLayer
    ? autocompleteQuery.isFetching && !autocompleteQuery.isPlaceholderData
    : legacy.loading;
  const error = useQueryLayer ? (autocompleteQuery.isError ? t.searchError : discoveryError) : legacy.error;

  useSearchPrefetch({
    surface,
    locale,
    apiBase,
    q: debouncedQuery,
    types: activeTypes,
    facets: activeFacetFilters,
    relatedTerms,
    suggestionTitles: suggestions.map((s) => s.title),
    enabled: useQueryLayer && active && debouncedQuery.length >= minLen,
  });

  const refreshLocalHistory = useCallback(() => {
    setRecentQueries(getRecentSearches(locale, ac.recentLimit));
    setHistoryEntries(getSearchHistory(locale, ac.historyLimit));
  }, [locale, ac.recentLimit, ac.historyLimit]);

  useEffect(() => {
    refreshLocalHistory();
  }, [refreshLocalHistory]);

  const filterEntityTypes = useMemo(() => {
    const base = discovery?.entityTypes?.length
      ? discovery.entityTypes
      : (Object.keys(ENTITY_LABELS) as SearchEntityType[]);
    const filtered = base.filter((type) => adminMode || type !== "MEDIA");
    if (entityTypePreset?.length) {
      return filtered.filter((et) => entityTypePreset.includes(et));
    }
    return filtered;
  }, [discovery, adminMode, entityTypePreset]);

  const enabledFilters = runtimeConfig.filters ?? [];

  const clearAllFilters = useCallback(() => {
    setQuery("");
    setActiveTypes(entityTypePreset ?? []);
    setActiveFacetFilters({});
    if (!useQueryLayer) legacy.clearResults();
  }, [entityTypePreset, useQueryLayer, legacy]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeTypes.length > 0) count += 1;
    for (const values of Object.values(activeFacetFilters)) {
      count += values.length;
    }
    return count;
  }, [activeTypes, activeFacetFilters]);

  const facetValueOptions = useMemo(() => {
    if (panelMode === "command") return new Map<string, Set<string>>();

    const map = new Map<string, Set<string>>();

    for (const filter of enabledFilters) {
      if (filter.id === "contentType" && discovery?.contentTypes?.length) {
        const set = new Set<string>();
        for (const ct of discovery.contentTypes) {
          set.add(ct.slug);
        }
        if (set.size) map.set(filter.id, set);
      }
    }

    for (const filter of enabledFilters) {
      for (const result of results) {
        if (!result.facets) continue;
        for (const facetKey of filter.facetKeys) {
          const raw = result.facets[facetKey];
          if (raw == null) continue;
          const values = Array.isArray(raw) ? raw.map(String) : [String(raw)];
          const set = map.get(filter.id) ?? new Set<string>();
          for (const v of values) {
            if (v.trim()) set.add(v.trim());
          }
          map.set(filter.id, set);
        }
      }
    }
    return map;
  }, [results, enabledFilters, discovery?.contentTypes, panelMode]);

  const buildSearchPageUrl = useCallback(
    (q: string, filters?: { types?: SearchEntityType[]; facets?: Record<string, string[]> }) => {
      const base = runtimeConfig.searchPagePath || "/search";
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const types = filters?.types ?? activeTypes;
      if (types.length) params.set("types", types.join(","));
      const facets = filters?.facets ?? activeFacetFilters;
      const facetKeys = Object.keys(facets);
      if (facetKeys.length) {
        const payload: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(facets)) {
          if (v.length) payload[k] = v;
        }
        if (Object.keys(payload).length) {
          params.set("facets", JSON.stringify(payload));
        }
      }
      const qs = params.toString();
      return qs ? `${base}?${qs}` : base;
    },
    [runtimeConfig.searchPagePath, activeTypes, activeFacetFilters]
  );

  const toggleFacetValue = useCallback(
    (filterId: string, value: string) => {
      setActiveFacetFilters((prev) => {
        const cur = prev[filterId] ?? [];
        const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
        const updated = !next.length
          ? (() => {
              const { [filterId]: _, ...rest } = prev;
              return rest;
            })()
          : { ...prev, [filterId]: next };
        trackSearchAnalytics({
          type: "filter",
          locale,
          filterId,
          values: next.length ? next : [value],
        });
        return updated;
      });
    },
    [locale]
  );

  const toggleType = useCallback((type: SearchEntityType) => {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const showContentTypeChips =
    runtimeConfig.filters?.some((f) => f.id === "contentType") ?? true;

  const grouped = useMemo(() => {
    if (apiGrouped && ac.groupResults) {
      return new Map(Object.entries(apiGrouped) as [SearchEntityType, AutocompleteHit[]][]);
    }
    const map = new Map<SearchEntityType, AutocompleteHit[]>();
    for (const r of results) {
      const list = map.get(r.entityType) ?? [];
      list.push(r);
      map.set(r.entityType, list);
    }
    return map;
  }, [results, apiGrouped, ac.groupResults]);

  const entityLabels = discovery?.entityLabels ?? ENTITY_LABELS;
  const entityLabel = useCallback(
    (type: SearchEntityType) => entityLabels[type]?.[locale] ?? type,
    [entityLabels, locale]
  );

  const recordNavigate = useCallback(
    (
      hit: {
        urlPath: string;
        adminPath?: string;
        title?: string;
        entityType?: SearchEntityType;
        entityId?: string;
        id?: string;
      },
      searchQ?: string
    ) => {
      const historyQ = (searchQ ?? query).trim();
      if (hit.entityType && (hit.entityId || hit.id)) {
        trackSearchAnalytics({
          type: "conversion",
          locale,
          q: historyQ,
          entityType: hit.entityType,
          entityId: hit.entityId ?? hit.id ?? "",
          title: hit.title,
          urlPath: hit.urlPath,
        });
      }
      if (historyQ.length >= 1) {
        pushSearchHistory(locale, historyQ, {
          historyLimit: ac.historyLimit,
          recentLimit: ac.recentLimit,
          urlPath: hit.urlPath,
          title: hit.title,
        });
      }
      refreshLocalHistory();
    },
    [query, locale, ac.historyLimit, ac.recentLimit, refreshLocalHistory]
  );

  return {
    t,
    query,
    setQuery,
    loading,
    error,
    runtimeConfig,
    ac,
    minLen,
    results,
    suggestions,
    popular,
    trending,
    recentQueries,
    historyEntries,
    filterEntityTypes,
    activeTypes,
    setActiveTypes,
    setActiveFacetFilters,
    toggleType,
    activeFacetFilters,
    toggleFacetValue,
    enabledFilters: enabledFilters as PublicSearchFilterDef[],
    facetValueOptions,
    discovery,
    grouped,
    entityLabel,
    showContentTypeChips,
    discoveryContentTypes: discovery?.contentTypes,
    recordNavigate,
    refreshLocalHistory,
    clearAllFilters,
    activeFilterCount,
    relatedTerms,
    buildSearchPageUrl,
    panelMode,
  };
}

/** @deprecated Use useSearchState instead. */
export const useGlobalSearch = useSearchState;
