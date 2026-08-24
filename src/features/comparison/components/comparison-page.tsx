"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type {
  CompareItemSnapshot,
  CompareRowEntry,
  CompareViewMode,
  ComparisonMode,
} from "@/features/comparison/types";
import type { CompareFieldMeta } from "@/features/comparison/types";
import {
  buildCompareTable,
  filterCompareEntriesByGroups,
  filterCompareItemsBySearch,
  getCompareGroupsFromFields,
} from "@/features/comparison/comparison-engine";
import { compareItemTitle } from "@/features/comparison/lib/compare-locale";
import {
  COMPARE_CHANGED_EVENT,
  clearCompareList,
  getCompareIdsForType,
  removeFromCompareList,
} from "@/features/comparison/comparison-store";
import { ComparisonCards } from "@/features/comparison/components/comparison-cards";
import { ComparisonTable } from "@/features/comparison/components/comparison-table";
import { ComparisonQuickAdd } from "@/features/comparison/components/comparison-quick-add";
import "@/features/comparison/compare-page.css";

export type ComparisonPageLabels = {
  empty: string;
  allSpecs: string;
  differences: string;
  hideEqual: string;
  specifications: string;
  remove: string;
  continueBrowsing: string;
  searchPlaceholder: string;
  loading: string;
  clearAll?: string;
  quickAdd: string;
  quickAddPlaceholder: string;
  filterGroups: string;
  allGroups: string;
  mobileView: string;
  tableView: string;
};

type LayoutView = "auto" | "mobile" | "table";

type Props = {
  locale: string;
  localePrefix: string;
  contentTypeSlug: string;
  /** URL segment for API routes (e.g. packages, products) */
  apiSegment: string;
  comparisonMode: ComparisonMode;
  compareFields: CompareFieldMeta[];
  maxItems: number;
  listHref: string;
  labels: ComparisonPageLabels;
};

