"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductListingRecord } from "@/features/products/listing/types";

export type ShowcaseTabFetchState = {
  records: ProductListingRecord[];
  total: number;
  totalPages: number;
  loading: boolean;
};

function buildShowcaseUrl(
  locale: string,
  taxonomy: "category" | "brand",
  key: string,
  limit: number,
  sort: string,
  page: number,
): string {
  const params = new URLSearchParams({
    locale,
    taxonomy,
    key,
    limit: String(limit),
    sort,
    page: String(page),
  });
  return `/api/catalog/showcase?${params.toString()}`;
}

export function useShowcaseTabFetch({
  locale,
  taxonomy,
  tabKey,
  limit,
  sort,
  enabled,
  initialRecords,
  initialTotal,
}: {
  locale: string;
  taxonomy: "category" | "brand";
  tabKey: string;
  limit: number;
  sort: string;
  enabled: boolean;
  initialRecords: ProductListingRecord[];
  initialTotal: number;
}): ShowcaseTabFetchState {
  const [records, setRecords] = useState(initialRecords);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(Math.max(1, Math.ceil(initialTotal / limit)));
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setRecords(initialRecords);
    setTotal(initialTotal);
    setTotalPages(Math.max(1, Math.ceil(initialTotal / limit)));
  }, [initialRecords, initialTotal, limit]);

  const fetchTab = useCallback(() => {
    if (!enabled || !tabKey.trim()) return;

    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    fetch(buildShowcaseUrl(locale, taxonomy, tabKey, limit, sort, 1), {
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.json() as Promise<{
          records: ProductListingRecord[];
          total: number;
          totalPages: number;
        }>;
      })
      .then((payload) => {
        if (requestId !== requestIdRef.current) return;
        setRecords(payload.records);
        setTotal(payload.total);
        setTotalPages(payload.totalPages);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  }, [enabled, tabKey, locale, taxonomy, limit, sort]);

  useEffect(() => {
    fetchTab();
    return () => abortRef.current?.abort();
  }, [fetchTab]);

  return { records, total, totalPages, loading };
}
