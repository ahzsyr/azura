"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ListingFacets, ListingFilterState, ProductListingCatalogPayload, ProductListingRecord } from "./types";
import { SEARCH_SEMANTIC_VERSION_KEY } from "@/features/search/core/text";
import {
  countActiveFilters,
  filterStateToApiSearchParams,
  isUnfilteredListingView,
  listingFilterStateKey,
} from "./url-state";

const listingResponseCache = new Map<string, ProductListingCatalogPayload>();
const MAX_LISTING_CACHE_ENTRIES = 50;

export type UseCatalogListingFetchOptions = {
  locale: string;
  filterState: ListingFilterState;
  listingMode: "product" | "collection";
  /** When set, scopes product listing to this collection slug. */
  collectionSlug?: string | null;
  enabled: boolean;
  initialRecords: ProductListingRecord[];
  initialFacets: ListingFacets;
  initialTotal: number;
  initialTotalPages: number;
  /** When true, skip the mount fetch if filter state is still the default. */
  hasInitialPayload?: boolean;
};

export type CatalogListingFetchState = {
  records: ProductListingRecord[];
  facets: ListingFacets;
  total: number;
  totalPages: number;
  loading: boolean;
  abort: () => void;
};

function buildListingApiUrl(
  locale: string,
  filterState: ListingFilterState,
  listingMode: "product" | "collection",
  collectionSlug?: string | null,
): string {
  const params = filterStateToApiSearchParams(filterState);
  params.set("locale", locale);
  if (listingMode === "collection") {
    params.set("mode", "collection");
  } else if (collectionSlug?.trim()) {
    params.set("collection", collectionSlug.trim());
  }
  params.set("__semantic", SEARCH_SEMANTIC_VERSION_KEY);
  return `/api/catalog/listing?${params.toString()}`;
}

function rememberListingPayload(url: string, payload: ProductListingCatalogPayload): void {
  if (payload.records.length === 0) return;
  listingResponseCache.set(url, payload);
  if (listingResponseCache.size <= MAX_LISTING_CACHE_ENTRIES) return;
  const oldest = listingResponseCache.keys().next().value;
  if (oldest) listingResponseCache.delete(oldest);
}

function shouldKeepExistingRecords(
  payload: ProductListingCatalogPayload,
  existingRecords: ProductListingRecord[],
  filterState: ListingFilterState,
  hasInitialPayload: boolean,
): boolean {
  if (payload.records.length > 0 || existingRecords.length === 0) return false;
  if (!hasInitialPayload) return countActiveFilters(filterState) === 0;
  return isUnfilteredListingView(filterState);
}

async function fetchListingPayload(url: string, signal: AbortSignal): Promise<ProductListingCatalogPayload> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Listing fetch failed");
  return res.json() as Promise<ProductListingCatalogPayload>;
}

export function useCatalogListingFetch({
  locale,
  filterState,
  listingMode,
  collectionSlug,
  enabled,
  initialRecords,
  initialFacets,
  initialTotal,
  initialTotalPages,
  hasInitialPayload = false,
}: UseCatalogListingFetchOptions): CatalogListingFetchState {
  const [records, setRecords] = useState(initialRecords);
  const [facets, setFacets] = useState(initialFacets);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(
    () => enabled && initialRecords.length === 0 && isUnfilteredListingView(filterState),
  );
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const lastUrlRef = useRef<string | null>(null);
  const skippedInitialRef = useRef(
    hasInitialPayload && initialRecords.length > 0 && isUnfilteredListingView(filterState),
  );
  const lastGoodRecordsRef = useRef(initialRecords);

  useEffect(() => {
    setRecords(initialRecords);
    setFacets(initialFacets);
    setTotal(initialTotal);
    setTotalPages(initialTotalPages);
    if (initialRecords.length > 0) {
      lastGoodRecordsRef.current = initialRecords;
    }
  }, [initialRecords, initialFacets, initialTotal, initialTotalPages]);

  const filterKey = listingFilterStateKey(filterState);

  useEffect(() => {
    if (!enabled) return;

    if (
      skippedInitialRef.current &&
      isUnfilteredListingView(filterState)
    ) {
      skippedInitialRef.current = false;
      return;
    }

    const url = buildListingApiUrl(locale, filterState, listingMode, collectionSlug);
    if (url === lastUrlRef.current) return;
    lastUrlRef.current = url;

    const cached = listingResponseCache.get(url);
    if (cached && cached.records.length > 0) {
      setRecords(cached.records);
      setFacets(cached.facets);
      setTotal(cached.total ?? cached.records.length);
      setTotalPages(
        cached.totalPages ?? Math.max(1, Math.ceil((cached.total ?? cached.records.length) / filterState.per)),
      );
      lastGoodRecordsRef.current = cached.records;
    }

    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    void (async () => {
      try {
        let payload = await fetchListingPayload(url, controller.signal);
        if (
          payload.records.length === 0 &&
          isUnfilteredListingView(filterState)
        ) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          if (requestId !== requestIdRef.current) return;
          payload = await fetchListingPayload(url, controller.signal);
        }

        if (requestId !== requestIdRef.current) return;

        const fallbackRecords =
          lastGoodRecordsRef.current.length > 0
            ? lastGoodRecordsRef.current
            : initialRecords;

        if (shouldKeepExistingRecords(payload, fallbackRecords, filterState, hasInitialPayload)) {
          return;
        }

        setRecords(payload.records);
        setFacets(payload.facets);
        setTotal(payload.total ?? payload.records.length);
        setTotalPages(
          payload.totalPages ??
            Math.max(1, Math.ceil((payload.total ?? payload.records.length) / filterState.per)),
        );
        if (payload.records.length > 0) {
          lastGoodRecordsRef.current = payload.records;
          rememberListingPayload(url, payload);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [enabled, locale, filterKey, listingMode, collectionSlug, filterState, hasInitialPayload, initialRecords]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  return { records, facets, total, totalPages, loading, abort };
}