export function ComparisonPage({
  locale,
  localePrefix,
  contentTypeSlug,
  apiSegment,
  comparisonMode,
  compareFields,
  maxItems,
  listHref,
  labels,
}: Props) {
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<CompareItemSnapshot[]>([]);
  const [specEntriesFromApi, setSpecEntriesFromApi] = useState<CompareRowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [specMode, setSpecMode] = useState<CompareViewMode>("all");
  const [search, setSearch] = useState("");
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set());
  const [layoutView, setLayoutView] = useState<LayoutView>("auto");
  const [isNarrow, setIsNarrow] = useState(false);

  const groups = useMemo(() => {
    if (compareFields.length > 0) return getCompareGroupsFromFields(compareFields);
    const g: string[] = [];
    for (const e of specEntriesFromApi) {
      if (e.type === "group" && !g.includes(e.group)) g.push(e.group);
    }
    return g;
  }, [compareFields, specEntriesFromApi]);

  const refreshIds = useCallback(() => {
    setIds(getCompareIdsForType(contentTypeSlug));
  }, [contentTypeSlug]);

  const [isSoftRefreshing, setIsSoftRefreshing] = useState(false);
  const skipViewAnim = useRef(true);

  const usesApiSpecTable = compareFields.length === 0;
  const prevSpecModeRef = useRef(specMode);

  const loadItems = useCallback(
    async (
      listIds: string[],
      mode: CompareViewMode,
      options?: { withLoading?: boolean }
    ) => {
      if (listIds.length === 0) {
        setItems([]);
        setSpecEntriesFromApi([]);
        setLoading(false);
        setIsSoftRefreshing(false);
        return;
      }
      const showLoading = options?.withLoading !== false;
      if (showLoading) setLoading(true);
      else setIsSoftRefreshing(true);
      try {
        const params = new URLSearchParams({
          ids: listIds.join(","),
          locale: localePrefix,
          mode,
        });
        const res = await fetch(`/api/compare/${apiSegment}?${params}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as {
          items?: CompareItemSnapshot[];
          specEntries?: CompareRowEntry[];
        };
        setItems(data.items ?? []);
        setSpecEntriesFromApi(data.specEntries ?? []);
      } catch {
        setItems([]);
        setSpecEntriesFromApi([]);
      } finally {
        if (showLoading) setLoading(false);
        else setIsSoftRefreshing(false);
      }
    },
    [apiSegment, localePrefix]
  );

  useEffect(() => {
    refreshIds();
  }, [refreshIds]);

  useEffect(() => {
    void loadItems(ids, specMode, { withLoading: true });
    prevSpecModeRef.current = specMode;
  }, [ids, loadItems]);

  useEffect(() => {
    if (ids.length === 0 || !usesApiSpecTable) return;
    if (prevSpecModeRef.current === specMode) return;
    prevSpecModeRef.current = specMode;
    void loadItems(ids, specMode, { withLoading: false });
  }, [specMode, ids, usesApiSpecTable, loadItems]);

  useEffect(() => {
    const onChange = () => refreshIds();
    window.addEventListener(COMPARE_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(COMPARE_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refreshIds]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const onRemove = (id: string) => {
    removeFromCompareList(contentTypeSlug, id);
    refreshIds();
  };

  const filteredItems = useMemo(
    () => filterCompareItemsBySearch(items, search, locale),
    [items, search, locale]
  );

  const specEntries = useMemo(() => {
    const table =
      compareFields.length > 0
        ? buildCompareTable(filteredItems, compareFields, locale, specMode)
        : specEntriesFromApi;
    const groupFilter = activeGroups.size > 0 && activeGroups.size < groups.length ? activeGroups : null;
    return filterCompareEntriesByGroups(table, groupFilter);
  }, [
    filteredItems,
    compareFields,
    locale,
    specMode,
    activeGroups,
    groups.length,
    specEntriesFromApi,
  ]);

  const useMobileLayout =
    layoutView === "mobile" || (layoutView === "auto" && isNarrow);

  const isEmpty = ids.length === 0;
  const showCards = comparisonMode === "cards" || comparisonMode === "hybrid";
  const showTable =
    (comparisonMode === "table" || comparisonMode === "hybrid") &&
    specEntries.length > 0 &&
    !useMobileLayout;

  const toggleGroup = (group: string) => {
    setActiveGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const showAllGroups = () => setActiveGroups(new Set());

  const colCount = filteredItems.length;
  const alignCardsWithTable = showCards && showTable && !useMobileLayout;

  const viewAnimKey = useMemo(
    () => `${specMode}|${layoutView}|${useMobileLayout ? "mobile" : "table"}`,
    [specMode, layoutView, useMobileLayout]
  );

  const filterAnimKey = useMemo(
    () => `${search}|${[...activeGroups].sort().join(",")}`,
    [search, activeGroups]
  );

  const contentAnimKey = `${viewAnimKey}|${filterAnimKey}`;
  const shouldAnimateView = !skipViewAnim.current;

  useEffect(() => {
    skipViewAnim.current = false;
  }, []);

  const layoutStyle =
    colCount > 0
      ? ({ "--cmp-cols": colCount } as CSSProperties)
      : undefined;

  return (
    <div className={useMobileLayout ? "cmp-page cmp-page--mobile" : "cmp-page"}>
      <ComparisonQuickAdd
        contentTypeSlug={contentTypeSlug}
        apiSegment={apiSegment}
        maxItems={maxItems}
        locale={locale}
        localePrefix={localePrefix}
        label={labels.quickAdd}
        placeholder={labels.quickAddPlaceholder}
        onAdded={refreshIds}
      />

      {isEmpty ? <p className="cmp-empty-msg">{labels.empty}</p> : null}

      <div className="cmp-toolbar">
        <div className="cmp-toggle" role="group" aria-label="Specification view">
          <button
            type="button"
            className={`cmp-toggle__btn${specMode === "all" ? " is-active" : ""}`}
            aria-pressed={specMode === "all"}
            disabled={isEmpty}
            onClick={() => setSpecMode("all")}
          >
            {labels.allSpecs}
          </button>
          <button
            type="button"
            className={`cmp-toggle__btn${specMode === "differences" ? " is-active" : ""}`}
            aria-pressed={specMode === "differences"}
            disabled={isEmpty}
            onClick={() => setSpecMode("differences")}
          >
            {labels.differences}
          </button>
          <button
            type="button"
            className={`cmp-toggle__btn${specMode === "hideEqual" ? " is-active" : ""}`}
            aria-pressed={specMode === "hideEqual"}
            disabled={isEmpty}
            onClick={() => setSpecMode("hideEqual")}
          >
            {labels.hideEqual}
          </button>
        </div>

        <div className="cmp-toggle" role="group" aria-label="Layout view">
          <button
            type="button"
            className={`cmp-toggle__btn${layoutView === "mobile" || (layoutView === "auto" && isNarrow) ? " is-active" : ""}`}
            aria-pressed={useMobileLayout}
            onClick={() => setLayoutView("mobile")}
          >
            {labels.mobileView}
          </button>
          <button
            type="button"
            className={`cmp-toggle__btn${!useMobileLayout ? " is-active" : ""}`}
            aria-pressed={!useMobileLayout}
            onClick={() => setLayoutView("table")}
          >
            {labels.tableView}
          </button>
        </div>

        {!isEmpty ? (
          <input
            type="search"
            className="cmp-search"
            placeholder={labels.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={labels.searchPlaceholder}
          />
        ) : null}

        {isEmpty ? (
          <Link href={listHref} className="cmp-cta">
            {labels.continueBrowsing}
          </Link>
        ) : (
          <button
            type="button"
            className="cmp-cta cmp-cta--ghost"
            onClick={() => {
              clearCompareList(contentTypeSlug);
              refreshIds();
            }}
          >
            {labels.clearAll ?? labels.remove}
          </button>
        )}
      </div>

      {!isEmpty && groups.length > 1 ? (
        <div className="cmp-group-filters" role="group" aria-label={labels.filterGroups}>
          <button
            type="button"
            className={`cmp-group-chip${activeGroups.size === 0 ? " is-active" : ""}`}
            onClick={showAllGroups}
          >
            {labels.allGroups}
          </button>
          {groups.map((group) => (
            <button
              key={group}
              type="button"
              className={`cmp-group-chip${activeGroups.has(group) ? " is-active" : ""}`}
              aria-pressed={activeGroups.has(group)}
              onClick={() => toggleGroup(group)}
            >
              {group}
            </button>
          ))}
        </div>
      ) : null}

      {loading && !isEmpty ? (
        <p className="cmp-loading" aria-live="polite">
          {labels.loading}
        </p>
      ) : null}

      {!isEmpty && !loading && filteredItems.length > 0 ? (
        <div
          className={cn(
            "cmp-compare-viewport",
            isSoftRefreshing && "cmp-compare-viewport--refreshing"
          )}
        >
          <div
            key={contentAnimKey}
            className={cn("cmp-compare-body", shouldAnimateView && "cmp-animate-in")}
          >
          {alignCardsWithTable ? (
            <div
              className="cmp-compare-layout"
              data-cols={colCount}
              style={layoutStyle}
            >
              <div className="cmp-cards-scroll">
                <ComparisonCards
                  items={filteredItems}
                  locale={locale}
                  removeLabel={labels.remove}
                  onRemove={onRemove}
                  alignWithTable
                />
              </div>
              <ComparisonTable
                items={filteredItems}
                entries={specEntries}
                locale={locale}
                specificationsLabel={labels.specifications}
              />
            </div>
          ) : (
            <>
              {showCards || useMobileLayout ? (
                <ComparisonCards
                  items={filteredItems}
                  locale={locale}
                  removeLabel={labels.remove}
                  onRemove={onRemove}
                />
              ) : null}

              {useMobileLayout && specEntries.length > 0 ? (
                <ComparisonMobileSpecs
                  items={filteredItems}
                  entries={specEntries}
                  locale={locale}
                  specificationsLabel={labels.specifications}
                />
              ) : null}

              {showTable ? (
                <ComparisonTable
                  items={filteredItems}
                  entries={specEntries}
                  locale={locale}
                  specificationsLabel={labels.specifications}
                />
              ) : null}
            </>
          )}
          </div>
        </div>
      ) : null}

      {!isEmpty && !loading && filteredItems.length === 0 && search ? (
        <p className="cmp-empty-msg">{labels.empty}</p>
      ) : null}
    </div>
  );
}

function ComparisonMobileSpecs({
  items,
  entries,
  locale,
  specificationsLabel,
}: {
  items: CompareItemSnapshot[];
  entries: import("@/features/comparison/types").CompareRowEntry[];
  locale: string;
  specificationsLabel: string;
}) {
  const titleFor = (item: CompareItemSnapshot) => compareItemTitle(item, locale);

  return (
    <section className="cmp-mobile-specs" aria-labelledby="cmp-mobile-specs-heading">
      <h2 id="cmp-mobile-specs-heading" className="cmp-specs__title">
        {specificationsLabel}
      </h2>
      {items.map((item, itemIndex) => (
        <article key={item.id} className="cmp-mobile-specs__item">
          <h3 className="cmp-mobile-specs__item-title">{titleFor(item)}</h3>
          <dl className="cmp-mobile-specs__dl">
            {entries.map((entry, idx) => {
              if (entry.type === "group") {
                return (
                  <div key={`g-${entry.group}-${idx}`} className="cmp-mobile-specs__group">
                    {entry.group}
                  </div>
                );
              }
              const val = entry.values[itemIndex];
              return (
                <div
                  key={`${entry.key}-${idx}`}
                  className={`cmp-mobile-specs__row${entry.differs && entry.highlightDifferences ? " is-diff" : ""}`}
                >
                  <dt>{entry.label}</dt>
                  <dd>{val ?? "—"}</dd>
                </div>
              );
            })}
          </dl>
        </article>
      ))}
    </section>
  );
}
