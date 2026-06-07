"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useRouter as useNextRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ENTITY_LABELS } from "@/features/search/constants";
import type {
  PublicSearchConfig,
  PublicSearchFilterDef,
} from "@/features/search/settings/public-search-config";
import {
  resolvePublicAutocompleteConfig,
  type PublicAutocompleteConfig,
} from "@/features/search/settings/search-autocomplete-config";
import type { AutocompleteHit, AutocompletePayload } from "@/features/search/components/search-autocomplete.types";
import type { SearchDiscoveryPayload } from "@/features/search/components/search-autocomplete.types";
import {
  getRecentSearches,
  getSearchHistory,
  pushSearchHistory,
  type SearchHistoryEntry,
} from "@/features/search/components/search-history.storage";
import type { SearchEntityType } from "@prisma/client";
import { GlobalSearchPanel } from "@/features/search/components/global-search-panel";
import { SearchChrome } from "@/features/search/components/search-ui/search-chrome";
import { SearchTriggerButton } from "@/features/search/components/search-ui/search-trigger-button";
import { searchCopy, type SearchLocale } from "@/features/search/components/search-ui/search-copy";
import { trackSearchAnalytics } from "@/features/search/analytics/search-analytics.client";
import { consumeSearchOpenPending } from "@/features/search/components/search-open-bridge";

