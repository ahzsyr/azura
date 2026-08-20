"use client";

import { createContext, useContext, useMemo } from "react";
import type { ComparableTypeMeta } from "@/features/comparison/types";
import { useCompareDrawerBuckets } from "@/features/comparison/hooks/use-compare-drawer-buckets";

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
  children: React.ReactNode;
};

export function ComparisonProvider({ locale: _locale, comparableTypes, children }: Props) {
  const { refresh } = useCompareDrawerBuckets();

  const value = useMemo(() => ({ comparableTypes, refresh }), [comparableTypes, refresh]);

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
}
