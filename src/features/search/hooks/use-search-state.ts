"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ENTITY_LABELS } from "@/features/search/constants";
import type {
  PublicSearchConfig,
  PublicSearchFilterDef,
} from "@/features/search/settings/public-search-config";
import {
  resolvePublicAutocompleteConfig,
  type PublicAutocompleteConfig,
} from "@/features/search/settings/search-autocomplete-config";
import type {
  AutocompleteHit,
  AutocompletePayload,
  SearchDiscoveryPayload,
} from "@/features/search/components/search-autocomplete.types";
import {
  getRecentSearches,
  getSearchHistory,
  pushSearchHistory,
  type SearchHistoryEntry,
} from "@/features/search/components/search-history.storage";
import type { SearchEntityType } from "@prisma/client";
import { searchCopy, type SearchLocale } from "@/features/search/components/search-ui/search-copy";
import { trackSearchAnalytics } from "@/features/search/analytics/search-analytics.client";

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
};

export function useSearchState({
  apiBase,
  discoveryUrl,
  locale,
  config,
  adminMode = false,
  active = true,
  entityTypePreset,
  initialQuery = "",
}: UseSearchStateOptions) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AutocompleteHit[]>([]);
  const [suggestions, setSuggestions] = useState<AutocompleteHit[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [apiGrouped, setApiGrouped] = useState<Record<string, AutocompleteHit[]> | undefined>();
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [historyEntries, setHistoryEntries] = useState<SearchHistoryEntry[]>([]);
  const [activeTypes, setActiveTypes] = useState<SearchEntityType[]>(entityTypePreset ?? []);
  const [activeFacetFilters, setActiveFacetFilters] = useState<Record<string, string[]>>({});
  const [discovery, setDiscovery] = useState<SearchDiscoveryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const t = searchCopy(locale);
  const runtimeConfig = discovery?.config ?? config;
  const ac: PublicAutocompleteConfig =
    discovery?.config?.autocomplete ??
    discovery?.autocomplete ??
    resolvePublicAutocompleteConfig(config.autocomplete as never);
  const minLen = runtimeConfig.minQueryLength;
  const autocompleteUrl = `${apiBase}/autocomplete`;

  useEffect(() => {
    fetch(discoveryUrl)
      .then((r) => r.json())
      .then((data: SearchDiscoveryPayload) => {
        setDiscovery(data);
        setError(null);
      })
      .catch(() => {
        setDiscovery(null);
        setError(t.searchError);
      });
  }, [discoveryUrl, t.searchError]);

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

  const enabledFilters = runtimeConfig.filters ?? [];

  const fetchAutocomplete = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${autocompleteUrl}?q=${encodeURIComponent(q)}&locale=${locale}${typesQuery}${facetsQuery}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setError(t.searchError);
          return;
        }
        const data = (await res.json()) as AutocompletePayload;
        if (abortRef.current !== controller) return;
        setPopular(data.popular ?? []);
        setTrending(data.trending ?? []);
        setSuggestions(data.suggestions ?? []);
        setResults(data.results ?? []);
        setApiGrouped(data.grouped);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(t.searchError);
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [autocompleteUrl, locale, typesQuery, facetsQuery, t.searchError]
  );

  const clearAllFilters = useCallback(() => {
    abortRef.current?.abort();
    setQuery("");
    setActiveTypes(entityTypePreset ?? []);
    setActiveFacetFilters({});
    setResults([]);
    setSuggestions([]);
    setLoading(false);
    setError(null);
  }, [entityTypePreset]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeTypes.length > 0) count += 1;
    for (const values of Object.values(activeFacetFilters)) {
      count += values.length;
    }
    return count;
  }, [activeTypes, activeFacetFilters]);

  const debounceMs = ac.instantSuggestions ? ac.suggestDebounceMs : runtimeConfig.debounceMs;

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => void fetchAutocomplete(query), debounceMs);
    return () => clearTimeout(timer);
  }, [query, fetchAutocomplete, debounceMs, active]);

  const facetValueOptions = useMemo(() => {
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
  }, [results, enabledFilters, discovery?.contentTypes]);

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
  };
}

/** @deprecated Use useSearchState instead. */
export const useGlobalSearch = useSearchState;
