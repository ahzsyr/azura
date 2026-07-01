"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { collectionMapFromList } from "@/features/collections/collection-navigation";
import type { Collection } from "@/features/collections/types";
import {
  CollectionHierarchyChrome,
  type CollectionHierarchyChromeLabels,
} from "@/features/collections/components/collection-hierarchy-chrome";
import type { CatalogListingViewMode } from "@/features/catalog/lib/catalog-layout";
import { CatalogContentLayout } from "@/features/catalog/components/catalog-content-layout";
import type { ResolvedCatalogToolbarDock } from "@/features/catalog/lib/catalog-layout";
import { catalogToolbarDockCssVars } from "@/features/catalog/lib/catalog-layout";
import { aggregateFacets } from "@/features/products/listing/aggregate-facets";
import { filterListingCatalog, paginateListing } from "@/features/products/listing/filter";
import type { ListingFacets, ListingFilterState, ProductListingRecord } from "@/features/products/listing/types";
import {
  countActiveFilters,
  filterStateFromSearchParams,
  listingFilterStateKey,
  searchParamsFromFilterState,
} from "@/features/products/listing/url-state";
import { safeAppRouterNavigate } from "@/lib/navigation/safe-app-router";
import { LISTING_PER_OPTIONS, type ListingPerPage } from "@/features/products/listing/types";
import { fuzzyMatchListingSlugs } from "@/features/products/listing/search";
import { trackListingSearchAnalytics } from "@/capabilities/search/analytics/search-analytics.client";
import { useCatalogListingFetch } from "@/features/products/listing/use-catalog-listing-fetch";
import { useDebouncedValueWithFlush } from "@/hooks/use-debounced-value";
import {
  toProductListingRecord,
  type CatalogInteractiveDataset,
} from "@/features/products/listing/interactive-records";
import { createClientSearchIndex } from "@/features/products/listing/client-search-index";
import type {
  CatalogToolbarLabels,
  ProductListingLabels,
} from "@/features/products/listing/listing-labels";
import { ProductListingFilters } from "./listing/product-listing-filters";
import { ProductListingGrid } from "./listing/product-listing-grid";
import { ProductCardThemeProvider } from "./listing/product-card-theme-context";
import {
  productCardThemeFromLegacyProps,
  type ProductCardTheme,
} from "@/features/products/lib/product-card-theme";
import {
  IconClose,
  IconEllipsis,
  IconSearch,
  viewModeIcon,
} from "./listing/listing-ui-icons";
import { getNumberLocale } from "@/shared/layout/direction/direction-utils";
import type { LayoutDirection } from "@/shared/layout/direction/direction-types";

