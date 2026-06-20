"use client";

import "@/features/search/components/search-ui/search-ui.css";
import "@/features/search/components/search-ui/search-theme.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { PublicSearchConfig } from "@/features/search/settings/public-search-config";
import type { SearchEntityType } from "@prisma/client";
import type { FacetAggregation } from "@/features/search-framework/filter/search-facet-engine";
import { searchCopy, type SearchLocale } from "@/features/search/components/search-ui/search-copy";
import { SearchEmptyState } from "@/features/search/components/search-ui/search-empty-state";
import { SearchInputShell } from "@/features/search/components/search-ui/search-input-shell";
import { SearchPageSkeleton } from "@/features/search/components/search-ui/search-skeleton";
import { SearchThemeRoot } from "@/features/search/components/search-ui/search-theme-root";
import { trackSearchAnalytics } from "@/features/search/analytics/search-analytics.client";
import { useGlobalSearch } from "@/features/search/hooks/use-global-search";
import { useSearchUrlState } from "@/features/search/hooks/use-search-url-state";
import { SearchFilterSidebar } from "@/features/search/components/discovery/search-filter-sidebar";
import { SearchFilterDrawer } from "@/features/search/components/discovery/search-filter-drawer";
import { SearchSectionHeader } from "@/features/search/components/discovery/search-section-header";
import {
  SearchResultCardRouter,
  type SearchResultHit,
} from "@/features/search/components/discovery/search-result-card-router";
import { SearchDiscoveryHub } from "@/features/search/components/discovery/search-discovery-hub";
import { SearchPreviewPanel } from "@/features/search/components/discovery/search-preview-panel";
import { CatalogContentLayout } from "@/features/catalog/components/catalog-content-layout";
import { getDirection } from "@/i18n/routing";
import {
  getSavedSearches,
  saveSearchQuery,
  type SavedSearchEntry,
} from "@/features/search/lib/saved-searches";
import { applyRecentlyViewedBoost } from "@/features/search/lib/search-personalization";
import {
  resolveSearchPageCopy,
  searchPageLayoutClassNames,
  searchPageLayoutCssVars,
  searchPageShowDesktopSidebar,
  searchPageShowFilterDrawer,
} from "@/features/search/lib/search-page-layout";

type SearchHit = SearchResultHit;

type SearchSection = {
  entityType: SearchEntityType;
  label: string;
  count: number;
};

type PaginationMeta = {
  offset: number;
  limit: number;
  hasMore: boolean;
  total: number;
};

type Props = {
  config: PublicSearchConfig;
};

