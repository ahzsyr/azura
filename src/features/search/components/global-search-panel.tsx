"use client";

import { useMemo } from "react";
import { Command } from "cmdk";
import { Clock, History, Search, Star, TrendingUp, X } from "lucide-react";
import { getDirection } from "@/i18n/routing";
import type { PublicSearchConfig, PublicSearchFilterDef } from "@/features/search/settings/public-search-config";
import type { PublicAutocompleteConfig } from "@/features/search/settings/search-autocomplete-config";
import type { AutocompleteHit } from "@/features/search/components/search-autocomplete.types";
import type { SearchHistoryEntry } from "@/features/search/components/search-history.storage";
import type { SearchEntityType } from "@prisma/client";
import { searchCopy, type SearchLocale } from "@/features/search/components/search-ui/search-copy";
import { SearchEmptyState } from "@/features/search/components/search-ui/search-empty-state";
import { SearchFilterChips } from "@/features/search/components/search-ui/search-filter-chips";
import { SearchHitRow } from "@/features/search/components/search-ui/search-hit-row";
import { SearchInputShell } from "@/features/search/components/search-ui/search-input-shell";
import { SearchResultSkeleton } from "@/features/search/components/search-ui/search-skeleton";

export type GlobalSearchPanelProps = {
  locale: SearchLocale;
  query: string;
  onQueryChange: (q: string) => void;
  loading: boolean;
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
  discoveryContentTypes?: { slug: string; labelEn: string; labelAr: string }[];
  showContentTypeChips: boolean;
  grouped: Map<SearchEntityType, AutocompleteHit[]>;
  onNavigate: (hit: { urlPath: string; adminPath?: string; title?: string }, searchQ?: string) => void;
  onApplyQuery: (q: string) => void;
  onClose?: () => void;
  inputStyle?: "glass" | "solid" | "minimal";
  listboxId?: string;
};

