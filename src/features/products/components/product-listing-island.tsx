"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { collectionMapFromList } from "@/features/collections/collection-navigation";
import type { Collection } from "@/features/collections/types";
import {
  CollectionHierarchyChrome,
  type CollectionHierarchyChromeLabels,
} from "@/features/collections/components/collection-hierarchy-chrome";
import type { CatalogListingViewMode } from "@/features/catalog/lib/catalog-layout";
import type { ResolvedCatalogToolbarDock } from "@/features/catalog/lib/catalog-layout";
import { catalogToolbarDockCssVars } from "@/features/catalog/lib/catalog-layout";
import { aggregateFacets } from "@/features/products/listing/aggregate-facets";
import { filterListingCatalog, paginateListing } from "@/features/products/listing/filter";
import type { ListingFacets, ListingFilterState, ProductListingRecord } from "@/features/products/listing/types";
import {
  countActiveFilters,
  filterStateFromSearchParams,
  searchParamsFromFilterState,
} from "@/features/products/listing/url-state";
import { LISTING_PER_OPTIONS, type ListingPerPage } from "@/features/products/listing/types";
import { fuzzyMatchListingSlugs } from "@/features/products/listing/search";
import { trackListingSearchAnalytics } from "@/features/search/analytics/search-analytics.client";
import { useCatalogListingFetch } from "@/features/products/listing/use-catalog-listing-fetch";
import { useDebouncedValueWithFlush } from "@/hooks/use-debounced-value";
import type {
  CatalogToolbarLabels,
  ProductListingLabels,
} from "@/features/products/listing/listing-labels";
import { ProductListingFilters } from "./listing/product-listing-filters";
import { ProductListingGrid } from "./listing/product-listing-grid";
import {
  IconChevron,
  IconClose,
  IconEllipsis,
  IconSearch,
  viewModeIcon,
} from "./listing/listing-ui-icons";

const MOBILE_DOCK_MQ = "(max-width: 639px)";
const DESKTOP_DEFAULT_PER: ListingPerPage = 20;

export type CatalogSortKey = "name-asc" | "name-desc" | "items-desc";

type ViewMode = CatalogListingViewMode;

type Props = {
  locale: string;
  records: ProductListingRecord[];
  facets: ListingFacets;
  collections: Collection[];
  collectionScope?: string;
  layoutVariant?: "catalog" | "collections-catalog";
  listingMode?: "product" | "collection";
  hierarchyLabels?: CollectionHierarchyChromeLabels;
  hierarchyVariant?: "select" | "tabs" | "chrome" | "sidebar";
  searchDebounceMs?: number;
  searchFuzziness?: number;
  defaultViewMode?: ViewMode;
  viewModes?: ViewMode[];
  labels: ProductListingLabels;
  catalogToolbarLabels?: CatalogToolbarLabels;
  cardLayoutCssVars?: Record<string, string>;
  buyNow?: import("@/features/products/lib/product-buy-now").ResolvedProductBuyNow;
  quoteCta?: import("@/features/products/lib/product-cta").ResolvedProductCtaConfig;
  cardLayout?: import("@/features/products/lib/product-storefront-layout").ResolvedProductCardLayout;
  catalogToolbarDock?: ResolvedCatalogToolbarDock;
  pageDir?: "ltr" | "rtl";
  /** When true, records are pre-filtered/paginated on the server; URL changes trigger RSC refresh. */
  serverPaginated?: boolean;
  total?: number;
  totalPages?: number;
};

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function toggleVariation(
  variations: Record<string, string[]>,
  type: string,
  option: string,
): Record<string, string[]> {
  const cur = variations[type] ?? [];
  const next = cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option];
  const out = { ...variations };
  if (next.length) out[type] = next;
  else delete out[type];
  return out;
}