const MOBILE_DOCK_MQ = "(max-width: 639px)";
const DESKTOP_DEFAULT_PER: ListingPerPage = 20;
const DEFAULT_SEARCH_DEBOUNCE_MS = 250;
const URL_QUERY_SETTLE_SYNC_MS = 1200;
const INTERACTIVE_PRODUCT_THRESHOLD_DEFAULT = Number(
  process.env.NEXT_PUBLIC_CATALOG_CLIENT_MAX_PRODUCTS ?? 5000
);
const INTERACTIVE_PAYLOAD_THRESHOLD_MB_DEFAULT = Number(
  process.env.NEXT_PUBLIC_CATALOG_CLIENT_MAX_PAYLOAD_MB ?? 5
);
const INTERACTIVE_PRODUCT_THRESHOLD_PRODUCTS = Number(
  process.env.NEXT_PUBLIC_CATALOG_CLIENT_MAX_PRODUCTS_PRODUCTS ??
    INTERACTIVE_PRODUCT_THRESHOLD_DEFAULT
);
const INTERACTIVE_PRODUCT_THRESHOLD_COLLECTIONS = Number(
  process.env.NEXT_PUBLIC_CATALOG_CLIENT_MAX_PRODUCTS_COLLECTIONS ??
    INTERACTIVE_PRODUCT_THRESHOLD_DEFAULT
);
const INTERACTIVE_PAYLOAD_THRESHOLD_MB_PRODUCTS = Number(
  process.env.NEXT_PUBLIC_CATALOG_CLIENT_MAX_PAYLOAD_MB_PRODUCTS ??
    INTERACTIVE_PAYLOAD_THRESHOLD_MB_DEFAULT
);
const INTERACTIVE_PAYLOAD_THRESHOLD_MB_COLLECTIONS = Number(
  process.env.NEXT_PUBLIC_CATALOG_CLIENT_MAX_PAYLOAD_MB_COLLECTIONS ??
    INTERACTIVE_PAYLOAD_THRESHOLD_MB_DEFAULT
);
const INTERACTIVE_ENABLED = process.env.NEXT_PUBLIC_CATALOG_CLIENT_INTERACTIVE === "true";
const SHADOW_ENABLED = process.env.NEXT_PUBLIC_CATALOG_CLIENT_SHADOW === "true";
const INTERACTIVE_DEBUG = process.env.NEXT_PUBLIC_CATALOG_INTERACTIVE_DEBUG === "true";

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
  productCta?: import("@/features/products/lib/product-cta").ResolvedProductCtaConfig;
  cardLayout?: import("@/features/products/lib/product-storefront-layout").ResolvedProductCardLayout;
  pageDisplay?: import("@/features/products/lib/product-page-display").ResolvedProductPageDisplay;
  cardTheme?: ProductCardTheme;
  catalogToolbarDock?: ResolvedCatalogToolbarDock;
  pageDir?: LayoutDirection;
  /** When true, records are pre-filtered/paginated on the server; URL changes trigger RSC refresh. */
  serverPaginated?: boolean;
  total?: number;
  totalPages?: number;
  /** When true, skip the first client listing fetch (SSR already supplied data). */
  hasInitialPayload?: boolean;
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

function facetSignature(facets: ListingFacets): string {
  const key = (items: Array<{ value: string; count: number }>) =>
    items.map((i) => `${i.value}:${i.count}`).join("|");
  const vars = Object.entries(facets.variations)
    .map(([k, v]) => `${k}=${key(v)}`)
    .sort()
    .join(";");
  return [
    key(facets.collections),
    key(facets.categories),
    key(facets.brands),
    key(facets.tags),
    key(facets.conditions),
    vars,
    String(facets.priceMin),
    String(facets.priceMax),
    facets.currency,
  ].join("||");
}

