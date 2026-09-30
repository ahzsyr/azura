import "server-only";

import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { listComparableContentTypes } from "@/features/comparison/comparison-registry";
import type { ComparableTypeMeta } from "@/features/comparison/types";

export type ComparisonShellLabels = {
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

export type ComparisonShellProps = {
  comparableTypes: ComparableTypeMeta[];
  labels: ComparisonShellLabels;
};

export const FALLBACK_COMPARISON_SHELL_LABELS: ComparisonShellLabels = {
  drawerTitle: "Compare",
  compareNow: "Compare now",
  clearAll: "Clear all",
  empty: "No items selected for comparison.",
  remove: "Remove",
  addMore: "Add more",
  clearBucket: "Clear",
  close: "Close",
  viewComparison: "View comparison",
};

export function createFallbackComparisonShellProps(): ComparisonShellProps {
  return {
    comparableTypes: [],
    labels: FALLBACK_COMPARISON_SHELL_LABELS,
  };
}

/** Request-cached comparison drawer data for the locale layout shell. */
export const loadComparisonShellProps = cache(
  async (locale: string): Promise<ComparisonShellProps> => {
    try {
      const [types, t] = await Promise.all([
        listComparableContentTypes(),
        getTranslations({ locale, namespace: "compare" }),
      ]);

      return {
        comparableTypes: types.map((type) => ({
          id: type.id,
          slug: type.slug,
          labelPluralEn: type.labelPluralEn,
          labelPluralAr: type.labelPluralAr,
          routePrefix: type.routePrefix,
          maxItems: type.maxItems,
          comparisonMode: type.comparisonMode,
        })),
        labels: {
          drawerTitle: t("drawerTitle"),
          compareNow: t("compareNow"),
          clearAll: t("clearAll"),
          empty: t("drawerEmpty"),
          remove: t("remove"),
          addMore: t("addMore"),
          clearBucket: t("clearBucket"),
          close: t("close"),
          viewComparison: t("viewComparison"),
        },
      };
    } catch (error) {
      console.error("[comparison] loadComparisonShellProps failed:", error);
      return createFallbackComparisonShellProps();
    }
  },
);
