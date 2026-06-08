"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import type { ComparableTypeMeta } from "@/features/comparison/types";
import {
  COMPARE_CHANGED_EVENT,
  clearCompareList,
  getCompareStore,
} from "@/features/comparison/comparison-store";
import type { CompareDrawerBucket } from "@/features/comparison/components/comparison-drawer";
import { buildComparableTypeBySlugMap } from "@/features/comparison/resolve-comparable-type";
import "@/features/comparison/comparison-shell.css";

const ComparisonDrawer = dynamic(
  () =>
    import("@/features/comparison/components/comparison-drawer").then(
      (m) => m.ComparisonDrawer,
    ),
  { ssr: false },
);

type ComparisonContextValue = {
  comparableTypes: ComparableTypeMeta[];
  refresh: () => void;
};

const ComparisonContext = createContext<ComparisonContextValue | null>(null);

export function useComparison() {
  const ctx = useContext(ComparisonContext);
  if (!ctx) throw new Error("useComparison must be used within ComparisonProvider");
  return ctx;
}

export function useComparisonOptional() {
  return useContext(ComparisonContext);
}

type Props = {
  locale: string;
  comparableTypes: ComparableTypeMeta[];
  labels: {
    drawerTitle: string;
    compareNow: string;
    clearAll: string;
    empty: string;
    remove: string;
    addMore: string;
    clearBucket: string;
    close: string;
    viewComparison: string;
  };
  children: React.ReactNode;
};

export function ComparisonProvider({ locale, comparableTypes, labels, children }: Props) {
  const [buckets, setBuckets] = useState<CompareDrawerBucket[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

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
    const onChange = () => refresh();
    window.addEventListener(COMPARE_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(COMPARE_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCount = buckets.reduce((n, b) => n + b.count, 0);
  const typeBySlug = useMemo(
    () => buildComparableTypeBySlugMap(comparableTypes),
    [comparableTypes]
  );

  const value = useMemo(() => ({ comparableTypes, refresh }), [comparableTypes, refresh]);

  const isComparePage = Boolean(pathname?.match(/\/compare(\/|$)/));

  const showFab = comparableTypes.length > 0 && totalCount > 0 && !isComparePage;

  const overlay =
    mounted && (showFab || drawerOpen)
      ? createPortal(
          <>
            {showFab ? (
              <button
                type="button"
                className="cmp-drawer-fab"
                onClick={() => setDrawerOpen(true)}
                aria-expanded={drawerOpen}
                aria-controls="catalog-compare-drawer"
                aria-label={`${labels.drawerTitle} (${totalCount})`}
              >
                <span>{labels.drawerTitle}</span>
                <span className="cmp-drawer-fab__badge" aria-hidden="true">
                  {totalCount}
                </span>
              </button>
            ) : null}

            <ComparisonDrawer
              id="catalog-compare-drawer"
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              locale={locale}
              buckets={buckets}
              typeBySlug={typeBySlug}
              totalCount={totalCount}
              labels={labels}
              onClearAll={() => {
                clearCompareList();
                refresh();
              }}
              onStoreChange={refresh}
            />
          </>,
          document.body
        )
      : null;

  return (
    <ComparisonContext.Provider value={value}>
      {children}
      {overlay}
    </ComparisonContext.Provider>
  );
}
