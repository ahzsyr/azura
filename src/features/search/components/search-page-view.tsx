"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicSearchConfig } from "@/features/search/settings/public-search-config";
import { ENTITY_LABELS } from "@/features/search/constants";
import type { SearchEntityType } from "@prisma/client";
import { searchCopy, type SearchLocale } from "@/features/search/components/search-ui/search-copy";
import { SearchEmptyState } from "@/features/search/components/search-ui/search-empty-state";
import { SearchHitRow } from "@/features/search/components/search-ui/search-hit-row";
import { SearchInputShell } from "@/features/search/components/search-ui/search-input-shell";
import { SearchPageSkeleton } from "@/features/search/components/search-ui/search-skeleton";
import { SearchThemeRoot } from "@/features/search/components/search-ui/search-theme-root";
import { trackSearchAnalytics } from "@/features/search/analytics/search-analytics.client";

type SearchHit = {
  id: string;
  entityId?: string;
  title: string;
  snippet?: string;
  urlPath: string;
  entityType: SearchEntityType;
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
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const t = searchCopy(locale);

  const fetchPage = useCallback(
    async (q: string, offset: number, append: boolean) => {
      if (q.length < config.minQueryLength) {
        setResults([]);
        setPagination(null);
        return;
      }
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&locale=${locale}&limit=${config.resultsPerPage}&offset=${offset}`
        );
        const data = await res.json();
        const hits = (data.results ?? []) as SearchHit[];
        const page = data.pagination as PaginationMeta | undefined;
        if (append) {
          setResults((prev) => {
            const next = [...prev, ...hits];
            setPagination(
              page ?? {
                offset,
                limit: config.resultsPerPage,
                hasMore: hits.length >= config.resultsPerPage,
                total: next.length,
              }
            );
            return next;
          });
        } else {
          setResults(hits);
          setPagination(
            page ?? {
              offset,
              limit: config.resultsPerPage,
              hasMore: hits.length >= config.resultsPerPage,
              total: hits.length,
            }
          );
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [config.minQueryLength, config.resultsPerPage, locale]
  );

  const runSearch = useCallback(
    (q: string) => void fetchPage(q, 0, false),
    [fetchPage]
  );

  useEffect(() => {
    if (initialQ.length >= config.minQueryLength) {
      void runSearch(initialQ);
    }
  }, [initialQ, config.minQueryLength, runSearch]);

  useEffect(() => {
    if (!config.instantSearch) return;
    const timer = setTimeout(() => void runSearch(query), config.debounceMs);
    return () => clearTimeout(timer);
  }, [query, config.instantSearch, config.debounceMs, runSearch]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(query);
  };

  const loadMore = () => {
    if (!pagination?.hasMore || loadingMore) return;
    void fetchPage(query, results.length, true);
  };

  const label = (type: SearchEntityType) =>
    ENTITY_LABELS[type]?.[locale === "ar" ? "ar" : "en"] ?? type;

  const grouped = useMemo(() => {
    const map = new Map<SearchEntityType, SearchHit[]>();
    for (const r of results) {
      const list = map.get(r.entityType) ?? [];
      list.push(r);
      map.set(r.entityType, list);
    }
    return map;
  }, [results]);

  const showResults = query.length >= config.minQueryLength;
  const showHint = query.length > 0 && query.length < config.minQueryLength;

  return (
    <SearchThemeRoot
      inheritGlobalTheme={config.inheritGlobalTheme}
      inputStyle={config.inputStyle}
      panelWidth={config.panelWidth}
      modalStyle={config.modal}
      className="relative min-h-[60vh]"
    >
      <div className="sm-search-page-hero" aria-hidden />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-4xl">
        <header className="mb-8 flex items-start gap-4 sm:mb-10">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"
            aria-hidden
          >
            <Search className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h1 className="sm-search-title text-2xl font-bold tracking-tight sm:text-3xl">{t.pageTitle}</h1>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {t.pageSub}
            </p>
          </div>
        </header>

        <form onSubmit={onSubmit} className="space-y-2" role="search">
          <SearchInputShell
            style={config.inputStyle}
            loading={loading}
            value={query}
            onClear={() => setQuery("")}
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
          {!config.instantSearch ? (
            <p className="text-xs text-muted-foreground">{t.pressEnter}</p>
          ) : null}
        </form>

        {showHint ? (
          <p className="mt-8 text-sm text-muted-foreground" role="status">
            {t.typeMin(config.minQueryLength)}
          </p>
        ) : null}

        {!showHint && !showResults && !loading ? (
          <SearchEmptyState
            className="mt-10"
            title={t.startTitle}
            description={t.startSub}
          />
        ) : null}

        {loading && showResults && !results.length ? <SearchPageSkeleton /> : null}

        {!loading && showResults && results.length === 0 ? (
          <SearchEmptyState
            className="mt-10"
            title={t.emptyTitle}
            description={
              locale === "ar"
                ? `لا توجد نتائج لـ «${query.trim()}».`
                : `No results for "${query.trim()}". ${t.emptySub}`
            }
          />
        ) : null}

        {!loading && showResults && results.length > 0 ? (
          <div className="mt-8 space-y-8">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {pagination
                ? locale === "ar"
                  ? `${results.length} من ${pagination.hasMore ? `${pagination.total}+` : pagination.total} نتيجة`
                  : `${results.length} of ${pagination.hasMore ? `${pagination.total}+` : pagination.total} results`
                : t.resultCount(results.length)}
            </p>
            {Array.from(grouped.entries()).map(([type, items]) => (
              <section key={type} aria-labelledby={`search-group-${type}`}>
                <h2
                  id={`search-group-${type}`}
                  className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {label(type)}
                </h2>
                <ul className="space-y-2" role="list">
                  {items.map((r, i) => (
                    <li key={`${r.id}-${i}`}>
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
                        className={cn(
                          "block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        )}
                      >
                        <SearchHitRow
                          as="div"
                          title={r.title}
                          snippet={r.snippet}
                          showPreview
                          index={i}
                          className="pointer-events-none border-border/50 bg-card/40"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {pagination?.hasMore ? (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? t.loadingMore : t.loadMore}
                </Button>
              </div>
            ) : null}

            {loadingMore ? <SearchPageSkeleton /> : null}
          </div>
        ) : null}
      </div>
    </SearchThemeRoot>
  );
}