export function GlobalSearchPanel({
  locale,
  query,
  onQueryChange,
  loading,
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
  inputStyle = "glass",
  listboxId = "sm-search-listbox",
}: GlobalSearchPanelProps) {
  const t = searchCopy(locale);
  const showEmptyState = query.trim().length === 0;
  const showFullResults = query.length >= minLen;
  const showSuggestBlock =
    ac.showSuggestions && query.length >= ac.suggestMinLength && suggestions.length > 0;

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
      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-muted/70"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/70">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
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
            aria-expanded
            aria-controls={listboxId}
            aria-busy={loading}
            onKeyDown={(e) => {
              if (e.key === "Escape" && onClose) {
                e.preventDefault();
                e.stopPropagation();
                onClose();
                return;
              }
              if (e.key === "Enter" && query.length >= minLen && results[0]) {
                e.preventDefault();
                onNavigate(results[0], query);
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
            aria-label={locale === "ar" ? "إغلاق البحث" : "Close search"}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {(runtimeConfig.showEntityTypeChips !== false ||
        (showContentTypeChips && discoveryContentTypes?.length) ||
        enabledFilters.some((f) => facetValueOptions.get(f.id)?.size)) && (
        <div className="space-y-2.5 border-b px-3 py-3 sm:px-4">
          {runtimeConfig.showEntityTypeChips !== false ? (
            <SearchFilterChips chips={typeChips} />
          ) : null}

          {showContentTypeChips && discoveryContentTypes?.length ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {locale === "ar" ? "النوع" : "Type"}
              </span>
              <SearchFilterChips
                chips={discoveryContentTypes.map((ct) => ({
                  id: ct.slug,
                  label: locale === "ar" ? ct.labelAr : ct.labelEn,
                  active: (activeFacetFilters.contentType ?? []).includes(ct.slug),
                  onClick: () => onToggleFacet("contentType", ct.slug),
                }))}
              />
            </div>
          ) : null}

          {enabledFilters
            .filter((f) => f.id !== "contentType")
            .map((filter) => {
              const options = facetValueOptions.get(filter.id);
              if (!options?.size) return null;
              const label = locale === "ar" && filter.labelAr ? filter.labelAr : filter.labelEn;
              return (
                <div key={filter.id} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  <SearchFilterChips
                    chips={[...options].slice(0, 12).map((value) => ({
                      id: `${filter.id}-${value}`,
                      label: value,
                      active: (activeFacetFilters[filter.id] ?? []).includes(value),
                      onClick: () => onToggleFacet(filter.id, value),
                    }))}
                  />
                </div>
              );
            })}
        </div>
      )}

      <Command.List
        id={listboxId}
        role="listbox"
        aria-label={t.results}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3"
      >
        {loading && query.length > 0 ? <SearchResultSkeleton rows={5} /> : null}

        {showEmptyState && !loading && (
          <>
            {ac.showRecent && recentQueries.length > 0 ? (
              <Command.Group heading={t.recent}>
                {recentQueries.map((q) => (
                  <QueryPill key={q} value={q} icon={Clock} prefix="recent" />
                ))}
              </Command.Group>
            ) : null}
            {ac.showPopular && popular.length > 0 ? (
              <Command.Group heading={t.popular}>
                {popular.map((q) => (
                  <QueryPill key={q} value={q} icon={Star} prefix="popular" />
                ))}
              </Command.Group>
            ) : null}
            {ac.showTrending && trending.length > 0 ? (
              <Command.Group heading={t.trending}>
                {trending.map((q) => (
                  <QueryPill key={q} value={q} icon={TrendingUp} prefix="trending" />
                ))}
              </Command.Group>
            ) : null}
            {ac.showHistory && historyEntries.length > 0 ? (
              <Command.Group heading={t.history}>
                {historyEntries.slice(0, ac.recentLimit).map((entry) => (
                  <Command.Item
                    key={`history-${entry.at}-${entry.q}`}
                    value={`history:${entry.q}`}
                    onSelect={() => {
                      if (entry.urlPath) {
                        onNavigate(
                          { urlPath: entry.urlPath, title: entry.title },
                          entry.q
                        );
                      } else {
                        onApplyQuery(entry.q);
                      }
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-muted/70"
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
          </>
        )}

        {!showEmptyState && query.length > 0 && query.length < minLen && !loading ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t.typeMin(minLen)}</p>
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
                <SearchHitRow
                  as="div"
                  title={s.title}
                  meta={entityLabel(s.entityType)}
                  showPreview={false}
                  index={i}
                  className="w-full"
                />
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}

        {showFullResults && results.length === 0 && !loading ? (
          <SearchEmptyState
            title={t.emptyTitle}
            description={
              locale === "ar"
                ? `لا توجد نتائج لـ «${query.trim()}».`
                : `No results for "${query.trim()}". ${t.emptySub}`
            }
          />
        ) : null}

        {showFullResults && !loading && !ac.groupResults ? (
          <Command.Group heading={t.results}>
            {results.map((r, i) => (
              <Command.Item
                key={r.id ?? r.urlPath}
                value={`result:${r.id ?? r.urlPath}`}
                onSelect={() => onNavigate(r, query)}
                className="p-0 aria-selected:bg-transparent"
              >
                <SearchHitRow
                  as="div"
                  title={r.title}
                  meta={entityLabel(r.entityType)}
                  snippet={r.snippet}
                  showPreview={ac.showResultPreviews}
                  index={i}
                  className="w-full"
                />
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}

        {showFullResults && !loading && ac.groupResults
          ? Array.from(grouped.entries()).map(([type, items]) => (
              <Command.Group key={type} heading={entityLabel(type)}>
                {items.map((r, i) => (
                  <Command.Item
                    key={r.id ?? r.urlPath}
                    value={`result:${r.id ?? r.urlPath}`}
                    onSelect={() => onNavigate(r, query)}
                    className="p-0 aria-selected:bg-transparent"
                  >
                    <SearchHitRow
                      as="div"
                      title={r.title}
                      snippet={r.snippet}
                      showPreview={ac.showResultPreviews}
                      index={i}
                      className="w-full"
                    />
                  </Command.Item>
                ))}
              </Command.Group>
            ))
          : null}
      </Command.List>

      {ac.keyboardNavigation ? (
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