export function SearchPageView({ config }: Props) {
  const locale = useLocale() as SearchLocale;
  const dir = getDirection(locale);
  const t = searchCopy(locale);
  const { state: urlState, writeUrl } = useSearchUrlState();

  const discoverySearch = useGlobalSearch({
    apiBase: "/api/search",
    discoveryUrl: "/api/search/discovery",
    locale,
    config,
    active: true,
    panelMode: "discovery",
    initialQuery: urlState.q,
  });

  const [query, setQuery] = useState(urlState.q);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [sections, setSections] = useState<SearchSection[]>([]);
  const [relatedTerms, setRelatedTerms] = useState<string[]>([]);
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);
  const [facetAggregations, setFacetAggregations] = useState<FacetAggregation[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [previewHit, setPreviewHit] = useState<SearchHit | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearchEntry[]>([]);
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSavedSearches(getSavedSearches(locale));
  }, [locale]);

  useEffect(() => {
    setQuery(urlState.q);
    discoverySearch.setActiveTypes(urlState.types);
    discoverySearch.setActiveFacetFilters(urlState.facets);
  }, [urlState.q, urlState.types, urlState.facets]);

  const syncUrl = useCallback(
    (q: string) => {
      writeUrl({
        q,
        types: discoverySearch.activeTypes,
        facets: discoverySearch.activeFacetFilters,
      });
    },
    [writeUrl, discoverySearch.activeTypes, discoverySearch.activeFacetFilters]
  );

  const facetsQuery = useMemo(() => {
    const keys = Object.keys(discoverySearch.activeFacetFilters);
    if (!keys.length) return "";
    const payload: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(discoverySearch.activeFacetFilters)) {
      if (v.length) payload[k] = v;
    }
    if (!Object.keys(payload).length) return "";
    return `&facets=${encodeURIComponent(JSON.stringify(payload))}`;
  }, [discoverySearch.activeFacetFilters]);

  const typesQuery = useMemo(
    () =>
      discoverySearch.activeTypes.length
        ? `&types=${discoverySearch.activeTypes.join(",")}`
        : "",
    [discoverySearch.activeTypes]
  );

  const fetchFacets = useCallback(
    async (q: string) => {
      try {
        const res = await fetch(
          `/api/search/facets?q=${encodeURIComponent(q)}&locale=${locale}${typesQuery}${facetsQuery}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setFacetAggregations(data.facets ?? []);
      } catch {
        /* ignore */
      }
    },
    [locale, typesQuery, facetsQuery]
  );

  const fetchPage = useCallback(
    async (q: string, offset: number, append: boolean) => {
      if (q.length < config.minQueryLength) {
        setResults([]);
        setPagination(null);
        setSections([]);
        setRelatedTerms([]);
        return;
      }
      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&locale=${locale}&limit=${config.resultsPerPage}&offset=${offset}${typesQuery}${facetsQuery}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (fetchAbortRef.current !== controller) return;
        const rawHits = (data.results ?? []) as SearchHit[];
        const hits = applyRecentlyViewedBoost(rawHits, locale);
        const page = data.pagination as PaginationMeta | undefined;
        setSections(data.sections ?? []);
        setRelatedTerms(data.relatedTerms ?? []);
        setExpandedQuery(data.expandedQuery ?? null);
        if (append) {
          setResults((prev) => [...prev, ...hits]);
        } else {
          setResults(hits);
          setPreviewHit(null);
        }
        setPagination(
          page ?? {
            offset,
            limit: config.resultsPerPage,
            hasMore: hits.length >= config.resultsPerPage,
            total: append ? results.length + hits.length : hits.length,
          }
        );
        void fetchFacets(q);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      } finally {
        if (fetchAbortRef.current === controller) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [
      config.minQueryLength,
      config.resultsPerPage,
      locale,
      typesQuery,
      facetsQuery,
      fetchFacets,
      results.length,
    ]
  );

  const runSearch = useCallback(
    (q: string, sync = true) => {
      if (sync) syncUrl(q);
      void fetchPage(q, 0, false);
    },
    [fetchPage, syncUrl]
  );

  useEffect(() => {
    if (urlState.q.length >= config.minQueryLength) {
      void fetchPage(urlState.q, 0, false);
    }
  }, [urlState.q, urlState.types, urlState.facets, config.minQueryLength, fetchPage]);

  useEffect(() => {
    if (!config.instantSearch) return;
    if (query.length < config.minQueryLength) {
      if (query.length === 0) {
        setResults([]);
        setPagination(null);
        setSections([]);
      }
      return;
    }
    const timer = setTimeout(() => runSearch(query), config.debounceMs);
    return () => clearTimeout(timer);
  }, [query, config.instantSearch, config.debounceMs, config.minQueryLength, runSearch]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const loadMore = () => {
    if (!pagination?.hasMore || loadingMore) return;
    void fetchPage(query, results.length, true);
  };

  const pageLayout = config.page;

  const grouped = useMemo(() => {
    const map = new Map<SearchEntityType, SearchHit[]>();
    for (const r of results) {
      const list = map.get(r.entityType) ?? [];
      list.push(r);
      map.set(r.entityType, list);
    }
    return map;
  }, [results]);

  const groupedEntries = useMemo(() => {
    const orderedTypes = [...pageLayout.resultTypeOrder];
    for (const type of grouped.keys()) {
      if (!orderedTypes.includes(type)) orderedTypes.push(type);
    }
    return orderedTypes
      .filter((type) => pageLayout.resultTypes[type]?.enabled !== false)
      .map((type) => [type, grouped.get(type)] as const)
      .filter((entry): entry is readonly [SearchEntityType, SearchHit[]] => Boolean(entry[1]?.length));
  }, [grouped, pageLayout.resultTypeOrder, pageLayout.resultTypes]);

  const visibleSections = useMemo(() => {
    const sectionByType = new Map(sections.map((section) => [section.entityType, section]));
    return groupedEntries
      .map(([type, items]) => sectionByType.get(type) ?? {
        entityType: type,
        label: discoverySearch.entityLabel(type),
        count: items.length,
      })
      .filter((section) => pageLayout.resultTypes[section.entityType]?.enabled !== false);
  }, [sections, groupedEntries, discoverySearch, pageLayout.resultTypes]);

  const showResults = query.length >= config.minQueryLength;
  const showHint = query.length > 0 && query.length < config.minQueryLength;

  const handleToggleType = useCallback(
    (type: SearchEntityType) => {
      const next = discoverySearch.activeTypes.includes(type)
        ? discoverySearch.activeTypes.filter((t) => t !== type)
        : [...discoverySearch.activeTypes, type];
      discoverySearch.setActiveTypes(next);
      writeUrl({ q: query, types: next, facets: discoverySearch.activeFacetFilters }, true);
    },
    [discoverySearch, query, writeUrl]
  );

  const handleToggleFacet = useCallback(
    (filterId: string, value: string) => {
      discoverySearch.toggleFacetValue(filterId, value);
      const cur = discoverySearch.activeFacetFilters[filterId] ?? [];
      const nextValues = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
      const nextFacets = { ...discoverySearch.activeFacetFilters };
      if (!nextValues.length) delete nextFacets[filterId];
      else nextFacets[filterId] = nextValues;
      writeUrl({ q: query, types: discoverySearch.activeTypes, facets: nextFacets }, true);
    },
    [discoverySearch, query, writeUrl]
  );

  const handleClearTypes = useCallback(() => {
    discoverySearch.setActiveTypes([]);
    writeUrl({ q: query, types: [], facets: discoverySearch.activeFacetFilters }, true);
  }, [discoverySearch, query, writeUrl]);

  const sidebarProps = {
    filterEntityTypes: discoverySearch.filterEntityTypes,
    activeTypes: discoverySearch.activeTypes,
    onToggleType: handleToggleType,
    onClearTypes: handleClearTypes,
    entityLabel: discoverySearch.entityLabel,
    enabledFilters: discoverySearch.enabledFilters,
    facetAggregations,
    activeFacetFilters: discoverySearch.activeFacetFilters,
    onToggleFacet: handleToggleFacet,
    onClearAll: () => {
      discoverySearch.clearAllFilters();
      setQuery("");
      setResults([]);
      writeUrl({ q: "", types: [], facets: {} }, true);
    },
    activeFilterCount: discoverySearch.activeFilterCount,
  };

  const handleSaveSearch = () => {
    if (!query.trim()) return;
    saveSearchQuery(locale, query.trim(), {
      types: discoverySearch.activeTypes,
      facets: discoverySearch.activeFacetFilters,
    });
    setSavedSearches(getSavedSearches(locale));
  };

  const pageCopy = resolveSearchPageCopy(pageLayout, locale, {
    title: t.pageTitle,
    subtitle: t.pageSub,
  });
  const pageLayoutClasses = searchPageLayoutClassNames(pageLayout);
  const pageLayoutVars = searchPageLayoutCssVars(pageLayout);
  const showDesktopSidebar = searchPageShowDesktopSidebar(pageLayout);
  const showFilterDrawer = searchPageShowFilterDrawer();

  return (
    <SearchThemeRoot
      inheritGlobalTheme={config.inheritGlobalTheme}
      inputStyle={config.inputStyle}
      panelWidth={config.panelWidth}
      modalStyle={config.modal}
      className={cn("relative min-h-[60vh] sm-search-page", pageLayoutClasses)}
      style={pageLayoutVars}
      dir={dir}
    >
      {pageLayout.heroStyle !== "none" ? (
        <div
          className={cn("sm-search-page-hero", pageLayout.bannerImage && pageLayout.heroStyle === "banner" && "sm-search-page-hero--banner")}
          style={
            pageLayout.bannerImage && pageLayout.heroStyle === "banner"
              ? { backgroundImage: `url(${pageLayout.bannerImage})` }
              : undefined
          }
          aria-hidden
        />
      ) : null}

      <div
        className="relative z-10 mx-auto px-4 py-10 sm:px-6 sm:py-14 sm-search-page__inner"
        style={{ maxWidth: "var(--sm-search-page-max-width, 72rem)" }}
      >
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {pageLayout.heroShowIcon ? (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"
                aria-hidden
              >
                <Search className="h-5 w-5" strokeWidth={2} />
              </div>
            ) : null}
            <div>
              <h1 className="sm-search-title text-2xl font-bold tracking-tight sm:text-3xl">
                {pageCopy.title}
              </h1>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {pageCopy.subtitle}
              </p>
            </div>
          </div>
          {showFilterDrawer ? (
            <SearchFilterDrawer locale={locale} {...sidebarProps} />
          ) : null}
        </header>

        <form
          onSubmit={onSubmit}
          className={cn(
            "mb-6 space-y-2",
            pageLayout.stickySearchBar &&
              "sticky top-16 z-20 bg-background/80 py-2 backdrop-blur-sm",
          )}
          role="search"
        >
          <SearchInputShell
            style={config.inputStyle}
            loading={loading}
            value={query}
            onClear={() => {
              setQuery("");
              writeUrl({ q: "", types: [], facets: {} }, true);
            }}
          >
            <Search className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={config.placeholder}
              aria-label={t.search}
              autoComplete="off"
              className="flex h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
            />
          </SearchInputShell>
          <div className="flex flex-wrap items-center gap-2">
            {!config.instantSearch ? (
              <p className="text-xs text-muted-foreground">{t.pressEnter}</p>
            ) : null}
            {query.trim() && pageLayout.showSaveSearch ? (
              <button
                type="button"
                onClick={handleSaveSearch}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t.saveSearch}
              </button>
            ) : null}
          </div>
        </form>

        {expandedQuery && expandedQuery !== query.trim() ? (
          <p className="mb-4 text-xs text-muted-foreground">
            Also searching for:{" "}
            <span className="font-medium text-foreground">{expandedQuery}</span>
          </p>
        ) : null}

        {showHint ? (
          <p className="text-sm text-muted-foreground" role="status">
            {t.typeMin(config.minQueryLength)}
          </p>
        ) : null}

        {!showHint && !showResults && !loading && pageLayout.showDiscoveryHub ? (
          <SearchDiscoveryHub
            locale={locale}
            className="mt-6"
            onApplyQuery={(q) => {
              setQuery(q);
              runSearch(q);
            }}
          />
        ) : null}

        {savedSearches.length > 0 && !showResults ? (
          <div className="mt-8">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.savedSearches}
            </h2>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((s) => (
                <button
                  key={s.at}
                  type="button"
                  onClick={() => {
                    setQuery(s.q);
                    if (s.types?.length) discoverySearch.setActiveTypes(s.types as SearchEntityType[]);
                    if (s.facets) discoverySearch.setActiveFacetFilters(s.facets);
                    writeUrl({
                      q: s.q,
                      types: (s.types as SearchEntityType[]) ?? [],
                      facets: s.facets ?? {},
                    });
                    void fetchPage(s.q, 0, false);
                  }}
                  className="rounded-full border px-3 py-1 text-sm hover:bg-muted/50"
                >
                  {s.q}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <CatalogContentLayout
          dir={dir}
          className="mt-6 flex flex-col gap-8 lg:flex-row catalog-content-layout catalog-content-layout--search"
          mainClassName="min-w-0 flex-1 catalog-content-layout__main"
          contentClassName="min-w-0 catalog-content-layout__content"
          sidebar={
            showDesktopSidebar ? (
              <SearchFilterSidebar locale={locale} {...sidebarProps} className="hidden lg:block" />
            ) : null
          }
        >
            {loading && showResults && !results.length ? <SearchPageSkeleton /> : null}

            {!loading && showResults && groupedEntries.length === 0 ? (
              <SearchEmptyState
                title={t.emptyTitle}
                description={t.tryRemovingFilters}
                actionLabel={
                  discoverySearch.activeFilterCount > 0 ? t.clearAllFilters : undefined
                }
                onAction={sidebarProps.onClearAll}
              />
            ) : null}

            {!loading && showResults && groupedEntries.length > 0 ? (
              <div className="space-y-6">
                {pageLayout.showEntityPills && visibleSections.length ? (
                  <div className="flex flex-wrap gap-2">
                    {visibleSections.map((s) => (
                      <span
                        key={s.entityType}
                        className="rounded-full bg-muted/50 px-3 py-1 text-xs font-medium"
                      >
                        {s.label} ({s.count})
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1 space-y-8 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2">
                    {groupedEntries.map(([type, items]) => (
                      <section key={type}>
                        {pageLayout.showSectionHeaders ? (
                          <SearchSectionHeader
                            label={discoverySearch.entityLabel(type)}
                            count={
                              visibleSections.find((s) => s.entityType === type)?.count ?? items.length
                            }
                          />
                        ) : null}
                        <ul className="space-y-2" role="list">
                          {items.map((r) => (
                            <li
                              key={r.id}
                              onMouseEnter={() => pageLayout.previewPane && setPreviewHit(r)}
                              onFocus={() => pageLayout.previewPane && setPreviewHit(r)}
                            >
                              <Link
                                href={r.urlPath}
                                onClick={() =>
                                  trackSearchAnalytics({
                                    type: "conversion",
                                    locale,
                                    q: query,
                                    entityType: r.entityType,
                                    entityId: r.entityId ?? r.id,
                                    title: r.title,
                                    urlPath: r.urlPath,
                                  })
                                }
                                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <SearchResultCardRouter
                                  hit={r}
                                  query={query}
                                  entityLabel={discoverySearch.entityLabel(type)}
                                  selected={previewHit?.id === r.id}
                                  cardStyle={pageLayout.resultCardStyle}
                                  cardFields={pageLayout.resultCardFields}
                                  className="pointer-events-none"
                                />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}

                    {pagination?.hasMore ? (
                      <div className="flex justify-center pt-2">
                        <Button type="button" variant="outline" onClick={loadMore} disabled={loadingMore}>
                          {loadingMore ? t.loadingMore : t.loadMore}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {pageLayout.previewPane ? (
                    <SearchPreviewPanel
                      locale={locale}
                      hit={previewHit}
                      entityLabel={
                        previewHit ? discoverySearch.entityLabel(previewHit.entityType) : undefined
                      }
                      cardStyle={pageLayout.resultCardStyle}
                      cardFields={pageLayout.resultCardFields}
                    />
                  ) : null}
                </div>

                {pageLayout.showRelatedTerms && relatedTerms.length ? (
                  <section>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.relatedSearches}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {relatedTerms.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            setQuery(term);
                            runSearch(term);
                          }}
                          className="rounded-full border px-3 py-1 text-sm hover:bg-muted/50"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}
        </CatalogContentLayout>
      </div>
    </SearchThemeRoot>
  );
}