function pageButtons(totalPages: number, current: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const btns: (number | "ellipsis")[] = [1];
  if (current > 3) btns.push("ellipsis");
  for (let p = Math.max(2, current - 1); p <= Math.min(totalPages - 1, current + 1); p++)
    btns.push(p);
  if (current < totalPages - 2) btns.push("ellipsis");
  btns.push(totalPages);
  return btns;
}

export function ProductListingIsland({
  locale,
  records,
  facets: facetsProp,
  collections,
  collectionScope,
  layoutVariant = "collections-catalog",
  listingMode = "product",
  hierarchyLabels,
  hierarchyVariant = "chrome",
  searchDebounceMs = 150,
  searchFuzziness = 0.35,
  defaultViewMode = "grid",
  viewModes = ["grid", "list", "table"],
  labels,
  catalogToolbarLabels,
  cardLayoutCssVars,
  buyNow,
  quoteCta,
  cardLayout,
  catalogToolbarDock,
  pageDir = "ltr",
  serverPaginated = false,
  total: totalProp,
  totalPages: totalPagesProp,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const dock = catalogToolbarDock;
  const dockEnabled = dock?.enabled !== false;
  const dockStyle = dock ? catalogToolbarDockCssVars(dock) : undefined;
  const isCatalogLayout =
    layoutVariant === "catalog" || layoutVariant === "collections-catalog";
  const mode = listingMode;
  const isCollectionListing = mode === "collection";

  const [pinnedSidebar, setPinnedSidebar] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dockPanelOpen, setDockPanelOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [qInput, setQInput] = useState("");
  const [debouncedQ, flushDebouncedQ] = useDebouncedValueWithFlush(qInput.trim(), searchDebounceMs);
  const [fuzzySearching, setFuzzySearching] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [catalogSort, setCatalogSort] = useState<CatalogSortKey>("name-asc");
  const fuzzySlugsRef = useRef<Set<string> | undefined>(undefined);
  const [fuzzyVersion, setFuzzyVersion] = useState(0);
  const catalogSearchInputRef = useRef<HTMLInputElement>(null);

  const scopeBySlug = useMemo(() => collectionMapFromList(collections), [collections]);
  const collectionNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of collections) m[c.slug] = c.name;
    return m;
  }, [collections]);

  const hierarchyCollections = useMemo(
    () =>
      collections.map((c) => ({
        slug: c.slug,
        name: c.name,
        parentSlug: c.parentSlug,
        visible: c.visible !== false,
      })),
    [collections],
  );

  const hierarchyAsLocalized = useMemo(
    () =>
      collections.map((c) => ({
        slug: c.slug,
        name: c.name,
        parentSlug: c.parentSlug,
        id: c.slug,
        description: c.description ?? "",
        visible: c.visible !== false,
        conditions: { match: "any" as const, rules: [] },
      })),
    [collections],
  );

  const state: ListingFilterState = useMemo(() => {
    const parsed = filterStateFromSearchParams(new URLSearchParams(searchParams.toString()));
    if (collectionScope) {
      return { ...parsed, collectionScope, collections: [] };
    }
    return parsed;
  }, [searchParams, collectionScope]);

  useEffect(() => {
    setQInput(state.q);
    flushDebouncedQ(state.q.trim());
  }, [state.q, flushDebouncedQ]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      if (isCatalogLayout) {
        setPinnedSidebar(mq.matches);
        return;
      }
      setPinnedSidebar(mq.matches);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [isCatalogLayout]);

  useEffect(() => {
    if (pinnedSidebar) {
      setDrawerOpen(false);
      setSearchOpen(false);
    }
  }, [pinnedSidebar]);

  useEffect(() => {
    if (!drawerOpen || pinnedSidebar) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen, pinnedSidebar]);

  useEffect(() => {
    if (!searchOpen) return;
    catalogSearchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen && !drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (searchOpen) setSearchOpen(false);
      else if (drawerOpen) setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, drawerOpen]);

  useEffect(() => {
    if (serverPaginated) return;
    const q = debouncedQ;
    if (!q) {
      fuzzySlugsRef.current = undefined;
      setFuzzySearching(false);
      setFuzzyVersion((v) => v + 1);
      return;
    }
    setFuzzySearching(true);
    void fuzzyMatchListingSlugs(records, q, searchFuzziness).then((set) => {
      fuzzySlugsRef.current = set.size > 0 ? set : undefined;
      setFuzzySearching(false);
      setFuzzyVersion((v) => v + 1);
    });
  }, [debouncedQ, records, searchFuzziness, serverPaginated]);

  const replaceState = useCallback(
    (next: ListingFilterState) => {
      const href = searchParamsFromFilterState(next, pathname);
      startTransition(() => router.replace(href, { scroll: false }));
    },
    [pathname, router],
  );

  const patchState = useCallback(
    (patch: Partial<ListingFilterState>) => {
      replaceState({ ...state, ...patch, page: patch.page ?? 1 });
    },
    [replaceState, state],
  );

  useEffect(() => {
    if (!dockEnabled) return;
    const mq = window.matchMedia(MOBILE_DOCK_MQ);
    const syncPer = () => {
      if (mq.matches) {
        if (state.per !== 10) patchState({ per: 10, page: 1 });
        return;
      }
      if (state.per === 10) patchState({ per: DESKTOP_DEFAULT_PER, page: 1 });
    };
    syncPer();
    mq.addEventListener("change", syncPer);
    return () => mq.removeEventListener("change", syncPer);
  }, [dockEnabled, patchState, state.per]);

  const pendingFilterState = useMemo(
    () => ({ ...state, q: debouncedQ }),
    [state, debouncedQ],
  );

  const listingFetch = useCatalogListingFetch({
    locale,
    filterState: pendingFilterState,
    listingMode: mode,
    collectionSlug: collectionScope ?? null,
    enabled: serverPaginated,
    initialRecords: records,
    initialFacets: facetsProp,
    initialTotal: totalProp ?? records.length,
    initialTotalPages: totalPagesProp ?? Math.max(1, Math.ceil((totalProp ?? records.length) / state.per)),
  });

  useEffect(() => {
    const trimmed = debouncedQ;
    if (trimmed === state.q.trim()) return;
    replaceState({ ...state, q: trimmed, page: 1 });
  }, [debouncedQ, state.q, state, replaceState]);

  const displayRecords = serverPaginated ? listingFetch.records : records;
  const displayFacets = serverPaginated ? listingFetch.facets : facetsProp;
  const displayTotal = serverPaginated ? listingFetch.total : undefined;
  const displayTotalPages = serverPaginated ? listingFetch.totalPages : undefined;

  useEffect(() => {
    const q = debouncedQ.trim();
    if (q.length < 2) return;
    const resultCount = serverPaginated
      ? (listingFetch.total ?? 0)
      : records.filter((r) => r.searchText.includes(q.toLowerCase())).length;
    trackListingSearchAnalytics({ locale, q, resultCount });
  }, [debouncedQ, locale, serverPaginated, listingFetch.total, records]);

  const resetSearchQuery = useCallback(() => {
    setQInput("");
    flushDebouncedQ("");
    fuzzySlugsRef.current = undefined;
    setFuzzyVersion((v) => v + 1);
    listingFetch.abort();
  }, [flushDebouncedQ, listingFetch.abort]);

  const filterState = pendingFilterState;
  const instantQuery = qInput.trim();
  const clientFilterState = useMemo(
    () => ({ ...state, q: instantQuery || debouncedQ }),
    [state, instantQuery, debouncedQ],
  );

  const filterOptions = useMemo(
    () => ({
      collectionScopeBySlug: scopeBySlug,
      listingMode: mode,
    }),
    [scopeBySlug, mode],
  );

  const scopeFilteredRecords = useMemo(() => {
    void fuzzyVersion;
    const scopeOnly: ListingFilterState = {
      q: debouncedQ,
      collectionScope: filterState.collectionScope,
      categories: [],
      brands: [],
      collections: [],
      tags: [],
      conditions: [],
      variations: {},
      priceMin: null,
      priceMax: null,
      stockOnly: false,
      page: 1,
      per: state.per,
    };
    return filterListingCatalog(
      displayRecords,
      scopeOnly,
      fuzzySlugsRef.current,
      filterOptions,
    );
  }, [displayRecords, filterState.collectionScope, debouncedQ, state.per, fuzzyVersion, filterOptions]);

  const facetsForFilters = useMemo(() => {
    if (serverPaginated) return displayFacets;
    if (!hierarchyCollections.length || !scopeBySlug.size) return facetsProp;
    const base = filterState.collectionScope?.trim() ? scopeFilteredRecords : displayRecords;
    return aggregateFacets(base, hierarchyAsLocalized);
  }, [
    hierarchyCollections.length,
    scopeBySlug.size,
    filterState.collectionScope,
    scopeFilteredRecords,
    displayRecords,
    hierarchyAsLocalized,
    facetsProp,
    serverPaginated,
    displayFacets,
  ]);

  const filtered = useMemo(() => {
    if (serverPaginated) return displayRecords;
    void fuzzyVersion;
    return filterListingCatalog(displayRecords, clientFilterState, fuzzySlugsRef.current, filterOptions);
  }, [displayRecords, clientFilterState, fuzzyVersion, filterOptions, serverPaginated]);

  const sortedFiltered = useMemo(() => {
    if (serverPaginated) return filtered;
    if (!isCatalogLayout) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (catalogSort === "items-desc") {
        return (b.reviews_count ?? 0) - (a.reviews_count ?? 0);
      }
      if (catalogSort === "name-desc") {
        return (b.name || "").localeCompare(a.name || "");
      }
      return (a.name || "").localeCompare(b.name || "");
    });
    return copy;
  }, [filtered, isCatalogLayout, catalogSort]);

  const listForPagination = isCatalogLayout ? sortedFiltered : filtered;

  const pagination = useMemo(() => {
    if (serverPaginated) {
      const total = displayTotal ?? displayRecords.length;
      const totalPages = displayTotalPages ?? Math.max(1, Math.ceil(total / state.per));
      const currentPage = Math.min(Math.max(1, state.page), totalPages);
      const start = (currentPage - 1) * state.per;
      const firstItem = total === 0 ? 0 : start + 1;
      const lastItem = Math.min(start + state.per, total);
      return {
        items: displayRecords,
        total,
        totalPages,
        firstItem,
        lastItem,
      };
    }
    return paginateListing(listForPagination, state.page, state.per);
  }, [
    listForPagination,
    state.page,
    state.per,
    serverPaginated,
    displayRecords,
    displayTotal,
    displayTotalPages,
  ]);

  useEffect(() => {
    if (state.page > pagination.totalPages) {
      patchState({ page: pagination.totalPages });
    }
  }, [pagination.totalPages, state.page, patchState]);

  useEffect(() => {
    if (records.length === 0) return;
    const id = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("az:images-ready"));
    });
    return () => window.cancelAnimationFrame(id);
  }, [records.length, state.page, state.per, pagination.items.length]);

  const activeCount = countActiveFilters(filterState);

  const clearAll = () => {
    resetSearchQuery();
    replaceState({
      ...state,
      q: "",
      categories: [],
      brands: [],
      collections: [],
      collectionScope: collectionScope ?? null,
      tags: [],
      conditions: [],
      variations: {},
      priceMin: null,
      priceMax: null,
      stockOnly: false,
      page: 1,
    });
  };

  const chips = useMemo(() => {
    const out: { key: string; label: string; onRemove: () => void }[] = [];
    const q = filterState.q.trim();
    if (q)
      out.push({
        key: "q",
        label: `"${q}"`,
        onRemove: () => {
          resetSearchQuery();
          patchState({ q: "", page: 1 });
        },
      });
    if (filterState.collectionScope?.trim() && !collectionScope) {
      const scopeSlug = filterState.collectionScope.trim();
      out.push({
        key: `scope-${scopeSlug}`,
        label: collectionNames[scopeSlug] ?? scopeSlug,
        onRemove: () => patchState({ collectionScope: null }),
      });
    }
    if (!hierarchyCollections.length) {
      for (const slug of filterState.collections) {
        out.push({
          key: `col-${slug}`,
          label: collectionNames[slug] ?? slug,
          onRemove: () =>
            patchState({ collections: filterState.collections.filter((s) => s !== slug) }),
        });
      }
    }
    for (const c of filterState.categories) {
      out.push({
        key: `cat-${c}`,
        label: c,
        onRemove: () => patchState({ categories: filterState.categories.filter((x) => x !== c) }),
      });
    }
    for (const b of filterState.brands) {
      out.push({
        key: `brand-${b}`,
        label: b,
        onRemove: () => patchState({ brands: filterState.brands.filter((x) => x !== b) }),
      });
    }
    for (const t of filterState.tags) {
      out.push({
        key: `tag-${t}`,
        label: t,
        onRemove: () => patchState({ tags: filterState.tags.filter((x) => x !== t) }),
      });
    }
    for (const c of filterState.conditions) {
      out.push({
        key: `cond-${c}`,
        label: c,
        onRemove: () => patchState({ conditions: filterState.conditions.filter((x) => x !== c) }),
      });
    }
    for (const [type, opts] of Object.entries(filterState.variations)) {
      for (const opt of opts) {
        out.push({
          key: `var-${type}-${opt}`,
          label: `${type}: ${opt}`,
          onRemove: () =>
            patchState({ variations: toggleVariation(filterState.variations, type, opt) }),
        });
      }
    }
    if (filterState.priceMin != null || filterState.priceMax != null) {
      const min = filterState.priceMin ?? facetsForFilters.priceMin;
      const max = filterState.priceMax ?? facetsForFilters.priceMax;
      out.push({
        key: "price",
        label: `${min}\u2013${max}`,
        onRemove: () => patchState({ priceMin: null, priceMax: null }),
      });
    }
    if (filterState.stockOnly) {
      out.push({
        key: "stock",
        label: labels.inStockOnly,
        onRemove: () => patchState({ stockOnly: false }),
      });
    }
    return out;
  }, [
    filterState,
    collectionNames,
    facetsForFilters.priceMin,
    facetsForFilters.priceMax,
    labels.inStockOnly,
    patchState,
    hierarchyCollections.length,
    collectionScope,
    resetSearchQuery,
  ]);

  const defaultHierarchyLabels: CollectionHierarchyChromeLabels = {
    allCollections: labels.collections,
    ariaLabel: "Browse collections by category",
    levelRoot: "Collection",
    levelUnder: "Under {parent}",
  };

  const handleChromeChange = useCallback(
    (slug: string | null) => {
      patchState({ collectionScope: slug, collections: [], page: 1 });
    },
    [patchState],
  );

  const resultsLabel =
    pagination.total === 0
      ? labels.noProducts
      : labels.resultsCount
          .replace("{first}", String(pagination.firstItem))
          .replace("{last}", String(pagination.lastItem))
          .replace("{total}", String(pagination.total));

  const filterLabels = {
    filters: labels.filters,
    clearAll: labels.clearAll,
    collections: labels.collections,
    category: labels.category,
    brand: labels.brand,
    tags: labels.tags,
    price: labels.price,
    variations: labels.variations,
    condition: labels.condition,
    availability: labels.availability,
    inStockOnly: labels.inStockOnly,
    priceFrom: labels.priceFrom,
    priceTo: labels.priceTo,
    priceRangeHint: labels.priceRangeHint,
    searchFiltersPlaceholder: labels.searchFiltersPlaceholder,
  };

  const numberLocale = locale === "ar" || locale.startsWith("ar") ? "ar-AE" : "en-US";

  const sidebar = (
    <aside
      className={`pl-sidebar${!pinnedSidebar && drawerOpen ? " pl-sidebar--drawer-open" : ""}${pinnedSidebar ? " pl-sidebar--pinned" : ""}`}
      aria-label={labels.filters}
    >
      <section className="pl-sidebar-chrome">
        {hierarchyCollections.length > 0 && hierarchyVariant === "sidebar" ? (
          <CollectionHierarchyChrome
            collections={hierarchyCollections}
            value={filterState.collectionScope}
            onChange={handleChromeChange}
            labels={hierarchyLabels ?? defaultHierarchyLabels}
            variant="sidebar"
          />
        ) : null}
        <div className="pl-filters-scroll">
          <ProductListingFilters
            facets={facetsForFilters}
            state={filterState}
            labels={filterLabels}
            activeFilterCount={activeCount}
            showCollectionsFacet={hierarchyCollections.length === 0 && !collectionScope}
            onClearAll={clearAll}
            onToggleCollection={(slug) =>
              patchState({ collections: toggleInList(filterState.collections, slug) })
            }
            onToggleCategory={(v) => patchState({ categories: toggleInList(filterState.categories, v) })}
            onToggleBrand={(v) => patchState({ brands: toggleInList(filterState.brands, v) })}
            onToggleTag={(v) => patchState({ tags: toggleInList(filterState.tags, v) })}
            onToggleCondition={(v) =>
              patchState({ conditions: toggleInList(filterState.conditions, v) })
            }
            onToggleVariation={(type, opt) =>
              patchState({ variations: toggleVariation(filterState.variations, type, opt) })
            }
            onStockChange={(checked) => patchState({ stockOnly: checked })}
            onPriceMinChange={(priceMin) => patchState({ priceMin })}
            onPriceMaxChange={(priceMax) => patchState({ priceMax })}
            showDrawerClose={!pinnedSidebar}
            onCloseDrawer={() => setDrawerOpen(false)}
          />
        </div>
      </section>
    </aside>
  );

  const isSearching = fuzzySearching || listingFetch.loading || pending;

  const searchField = (
    <form
      className="pl-search-form pl-catalog-toolbar__search"
      role="search"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="pl-search-field">
        <span className="pl-search-icon" aria-hidden="true">
          <IconSearch />
        </span>
        <input
          ref={catalogSearchInputRef}
          id="pl-catalog-search-input"
          type="text"
          role="searchbox"
          inputMode="search"
          enterKeyHint="search"
          className="pl-search-input"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder={labels.searchPlaceholder}
          autoComplete="off"
          aria-label={labels.searchPlaceholder}
        />
        {qInput.length > 0 ? (
          <button
            type="button"
            className="pl-search-clear"
            aria-label="Clear search"
            onClick={() => {
              resetSearchQuery();
              patchState({ q: "", page: 1 });
            }}
          >
            <IconClose />
          </button>
        ) : null}
      </div>
      {isSearching ? (
        <span className="pl-search-loading" aria-live="polite">
          <IconEllipsis />
        </span>
      ) : null}
    </form>
  );

  const viewSwitcher =
    viewModes.length > 1 ? (
      <div className="pl-catalog-view-group pl-view-switcher" role="group" aria-label="View mode">
        {viewModes.map((vm) => (
          <button
            key={vm}
            type="button"
            className={`pl-view-btn pl-catalog-control${viewMode === vm ? " pl-view-btn--active" : ""}`}
            onClick={() => setViewMode(vm)}
            aria-pressed={viewMode === vm}
            title={vm === "grid" ? "Grid view" : vm === "list" ? "List view" : "Table view"}
          >
            {viewModeIcon(vm)}
          </button>
        ))}
      </div>
    ) : null;

  const pgBtns = pageButtons(pagination.totalPages, state.page);

  const paginationNav =
    pagination.totalPages > 1 ? (
      <nav
        className={[
          "pl-pagination",
          "pl-catalog-pagination",
          dockEnabled ? "pl-catalog-pagination--compact-mobile" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Pagination"
      >
        <button
          type="button"
          className="pl-pg-btn"
          disabled={state.page <= 1}
          onClick={() => patchState({ page: state.page - 1 })}
        >
          {labels.prev}
        </button>
        <span className="pl-pg-summary" aria-live="polite">
          {state.page} / {pagination.totalPages}
        </span>
        <span className="pl-pg-pages">
          {pgBtns.map((b, i) =>
            b === "ellipsis" ? (
              <span key={`e-${i}`} className="pl-pg-ellipsis">
                <IconEllipsis />
              </span>
            ) : (
              <button
                key={b}
                type="button"
                className={`pl-pg-btn${b === state.page ? " pl-pg-btn--active" : ""}`}
                onClick={() => patchState({ page: b })}
                aria-current={b === state.page ? "page" : undefined}
              >
                {b}
              </button>
            ),
          )}
        </span>
        <button
          type="button"
          className="pl-pg-btn"
          disabled={state.page >= pagination.totalPages}
          onClick={() => patchState({ page: state.page + 1 })}
        >
          {labels.next}
        </button>
      </nav>
    ) : null;

  const gridBlock = (
    <ProductListingGrid
      products={pagination.items}
      localePrefix={locale}
      mode={mode}
      viewMode={viewMode}
      numberLocale={numberLocale}
      emptyMessage={labels.noProducts}
      cardLayoutCssVars={cardLayoutCssVars}
      buyNow={buyNow}
      quoteCta={quoteCta}
      cardLayout={cardLayout}
      collectionCardVariant={isCatalogLayout && isCollectionListing ? "catalog" : "default"}
      collectionViewLabel={catalogToolbarLabels?.viewCollection ?? "View"}
    />
  );

  if (!isCatalogLayout) {
    return null;
  }

  const rootClass = [
    "pl-root",
    "pl-root--catalog",
    "pl-root--collections-catalog",
    dockEnabled ? "pl-root--dock" : "",
    dockEnabled && !dockPanelOpen ? "pl-root--dock-collapsed" : "",
    drawerOpen && !pinnedSidebar ? "pl-root--filters-drawer-open" : "",
    "pl-root--sidebar-sticky",
    pinnedSidebar ? "pl-root--sidebar-pinned" : "",
    pending || listingFetch.loading ? "pl-root--pending" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showHierarchyInToolbar =
    isCollectionListing &&
    !collectionScope &&
    hierarchyCollections.length > 0 &&
    hierarchyVariant !== "sidebar" &&
    !(dockEnabled && pinnedSidebar);

  const catalogToolbar = (
    <div
      className={[
        "pl-catalog-toolbar",
        "pl-catalog-toolbar--bar",
        dockEnabled ? "pl-catalog-toolbar--dock pl-catalog-toolbar--compact" : "pl-catalog-toolbar--sticky",
        !dockEnabled && searchOpen ? "pl-catalog-toolbar--search-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showHierarchyInToolbar ? (
        <CollectionHierarchyChrome
          collections={hierarchyCollections}
          value={filterState.collectionScope}
          onChange={handleChromeChange}
          labels={hierarchyLabels ?? defaultHierarchyLabels}
          variant={hierarchyVariant === "select" ? "select" : hierarchyVariant === "tabs" ? "tabs" : "chrome"}
        />
      ) : null}
      <div className="pl-catalog-toolbar__row pl-catalog-toolbar__row--search">
        {dockEnabled ? (
          <div id="pl-catalog-search-expand" className="pl-catalog-toolbar__search-expand">
            {searchField}
          </div>
        ) : (
          searchField
        )}
        <div
          className={`pl-catalog-toolbar__actions${dockEnabled ? " pl-catalog-toolbar__actions--dock" : ""}`}
        >
          {!pinnedSidebar ? (
            <button
              type="button"
              className={`pl-catalog-btn pl-catalog-control pl-catalog-btn--primary${drawerOpen ? " pl-catalog-btn--active" : ""}`}
              onClick={() => setDrawerOpen((open) => !open)}
              aria-expanded={drawerOpen}
            >
              {labels.filtersFab}
              {activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
          ) : null}
          {isCollectionListing && catalogToolbarLabels ? (
            <div className="pl-catalog-toolbar__sort-wrap">
              <select
                className="pl-catalog-sort pl-catalog-control"
                value={catalogSort}
                aria-label={catalogToolbarLabels.sort}
                onChange={(e) => setCatalogSort(e.target.value as CatalogSortKey)}
              >
                <option value="name-asc">{catalogToolbarLabels.sortNameAsc}</option>
                <option value="name-desc">{catalogToolbarLabels.sortNameDesc}</option>
                <option value="items-desc">{catalogToolbarLabels.sortItemsDesc}</option>
              </select>
            </div>
          ) : null}
          {viewSwitcher}
        </div>
      </div>

      {chips.length > 0 && !dockEnabled ? (
        <section className="pl-active-bar pl-catalog-toolbar__chips" aria-label={labels.activeFilters}>
          <div className="pl-active-bar__chips">
            {chips.map((chip) => (
              <button key={chip.key} type="button" className="pl-active-chip" onClick={chip.onRemove}>
                {chip.label}{" "}
                <span className="pl-chip-x" aria-hidden="true">
                  <IconClose />
                </span>
              </button>
            ))}
          </div>
          <button type="button" className="pl-clear-all pl-clear-all--compact" onClick={clearAll}>
            {labels.clearAll}
          </button>
        </section>
      ) : null}

      <div className="pl-catalog-toolbar__meta">
        <span className="pl-results-count">{resultsLabel}</span>
        {dockEnabled ? paginationNav : null}
        <span className="pl-per-wrap">
          <span className="pl-per-label">{labels.showPer}</span>
          {LISTING_PER_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={`pl-per-btn${state.per === n ? " pl-per-btn--active" : ""}`}
              onClick={() => patchState({ per: n as ListingPerPage })}
            >
              {n}
            </button>
          ))}
        </span>
      </div>
    </div>
  );

  return (
    <div className={rootClass} style={dockStyle as CSSProperties | undefined} dir={pageDir}>
      <section className="pl-workspace">
        {!pinnedSidebar ? (
          <button
            type="button"
            className={`pl-filters-drawer-backdrop${drawerOpen ? " pl-filters-drawer-backdrop--visible" : ""}`}
            aria-label="Close filters"
            aria-hidden={!drawerOpen}
            tabIndex={drawerOpen ? 0 : -1}
            onClick={() => setDrawerOpen(false)}
          />
        ) : null}
        {sidebar}

        <div className="pl-main">
          <section className="pl-content">
            {!dockEnabled ? catalogToolbar : null}
            <div className="pl-catalog-grid-scroll">
              <section className="pl-catalog-grid-wrap">
                {gridBlock}
                {!dockEnabled ? paginationNav : null}
              </section>
            </div>
          </section>

          {dockEnabled ? (
            <div
              id="pl-catalog-dock-panel"
              className="pl-catalog-dock pl-catalog-dock--bottom"
              role="region"
              aria-label={labels.searchPlaceholder}
              data-dock-open={dockPanelOpen ? "true" : "false"}
            >
              <button
                type="button"
                className="pl-dock-panel-toggle"
                onClick={() => setDockPanelOpen((open) => !open)}
                aria-expanded={dockPanelOpen}
                aria-controls="pl-catalog-dock-panel"
                aria-label={dockPanelOpen ? "Collapse panel" : "Expand panel"}
              >
                <IconChevron up={dockPanelOpen} />
              </button>
              {catalogToolbar}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