function GlobalSearchModal({
  apiBase,
  discoveryUrl,
  locale,
  config,
  adminMode,
  triggerClassName,
  showTrigger = true,
  onNavigate,
  inputStyle,
  panelWidth,
  inheritGlobalTheme,
}: {
  apiBase: string;
  discoveryUrl: string;
  locale: SearchLocale;
  config: PublicSearchConfig;
  adminMode?: boolean;
  triggerClassName?: string;
  /** False when header already provides a search button (DeferredSearchCommand). */
  showTrigger?: boolean;
  onNavigate: (path: string) => void;
  inputStyle?: PublicSearchConfig["inputStyle"];
  panelWidth?: PublicSearchConfig["panelWidth"];
  inheritGlobalTheme?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AutocompleteHit[]>([]);
  const [suggestions, setSuggestions] = useState<AutocompleteHit[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [apiGrouped, setApiGrouped] = useState<Record<string, AutocompleteHit[]> | undefined>();
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [historyEntries, setHistoryEntries] = useState<SearchHistoryEntry[]>([]);
  const [activeTypes, setActiveTypes] = useState<SearchEntityType[]>([]);
  const [activeFacetFilters, setActiveFacetFilters] = useState<Record<string, string[]>>({});
  const [discovery, setDiscovery] = useState<SearchDiscoveryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const t = searchCopy(locale);
  const runtimeConfig = discovery?.config ?? config;
  const resolvedInputStyle = inputStyle ?? runtimeConfig.inputStyle ?? "glass";
  const resolvedPanelWidth = panelWidth ?? runtimeConfig.panelWidth ?? "lg";
  const resolvedThemeInherit = inheritGlobalTheme ?? runtimeConfig.inheritGlobalTheme ?? true;
  const resolvedModal = runtimeConfig.modal;
  const ac: PublicAutocompleteConfig =
    discovery?.config?.autocomplete ??
    discovery?.autocomplete ??
    resolvePublicAutocompleteConfig(config.autocomplete as never);
  const minLen = runtimeConfig.minQueryLength;
  const autocompleteUrl = `${apiBase}/autocomplete`;

  useEffect(() => {
    fetch(discoveryUrl)
      .then((r) => r.json())
      .then((data: SearchDiscoveryPayload) => setDiscovery(data))
      .catch(() => setDiscovery(null));
  }, [discoveryUrl]);

  const refreshLocalHistory = useCallback(() => {
    setRecentQueries(getRecentSearches(locale, ac.recentLimit));
    setHistoryEntries(getSearchHistory(locale, ac.historyLimit));
  }, [locale, ac.recentLimit, ac.historyLimit]);

  useEffect(() => {
    if (!open) return;
    refreshLocalHistory();
  }, [open, refreshLocalHistory]);

  const filterEntityTypes = useMemo(() => {
    if (discovery?.entityTypes?.length) return discovery.entityTypes;
    const types = Object.keys(ENTITY_LABELS) as SearchEntityType[];
    return types.filter((type) => adminMode || type !== "MEDIA");
  }, [discovery, adminMode]);

  const openSearchModal = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setOpen(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (consumeSearchOpenPending()) {
      openSearchModal();
    }
  }, [openSearchModal]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setOpen((o) => !o);
      }
    };
    const openSearch = () => openSearchModal();
    document.addEventListener("keydown", down);
    document.addEventListener("sm:open-search", openSearch);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("sm:open-search", openSearch);
    };
  }, [openSearchModal]);

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
      setLoading(true);
      try {
        const res = await fetch(
          `${autocompleteUrl}?q=${encodeURIComponent(q)}&locale=${locale}${typesQuery}${facetsQuery}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as AutocompletePayload;
        setPopular(data.popular ?? []);
        setTrending(data.trending ?? []);
        setSuggestions(data.suggestions ?? []);
        setResults(data.results ?? []);
        setApiGrouped(data.grouped);
      } finally {
        setLoading(false);
      }
    },
    [autocompleteUrl, locale, typesQuery, facetsQuery]
  );

  const debounceMs = ac.instantSuggestions ? ac.suggestDebounceMs : runtimeConfig.debounceMs;

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void fetchAutocomplete(query), debounceMs);
    return () => clearTimeout(timer);
  }, [query, fetchAutocomplete, debounceMs, open]);

  const facetValueOptions = useMemo(() => {
    const map = new Map<string, Set<string>>();
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
  }, [results, enabledFilters]);

  const toggleFacetValue = (filterId: string, value: string) => {
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
  };

  const showContentTypeChips =
    runtimeConfig.filters?.some((f) => f.id === "contentType") ?? true;

  const navigate = (
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
    const path = adminMode ? hit.adminPath ?? hit.urlPath : hit.urlPath;
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
    onNavigate(path);
    setOpen(false);
    setQuery("");
  };

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
  const entityLabel = (type: SearchEntityType) => entityLabels[type]?.[locale] ?? type;

  if (!adminMode && discovery && (!runtimeConfig.enabled || !runtimeConfig.globalSearchEnabled)) {
    return null;
  }

  return (
    <>
      {showTrigger ? (
        <SearchTriggerButton
          label={t.search}
          onClick={() => openSearchModal()}
          className={triggerClassName}
        />
      ) : null}
      <SearchChrome
        open={open}
        onOpenChange={setOpen}
        title={t.search}
        panelWidth={resolvedPanelWidth}
        inputStyle={resolvedInputStyle}
        inheritGlobalTheme={resolvedThemeInherit}
        modalStyle={resolvedModal}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-0 sm:pt-0">
        <GlobalSearchPanel
          locale={locale}
          query={query}
          onQueryChange={setQuery}
          onClose={closeSearchModal}
          loading={loading}
          runtimeConfig={runtimeConfig}
          ac={ac}
          minLen={minLen}
          results={results}
          suggestions={suggestions}
          popular={popular}
          trending={trending}
          recentQueries={recentQueries}
          historyEntries={historyEntries}
          filterEntityTypes={filterEntityTypes}
          activeTypes={activeTypes}
          onToggleType={(type) =>
            setActiveTypes((prev) =>
              prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
            )
          }
          onClearTypes={() => setActiveTypes([])}
          entityLabel={entityLabel}
          enabledFilters={enabledFilters}
          facetValueOptions={facetValueOptions}
          activeFacetFilters={activeFacetFilters}
          onToggleFacet={toggleFacetValue}
          discoveryContentTypes={discovery?.contentTypes}
          showContentTypeChips={showContentTypeChips}
          grouped={grouped}
          onNavigate={navigate}
          onApplyQuery={setQuery}
          inputStyle={resolvedInputStyle}
        />
        </div>
      </SearchChrome>
    </>
  );
}

function usePublicSearchNavigation(locale: SearchLocale) {
  const router = useRouter();
  return useCallback(
    (path: string) => {
      const localized = path.replace(`/${locale}`, "") || "/";
      router.push(localized);
    },
    [locale, router]
  );
}

const DEFAULT_PUBLIC_CONFIG: PublicSearchConfig = {
  enabled: true,
  globalSearchEnabled: true,
  searchPageEnabled: false,
  searchPagePath: "/search",
  resultsPerPage: 20,
  instantSearch: true,
  debounceMs: 280,
  minQueryLength: 2,
  maxResults: 20,
  mode: "hybrid",
  placeholder: "Search catalog, blog, pages…",
  inheritGlobalTheme: true,
  inputStyle: "glass",
  panelWidth: "lg",
  modal: {
    panelStyle: "solid",
    overlayOpacity: 78,
    overlayBlurPx: 16,
    panelOpacity: 98,
    panelBlurPx: 0,
  },
  filters: [],
  showEntityTypeChips: true,
  autocomplete: resolvePublicAutocompleteConfig({}),
};

/** Public storefront search — modal only; header supplies the trigger. */
export function SearchModalHost() {
  const locale = useLocale() as SearchLocale;
  const onNavigate = usePublicSearchNavigation(locale);
  return (
    <GlobalSearchModal
      apiBase="/api/search"
      discoveryUrl="/api/search/discovery"
      locale={locale}
      config={DEFAULT_PUBLIC_CONFIG}
      showTrigger={false}
      onNavigate={onNavigate}
    />
  );
}

/** @deprecated Prefer SearchModalHost for deferred/headerless mounts. */
export function SearchCommand() {
  return <SearchModalHost />;
}

export function AdminSearchCommand() {
  const router = useNextRouter();
  const onNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );
  return (
    <GlobalSearchModal
      apiBase="/api/admin/search"
      discoveryUrl="/api/admin/search/discovery"
      locale="en"
      config={{ ...DEFAULT_PUBLIC_CONFIG, enabled: true, globalSearchEnabled: true }}
      adminMode
      triggerClassName={cn("w-full justify-start rounded-lg")}
      onNavigate={onNavigate}
      inputStyle="solid"
      panelWidth="xl"
      inheritGlobalTheme={true}
    />
  );
}
