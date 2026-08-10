"use client";

import { useMemo } from "react";
import { Command } from "cmdk";
import { ArrowRight, Clock, History, Search, Star, TrendingUp, X } from "lucide-react";
import { getDirection } from "@/i18n/routing";
import type { PublicSearchConfig, PublicSearchFilterDef } from "@/capabilities/search/settings/public-search-config";
import type { PublicAutocompleteConfig } from "@/capabilities/search/settings/search-autocomplete-config";
import type { AutocompleteHit } from "@/capabilities/search/components/search-autocomplete.types";
import type { SearchHistoryEntry } from "@/capabilities/search/components/search-history.storage";
import type { SearchEntityType } from "@prisma/client";
import { searchCopy, type SearchLocale } from "@/capabilities/search/components/search-ui/search-copy";
import { SearchEmptyState } from "@/capabilities/search/components/search-ui/search-empty-state";
import { SearchFilterChips } from "@/capabilities/search/components/search-ui/search-filter-chips";
import { SearchResultCard } from "@/capabilities/search/components/panel/SearchResultCard";
import { SearchResultGroup } from "@/capabilities/search/components/panel/SearchResultGroup";
import { SearchFilterBar } from "@/capabilities/search/components/filters/SearchFilterBar";
import { SearchFilterSection } from "@/capabilities/search/components/filters/SearchFilterSection";
import { SearchInputShell } from "@/capabilities/search/components/search-ui/search-input-shell";
import { SearchResultSkeleton } from "@/capabilities/search/components/search-ui/search-skeleton";
import {
  COMMAND_QUICK_RESULTS_PER_TYPE,
  type SearchPanelMode,
} from "@/capabilities/search/types/search-panel-mode";

export type GlobalSearchPanelProps = {
  locale: SearchLocale;
  query: string;
  onQueryChange: (q: string) => void;
  loading: boolean;
  error?: string | null;
  runtimeConfig: PublicSearchConfig;
  ac: PublicAutocompleteConfig;
  minLen: number;
  results: AutocompleteHit[];
  suggestions: AutocompleteHit[];
  popular: string[];
  trending: string[];
  recentQueries: string[];
  historyEntries: SearchHistoryEntry[];
  filterEntityTypes: SearchEntityType[];
  activeTypes: SearchEntityType[];
  onToggleType: (type: SearchEntityType) => void;
  onClearTypes: () => void;
  entityLabel: (type: SearchEntityType) => string;
  enabledFilters: PublicSearchFilterDef[];
  facetValueOptions: Map<string, Set<string>>;
  activeFacetFilters: Record<string, string[]>;
  onToggleFacet: (filterId: string, value: string) => void;
  discoveryContentTypes?: {
    slug: string;
    label?: string;
    labelEn?: string;
    labelAr?: string;
  }[];
  showContentTypeChips: boolean;
  grouped: Map<SearchEntityType, AutocompleteHit[]>;
  onNavigate: (hit: { urlPath: string; adminPath?: string; title?: string }, searchQ?: string) => void;
  onApplyQuery: (q: string) => void;
  onClose?: () => void;
  onClearAll?: () => void;
  activeFilterCount?: number;
  inputStyle?: "glass" | "solid" | "minimal";
  listboxId?: string;
  /** command = navigation palette; discovery = full filters */
  mode?: SearchPanelMode;
  relatedTerms?: string[];
  onViewAllResults?: (query: string) => void;
  totalResultCount?: number;
};