function logInteractiveMetric(
  message: string,
  extra?: Record<string, unknown>
) {
  if (!INTERACTIVE_DEBUG) return;
  const details = extra ? ` ${JSON.stringify(extra)}` : "";
  console.info(`[catalog-interactive] ${message}${details}`);
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
  searchDebounceMs = DEFAULT_SEARCH_DEBOUNCE_MS,
  searchFuzziness = 0.35,
  defaultViewMode = "grid",
  viewModes = ["grid", "list", "table"],
  labels,
  catalogToolbarLabels,
  cardLayoutCssVars,
  buyNow,
  productCta,
  cardLayout,
  pageDisplay,
  cardTheme: cardThemeProp,
  catalogToolbarDock,
  pageDir = "ltr",
  serverPaginated = false,
  total: totalProp,
  totalPages: totalPagesProp,
  hasInitialPayload = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const cardTheme = useMemo(
    () =>
      cardThemeProp ??
      productCardThemeFromLegacyProps({
        cardLayout,
        cardLayoutCssVars,
        pageDisplay,
        buyNow,
        productCta,
      }),
    [cardThemeProp, cardLayout, cardLayoutCssVars, pageDisplay, buyNow, productCta],
  );

  const dock = catalogToolbarDock;
  const dockEnabled = dock?.enabled !== false;
  const dockStyle = dock ? catalogToolbarDockCssVars(dock) : undefined;
  const isCatalogLayout =
    layoutVariant === "catalog" || layoutVariant === "collections-catalog";
  const mode = listingMode;
  const isCollectionListing = mode === "collection";

  const [pinnedSidebar, setPinnedSidebar] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dockPanelOpen, setDockPanelOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 640px)").matches;
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [qInput, setQInput] = useState("");
  const [debouncedQ, flushDebouncedQ] = useDebouncedValueWithFlush(qInput.trim(), searchDebounceMs);
  const [fuzzySearching, setFuzzySearching] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [catalogSort, setCatalogSort] = useState<CatalogSortKey>("name-asc");
  const fuzzySlugsRef = useRef<Set<string> | undefined>(undefined);
  const [fuzzyVersion, setFuzzyVersion] = useState(0);
  const catalogSearchInputRef = useRef<HTMLInputElement>(null);
  const [interactiveDataset, setInteractiveDataset] = useState<CatalogInteractiveDataset | null>(null);
  const [interactiveLoading, setInteractiveLoading] = useState(false);
  const interactiveFetchRef = useRef<AbortController | null>(null);
  const interactiveEnabledForPage = INTERACTIVE_ENABLED && serverPaginated;
  const shadowEnabledForPage = SHADOW_ENABLED && serverPaginated;

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
    const scoped = parsed.collectionScope?.trim() || null;
    const hasValidScope = scoped ? scopeBySlug.has(scoped) : false;
    const validCollections = parsed.collections.filter((slug) => scopeBySlug.has(slug));
    const sanitized: ListingFilterState = {
      ...parsed,
      collectionScope: hasValidScope ? scoped : null,
      collections: hasValidScope ? [] : validCollections,
    };
    if (collectionScope) {
      return { ...sanitized, collectionScope, collections: [] };
    }
    return sanitized;
  }, [searchParams, collectionScope, scopeBySlug]);

  useEffect(() => {
    setQInput(state.q);
    flushDebouncedQ(state.q.trim());
  }, [state.q, flushDebouncedQ]);

  useEffect(() => {
    if (!interactiveEnabledForPage && !shadowEnabledForPage) return;
    if (interactiveDataset || interactiveLoading) return;

    const params = new URLSearchParams({ locale, interactive: "1" });
    if (mode === "collection") params.set("mode", "collection");
    if (mode === "product" && collectionScope?.trim()) {
      params.set("collection", collectionScope.trim());
    }

    interactiveFetchRef.current?.abort();
    const controller = new AbortController();
    interactiveFetchRef.current = controller;
    setInteractiveLoading(true);
    const started = performance.now();

    void fetch(`/api/catalog/listing?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Interactive dataset failed (${res.status})`);
        return (await res.json()) as CatalogInteractiveDataset;
      })
      .then((payload) => {
        if (interactiveFetchRef.current !== controller) return;
        setInteractiveDataset(payload);
        logInteractiveMetric("dataset-loaded", {
          mode,
          collectionScope,
          total: payload.total,
          payloadMb: payload.meta.payloadMb,
          loadMs: Math.round(performance.now() - started),
        });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        logInteractiveMetric("dataset-load-error", {
          message: err instanceof Error ? err.message : "unknown",
          mode,
          collectionScope,
        });
      })
      .finally(() => {
        if (interactiveFetchRef.current === controller) {
          setInteractiveLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    collectionScope,
    interactiveDataset,
    interactiveEnabledForPage,
    interactiveLoading,
    locale,
    mode,
    shadowEnabledForPage,
  ]);

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

  const interactiveEligible = useMemo(() => {
    if (!interactiveDataset) return false;
    const productThreshold =
      mode === "collection"
        ? INTERACTIVE_PRODUCT_THRESHOLD_COLLECTIONS
        : INTERACTIVE_PRODUCT_THRESHOLD_PRODUCTS;
    const payloadThresholdMb =
      mode === "collection"
        ? INTERACTIVE_PAYLOAD_THRESHOLD_MB_COLLECTIONS
        : INTERACTIVE_PAYLOAD_THRESHOLD_MB_PRODUCTS;
    return (
      interactiveDataset.total < productThreshold &&
      interactiveDataset.meta.payloadMb < payloadThresholdMb
    );
  }, [interactiveDataset, mode]);

  const runClientInteractive =
    interactiveEnabledForPage && interactiveEligible && interactiveDataset != null;
  const effectiveServerPaginated = serverPaginated && !runClientInteractive;

  const interactiveRecords = useMemo(
    () =>
      interactiveDataset
        ? interactiveDataset.records.map(toProductListingRecord)
        : null,
    [interactiveDataset]
  );

  const baseRecordsForFiltering = runClientInteractive ? interactiveRecords ?? records : records;
  const clientSearchIndex = useMemo(
    () =>
      runClientInteractive && interactiveDataset
        ? createClientSearchIndex(interactiveDataset.records)
        : null,
    [interactiveDataset, runClientInteractive]
  );
  const shadowSearchIndex = useMemo(
    () =>
      shadowEnabledForPage && interactiveDataset
        ? createClientSearchIndex(interactiveDataset.records)
        : null,
    [interactiveDataset, shadowEnabledForPage]
  );

  useEffect(() => {
    if (effectiveServerPaginated) return;
    const q = debouncedQ;
    if (!q) {
      fuzzySlugsRef.current = undefined;
      setFuzzySearching(false);
      setFuzzyVersion((v) => v + 1);
      return;
    }
    setFuzzySearching(true);
    void fuzzyMatchListingSlugs(baseRecordsForFiltering, q, searchFuzziness).then((set) => {
      fuzzySlugsRef.current = set.size > 0 ? set : undefined;
      setFuzzySearching(false);
      setFuzzyVersion((v) => v + 1);
    });
  }, [baseRecordsForFiltering, debouncedQ, effectiveServerPaginated, searchFuzziness]);

  const currentFilterKey = useMemo(() => listingFilterStateKey(state), [state]);
  const replaceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const replaceStateNow = useCallback(
    (next: ListingFilterState, _source = "unknown") => {
      const nextKey = listingFilterStateKey(next);
      if (nextKey === currentFilterKey) return;
      const href = searchParamsFromFilterState(next, pathname);
      safeAppRouterNavigate(router, href, { replace: true, scroll: false });
    },
    [currentFilterKey, pathname, router],
  );

  const replaceState = useCallback(
    (next: ListingFilterState, source = "unknown") => {
      if (replaceTimerRef.current) clearTimeout(replaceTimerRef.current);
      replaceTimerRef.current = setTimeout(() => {
        replaceStateNow(next, source);
        replaceTimerRef.current = null;
      }, 75);
    },
    [replaceStateNow],
  );

  useEffect(
    () => () => {
      if (replaceTimerRef.current) clearTimeout(replaceTimerRef.current);
    },
    [],
  );

  const patchState = useCallback(
    (patch: Partial<ListingFilterState>, source = "unknown") => {
      replaceState({ ...state, ...patch, page: patch.page ?? 1 }, source);
    },
    [replaceState, state],
  );

  useEffect(() => {
    const trimmed = debouncedQ;
    if (trimmed === state.q.trim()) return;
    const timer = setTimeout(() => {
      replaceState({ ...state, q: trimmed, page: 1 }, "settled-search-sync");
    }, URL_QUERY_SETTLE_SYNC_MS);
    return () => clearTimeout(timer);
  }, [debouncedQ, replaceState, state]);

  useEffect(() => {
    if (!dockEnabled || hasInitialPayload) return;
    const mq = window.matchMedia(MOBILE_DOCK_MQ);
    const syncPer = () => {
      if (mq.matches) {
        if (state.per !== 10) patchState({ per: 10, page: 1 }, "syncPer-mobile");
        return;
      }
      if (state.per === 10) patchState({ per: DESKTOP_DEFAULT_PER, page: 1 }, "syncPer-desktop");
    };
    syncPer();
    mq.addEventListener("change", syncPer);
    return () => mq.removeEventListener("change", syncPer);
  }, [dockEnabled, hasInitialPayload, patchState, state.per]);

  useEffect(() => {
    if (!dockEnabled) return;
    const mq = window.matchMedia("(min-width: 640px)");
    const keepOpenOnDesktop = () => {
      if (mq.matches) setDockPanelOpen(true);
    };
    keepOpenOnDesktop();
    mq.addEventListener("change", keepOpenOnDesktop);
    return () => mq.removeEventListener("change", keepOpenOnDesktop);
  }, [dockEnabled]);

  const pendingFilterState = useMemo(
    () => ({ ...state, q: debouncedQ }),
    [state, debouncedQ],
  );

  const listingFetch = useCatalogListingFetch({
    locale,
    filterState: pendingFilterState,
    listingMode: mode,
    collectionSlug: collectionScope ?? null,
    enabled: effectiveServerPaginated,
    initialRecords: records,
    initialFacets: facetsProp,
    initialTotal: totalProp ?? records.length,
    initialTotalPages: totalPagesProp ?? Math.max(1, Math.ceil((totalProp ?? records.length) / state.per)),
    hasInitialPayload,
  });

  const displayRecords = effectiveServerPaginated
    ? listingFetch.records
    : baseRecordsForFiltering;
  const displayFacets = effectiveServerPaginated
    ? listingFetch.facets
    : interactiveDataset?.facets ?? facetsProp;
  const displayTotal = effectiveServerPaginated
    ? listingFetch.total
    : interactiveDataset?.total;
  const displayTotalPages = effectiveServerPaginated
    ? listingFetch.totalPages
    : interactiveDataset?.totalPages;

  useEffect(() => {
    const q = debouncedQ.trim();
    if (q.length < 2) return;
    const resultCount = effectiveServerPaginated
      ? (listingFetch.total ?? 0)
      : baseRecordsForFiltering.filter((r) => r.searchText.includes(q.toLowerCase())).length;
    trackListingSearchAnalytics({ locale, q, resultCount });
  }, [baseRecordsForFiltering, debouncedQ, effectiveServerPaginated, listingFetch.total, locale]);

  const resetSearchQuery = useCallback(() => {
    setQInput("");
    flushDebouncedQ("");
    fuzzySlugsRef.current = undefined;
    setFuzzyVersion((v) => v + 1);
    listingFetch.abort();
  }, [flushDebouncedQ, listingFetch.abort]);

  const commitSearchQueryNow = useCallback(() => {
    const trimmed = qInput.trim();
    flushDebouncedQ(trimmed);
    replaceState({ ...state, q: trimmed, page: 1 }, "search-commit");
  }, [flushDebouncedQ, qInput, replaceState, state]);

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
    if (effectiveServerPaginated) return displayFacets;
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
    effectiveServerPaginated,
    displayFacets,
  ]);

  const filtered = useMemo(() => {
    if (effectiveServerPaginated) return displayRecords;
    void fuzzyVersion;
    const tokenHits = clientSearchIndex?.query(clientFilterState.q);
    const quickSearchHits = (() => {
      if (!tokenHits?.size && !fuzzySlugsRef.current?.size) return undefined;
      const merged = new Set<string>();
      for (const slug of tokenHits ?? []) merged.add(slug);
      for (const slug of fuzzySlugsRef.current ?? []) merged.add(slug);
      return merged.size ? merged : undefined;
    })();
    return filterListingCatalog(displayRecords, clientFilterState, quickSearchHits, filterOptions);
  }, [
    displayRecords,
    clientFilterState,
    fuzzyVersion,
    filterOptions,
    effectiveServerPaginated,
    clientSearchIndex,
  ]);

  const sortedFiltered = useMemo(() => {
    if (effectiveServerPaginated) return filtered;
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
  }, [filtered, isCatalogLayout, catalogSort, effectiveServerPaginated]);

  const listForPagination = isCatalogLayout ? sortedFiltered : filtered;

  const pagination = useMemo(() => {
    if (effectiveServerPaginated) {
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
    effectiveServerPaginated,
    displayRecords,
    displayTotal,
    displayTotalPages,
  ]);

  useEffect(() => {
    if (!shadowEnabledForPage || !effectiveServerPaginated || !interactiveRecords || !shadowSearchIndex) {
      return;
    }
    const tokenHits = shadowSearchIndex.query(clientFilterState.q) ?? undefined;
    const shadowFiltered = filterListingCatalog(
      interactiveRecords,
      clientFilterState,
      tokenHits,
      filterOptions
    );
    const shadowPagination = paginateListing(shadowFiltered, state.page, state.per);
    const shadowFacets = aggregateFacets(shadowFiltered, hierarchyAsLocalized);
    const serverFacetSig = facetSignature(listingFetch.facets);
    const shadowFacetSig = facetSignature(shadowFacets);
    const serverSlugs = listingFetch.records.map((r) => r.slug).join("|");
    const shadowSlugs = shadowPagination.items.map((r) => r.slug).join("|");
    const mismatch =
      shadowPagination.total !== (listingFetch.total ?? 0) ||
      shadowPagination.totalPages !== (listingFetch.totalPages ?? 1) ||
      serverFacetSig !== shadowFacetSig ||
      serverSlugs !== shadowSlugs;
    if (!mismatch) return;
    logInteractiveMetric("shadow-mismatch", {
      stateKey: listingFilterStateKey(clientFilterState),
      mode,
      serverCount: listingFetch.total,
      clientCount: shadowPagination.total,
      serverPages: listingFetch.totalPages,
      clientPages: shadowPagination.totalPages,
      facetDiffSummary: serverFacetSig === shadowFacetSig ? "match" : "diff",
      sampleSlugDiff: `${serverSlugs.slice(0, 120)} :: ${shadowSlugs.slice(0, 120)}`,
    });
  }, [
    clientFilterState,
    effectiveServerPaginated,
    filterOptions,
    hierarchyAsLocalized,
    interactiveRecords,
    listingFetch.facets,
    listingFetch.records,
    listingFetch.total,
    listingFetch.totalPages,
    mode,
    shadowEnabledForPage,
    shadowSearchIndex,
    state.page,
    state.per,
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

  const resultsCountTemplate =
    typeof labels.resultsCount === "string"
      ? labels.resultsCount
      : "{first}–{last} of {total} items";
  const resultsLabel =
    pagination.total === 0
      ? labels.noProducts
      : resultsCountTemplate
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

  const numberLocale = getNumberLocale(locale);

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
            dir={pageDir}
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

  const isSearching = fuzzySearching || listingFetch.loading || interactiveLoading;

  const searchField = (
    <form
      className="pl-search-form pl-catalog-toolbar__search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        commitSearchQueryNow();
      }}
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
          onBlur={commitSearchQueryNow}
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

  const gridBlock =
    listingFetch.loading && pagination.items.length === 0 ? (
      <RouteSuspenseFallback variant="grid" />
    ) : (
      <ProductListingGrid
        products={pagination.items}
        localePrefix={locale}
        mode={mode}
        viewMode={viewMode}
        numberLocale={numberLocale}
        emptyMessage={labels.noProducts}
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
    listingFetch.loading ? "pl-root--pending" : "",
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
          dir={pageDir}
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
    <ProductCardThemeProvider theme={cardTheme}>
      <div className={rootClass} style={dockStyle as CSSProperties | undefined} dir={pageDir}>
        <CatalogContentLayout
          dir={pageDir}
          sidebar={sidebar}
          backdrop={
            !pinnedSidebar ? (
              <button
                type="button"
                className={`pl-filters-drawer-backdrop${drawerOpen ? " pl-filters-drawer-backdrop--visible" : ""}`}
                aria-label="Close filters"
                aria-hidden={!drawerOpen}
                tabIndex={drawerOpen ? 0 : -1}
                onClick={() => setDrawerOpen(false)}
              />
            ) : null
          }
          dock={
            dockEnabled ? (
            <div
              id="pl-catalog-dock-panel"
              className="pl-catalog-dock pl-catalog-dock--bottom"
              role="region"
              aria-label={labels.searchPlaceholder}
              data-dock-open={dockPanelOpen ? "true" : "false"}
            >
              <div className="pl-catalog-dock-shell">
                <div className="pl-catalog-dock-header">
                  <button
                    type="button"
                    className="pl-dock-panel-toggle"
                    onClick={() => setDockPanelOpen((open) => !open)}
                    aria-expanded={dockPanelOpen}
                    aria-controls="pl-catalog-dock-content"
                    aria-label={dockPanelOpen ? "Collapse panel" : "Expand panel"}
                  >
                    <span className="pl-dock-panel-handle" aria-hidden="true" />
                  </button>
                </div>
                <div
                  id="pl-catalog-dock-content"
                  className="pl-catalog-dock-content"
                  aria-hidden={!dockPanelOpen}
                >
                  {catalogToolbar}
                </div>
              </div>
            </div>
            ) : null
          }
        >
          {!dockEnabled ? catalogToolbar : null}
          <div className="pl-catalog-grid-scroll">
            <section className="pl-catalog-grid-wrap">
              {gridBlock}
              {!dockEnabled ? paginationNav : null}
            </section>
          </div>
        </CatalogContentLayout>
      </div>
    </ProductCardThemeProvider>
  );
}
