"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompareDrawerBucket } from "@/features/comparison/components/comparison-drawer";
import {
  COMPARE_CHANGED_EVENT,
  clearCompareList,
  getCompareStore,
} from "@/features/comparison/comparison-store";

type UseCompareDrawerBucketsReturn = {
  buckets: CompareDrawerBucket[];
  totalCount: number;
  refresh: () => void;
  clearAll: () => void;
};

export function useCompareDrawerBuckets(): UseCompareDrawerBucketsReturn {
  const [buckets, setBuckets] = useState<CompareDrawerBucket[]>([]);

  const refresh = useCallback(() => {
    const store = getCompareStore();
    setBuckets(
      Object.entries(store)
        .filter(([, ids]) => ids.length > 0)
        .map(([contentTypeSlug, itemIds]) => ({
          contentTypeSlug,
          itemIds,
          count: itemIds.length,
        }))
    );
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(COMPARE_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(COMPARE_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const clearAll = useCallback(() => {
    clearCompareList();
    refresh();
  }, [refresh]);

  const totalCount = buckets.reduce((n, b) => n + b.count, 0);

  return { buckets, totalCount, refresh, clearAll };
}