export function GlobalSearchPanel({
  locale,
  query,
  onQueryChange,
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
  onToggleType,
  onClearTypes,
  entityLabel,
  enabledFilters,
  facetValueOptions,
  activeFacetFilters,
  onToggleFacet,
  discoveryContentTypes,
  showContentTypeChips,
  grouped,
  onNavigate,
  onApplyQuery,
  onClose,
  onClearAll,
  activeFilterCount = 0,
  inputStyle = "glass",
  listboxId = "sm-search-listbox",
  mode = "discovery",
  relatedTerms = [],
  onViewAllResults,
  totalResultCount,
}: GlobalSearchPanelProps) {
  const t = searchCopy(locale);
  const isCommand = mode === "command";
  const modalEl = runtimeConfig.modalElements;
  const showEmptyState = query.trim().length === 0;
  const showFullResults = query.length >= minLen;
  const showSuggestBlock =
    ac.showSuggestions && query.length >= ac.suggestMinLength && suggestions.length > 0;
  const hasResults = results.length > 0;
  const showViewAll =
    isCommand &&
    showFullResults &&
    hasResults &&
    onViewAllResults &&
    runtimeConfig.searchPageEnabled &&
    modalEl.showViewAllFooter;

  const maxPerType = isCommand ? modalEl.maxResultsPerType : undefined;

  const useGroupedResults =
    modalEl.showEntityGroups && (isCommand || ac.groupResults);

  const resolveContentTypeChipLabel = (contentType: NonNullable<GlobalSearchPanelProps["discoveryContentTypes"]>[number]) =>
    contentType.label ??
    contentType.labelEn ??
    contentType.labelAr ??
    contentType.slug;

  const typeChips = useMemo(
    () => [
      {
        id: "all",
        label: t.all,
        active: activeTypes.length === 0,
        onClick: onClearTypes,
      },
      ...filterEntityTypes.map((type) => ({
        id: type,
        label: entityLabel(type),
        active: activeTypes.includes(type),
        onClick: () => onToggleType(type),
      })),
    ],
    [activeTypes, entityLabel, filterEntityTypes, onClearTypes, onToggleType, t.all]
  );

  const firstNavigableHit = useMemo(() => {
    const fromResults = results.find((item) => item.urlPath?.trim());
    if (fromResults) return fromResults;
    return suggestions.find((item) => item.urlPath?.trim());
  }, [results, suggestions]);

  const commandGrouped = useMemo(() => {
    if (!isCommand) return grouped;
    const cap = maxPerType ?? COMMAND_QUICK_RESULTS_PER_TYPE;
    const capped = new Map<SearchEntityType, AutocompleteHit[]>();
    for (const [type, items] of grouped.entries()) {
      capped.set(type, items.slice(0, cap));
    }
    return capped;
  }, [grouped, isCommand, maxPerType]);

  const showFilters =
    !isCommand &&
    modalEl.showFilterBar &&
    (runtimeConfig.showEntityTypeChips !== false ||
      (showContentTypeChips && discoveryContentTypes?.length) ||
      enabledFilters.some((f) => facetValueOptions.get(f.id)?.size) ||
      activeFilterCount > 0);

  const QueryPill = ({
    value,
    icon: Icon,
    prefix,
  }: {
    value: string;
    icon: typeof Clock;
    prefix: string;
  }) => (
    <Command.Item
      value={`${prefix}:${value}`}
      onSelect={() => onApplyQuery(value)}
      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-muted/70"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/70">
        <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />
      </span>
      <span className="truncate font-medium">{value}</span>
    </Command.Item>
  );

  return (
    <Command
      className="sm-search-panel-body flex min-h-0 flex-1 flex-col"
      shouldFilter={false}
      loop
      onKeyDown={(e) => {
        if (e.key === "Escape" && onClose) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex items-start gap-2 border-b px-3 py-3 sm:px-4">
        <SearchInputShell
          style={inputStyle}
          loading={loading}
          value={query}
          locale={locale}
          onClear={() => onQueryChange("")}
          className="min-w-0 flex-1"
        >
          <Search className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
          <Command.Input
            value={query}
            onValueChange={onQueryChange}
            placeholder={runtimeConfig.placeholder || t.placeholder}
            dir={getDirection(locale)}
            aria-autocomplete="list"
            aria-expanded={hasResults || showSuggestBlock}
            aria-controls={listboxId}
            aria-busy={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
                const trimmedQuery = query.trim();
                if (!trimmedQuery) return;
                e.preventDefault();
                e.stopPropagation();
                if (runtimeConfig.enterKeyAction === "first-result") {
                  if (firstNavigableHit) onNavigate(firstNavigableHit, trimmedQuery);
                  return;
                }
                if (runtimeConfig.searchPageEnabled && onViewAllResults) {
                  onViewAllResults(trimmedQuery);
                  return;
                }
                if (firstNavigableHit) onNavigate(firstNavigableHit, trimmedQuery);
                return;
              }
              if (e.key === "Escape" && onClose) {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }
            }}
            className="flex h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </SearchInputShell>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close search"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {showFilters ? (
        <div className="space-y-2.5 border-b px-3 py-3 sm:px-4">
          {activeFilterCount > 0 && onClearAll ? (
            <SearchFilterBar locale={locale} count={activeFilterCount} onClearAll={onClearAll} />
          ) : null}
          {runtimeConfig.showEntityTypeChips !== false ? (
            <SearchFilterChips chips={typeChips} groupLabel={t.results} />
          ) : null}

          {showContentTypeChips && discoveryContentTypes?.length ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {t.contentType}
              </span>
              <SearchFilterChips
                groupLabel={t.contentType}
                chips={discoveryContentTypes.map((ct) => ({
                  id: ct.slug,
                  label: resolveContentTypeChipLabel(ct),
                  active: (activeFacetFilters.contentType ?? []).includes(ct.slug),
                  onClick: () => onToggleFacet("contentType", ct.slug),
                }))}
              />
            </div>
          ) : null}

          {enabledFilters
            .filter((f) => f.id !== "contentType")
            .map((filter) => {
              const options = [...(facetValueOptions.get(filter.id) ?? [])];
              if (!options.length) return null;
              const label = filter.label;
              return (
                <SearchFilterSection
                  key={filter.id}
                  locale={locale}
                  filterId={filter.id}
                  label={label}
                  options={options}
                  activeValues={activeFacetFilters[filter.id] ?? []}
                  onToggle={(value) => onToggleFacet(filter.id, value)}
                />
              );
            })}
        </div>
      ) : null}

      <Command.List
        id={listboxId}
        role="listbox"
        aria-label={t.results}
        data-search-scroll-area
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3"
      >
        {error ? (
          <SearchEmptyState title={t.searchError} description={error} />
        ) : null}

        {loading && query.length > 0 ? <SearchResultSkeleton rows={isCommand ? 4 : 5} /> : null}

        {showEmptyState && !loading && !error && (
          <div className={isCommand ? "space-y-1 py-1" : undefined}>
            {modalEl.showRecent && ac.showRecent && recentQueries.length > 0 ? (
              <Command.Group heading={t.recent}>
                {recentQueries.map((q) => (
                  <QueryPill key={q} value={q} icon={Clock} prefix="recent" />
                ))}
              </Command.Group>
            ) : null}
            {modalEl.showPopular && ac.showPopular && popular.length > 0 ? (
              <Command.Group heading={t.popular}>
                {popular.map((q) => (
                  <QueryPill key={q} value={q} icon={Star} prefix="popular" />
                ))}
              </Command.Group>
            ) : null}
            {modalEl.showTrending && ac.showTrending && trending.length > 0 ? (
              <Command.Group heading={t.trending}>
                {trending.map((q) => (
                  <QueryPill key={q} value={q} icon={TrendingUp} prefix="trending" />
                ))}
              </Command.Group>
            ) : null}
            {modalEl.showHistory && ac.showHistory && historyEntries.length > 0 ? (
              <Command.Group heading={t.history}>
                {historyEntries.slice(0, ac.recentLimit).map((entry) => (
                  <Command.Item
                    key={`history-${entry.at}-${entry.q}`}
                    value={`history:${entry.q}`}
                    onSelect={() => {
                      if (entry.urlPath) {
                        onNavigate({ urlPath: entry.urlPath, title: entry.title }, entry.q);
                      } else {
                        onApplyQuery(entry.q);
                      }
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-muted/70"
                  >
                    <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="flex-1 truncate font-medium">{entry.q}</span>
                    {entry.title ? (
                      <span className="max-w-[40%] truncate text-xs text-muted-foreground">
                        {entry.title}
                      </span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
            {!recentQueries.length &&
            !popular.length &&
            !trending.length &&
            !historyEntries.length ? (
              <SearchEmptyState title={t.startTitle} description={t.startSub} />
            ) : null}
          </div>
        )}

        {!showEmptyState && query.length > 0 && query.length < minLen && !loading ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">{t.typeMin(minLen)}</p>
        ) : null}

        {!loading && showSuggestBlock ? (
          <Command.Group heading={t.suggestions}>
            {suggestions.map((s, i) => (
              <Command.Item
                key={s.id ?? `s-${s.urlPath}`}
                value={`suggest:${s.title}`}
                onSelect={() => onNavigate(s, query)}
                className="p-0 aria-selected:bg-transparent"
              >
                <SearchResultCard
                  as="div"
                  title={s.title}
                  meta={entityLabel(s.entityType)}
                  entityType={s.entityType}
                  showPreview={false}
                  index={i}
                  className="w-full"
                />
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}

        {isCommand && relatedTerms.length > 0 && showFullResults && !loading ? (
          <Command.Group heading={t.relatedSearches}>
            <div className="flex flex-wrap gap-1.5 px-2 py-1">
              {relatedTerms.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => onApplyQuery(term)}
                  className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium hover:bg-muted"
                >
                  {term}
                </button>
              ))}
            </div>
          </Command.Group>
        ) : null}

        {showFullResults && results.length === 0 && !loading && !error ? (
          <SearchEmptyState
            title={t.emptyTitle}
            description={`No results for "${query.trim()}". ${isCommand ? t.emptySub : t.tryRemovingFilters}`}
            actionLabel={!isCommand && activeFilterCount > 0 ? t.clearAllFilters : undefined}
            onAction={!isCommand && activeFilterCount > 0 ? onClearAll : undefined}
          />
        ) : null}

        {showFullResults && !loading && !useGroupedResults && !isCommand && !ac.groupResults ? (
          <Command.Group heading={t.results}>
            {results.map((r, i) => (
              <Command.Item
                key={r.id ?? r.urlPath}
                value={`result:${r.id ?? r.urlPath}`}
                onSelect={() => onNavigate(r, query)}
                className="p-0 aria-selected:bg-transparent"
              >
                <SearchResultCard
                  as="div"
                  title={r.title}
                  meta={entityLabel(r.entityType)}
                  snippet={r.snippet}
                  query={query}
                  showPreview={modalEl.showResultSnippets && ac.showResultPreviews}
                  entityType={r.entityType}
                  index={i}
                  className="w-full"
                />
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}

        {showFullResults && !loading && useGroupedResults
          ? Array.from(commandGrouped.entries()).map(([type, items]) => (
              <SearchResultGroup
                key={type}
                locale={locale}
                entityType={type}
                label={entityLabel(type)}
                items={items}
                query={query}
                showPreview={
                  modalEl.showResultSnippets && (!isCommand ? ac.showResultPreviews : true)
                }
                onNavigate={onNavigate}
                maxItems={maxPerType}
              />
            ))
          : null}

        {showFullResults && !loading && !useGroupedResults && (isCommand || ac.groupResults) ? (
          <Command.Group heading={t.results}>
            {results.map((r, i) => (
              <Command.Item
                key={r.id ?? r.urlPath}
                value={`result:${r.id ?? r.urlPath}`}
                onSelect={() => onNavigate(r, query)}
                className="p-0 aria-selected:bg-transparent"
              >
                <SearchResultCard
                  as="div"
                  title={r.title}
                  meta={entityLabel(r.entityType)}
                  snippet={r.snippet}
                  query={query}
                  showPreview={modalEl.showResultSnippets && (isCommand || ac.showResultPreviews)}
                  entityType={r.entityType}
                  index={i}
                  className="w-full"
                />
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
      </Command.List>

      {showViewAll ? (
        <button
          type="button"
          onClick={() => onViewAllResults(query.trim())}
          className="flex w-full items-center justify-center gap-2 border-t px-4 py-3 text-sm font-medium text-primary hover:bg-muted/40"
        >
          {t.viewAllResults(totalResultCount ?? results.length)}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      {modalEl.showKeyboardHints && ac.keyboardNavigation ? (
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2.5 text-[0.68rem] text-muted-foreground"
          aria-hidden
        >
          <span>{t.navigate}</span>
          <span>{t.open}</span>
          <span>{t.close}</span>
        </div>
      ) : null}
    </Command>
  );
}
