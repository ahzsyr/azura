"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ListingFacets, ListingFilterState, ProductListingCatalogPayload, ProductListingRecord } from "./types";
import { filterStateToApiSearchParams } from "./url-state";

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
  return `/api/catalog/listing?${params.toString()}`;
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
}: UseCatalogListingFetchOptions): CatalogListingFetchState {
  const [records, setRecords] = useState(initialRecords);
  const [facets, setFacets] = useState(initialFacets);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setRecords(initialRecords);
    setFacets(initialFacets);
    setTotal(initialTotal);
    setTotalPages(initialTotalPages);
  }, [initialRecords, initialFacets, initialTotal, initialTotalPages]);

  useEffect(() => {
    if (!enabled) return;

    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const url = buildListingApiUrl(locale, filterState, listingMode, collectionSlug);

    void fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Listing fetch failed");
        return res.json() as Promise<ProductListingCatalogPayload>;
      })
      .then((payload) => {
        if (requestId !== requestIdRef.current) return;
        setRecords(payload.records);
        setFacets(payload.facets);
        setTotal(payload.total ?? payload.records.length);
        setTotalPages(
          payload.totalPages ?? Math.max(1, Math.ceil((payload.total ?? payload.records.length) / filterState.per)),
        );
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [enabled, locale, filterState, listingMode, collectionSlug]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  return { records, facets, total, totalPages, loading, abort };
}
