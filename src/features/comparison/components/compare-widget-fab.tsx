"use client";

import dynamic from "next/dynamic";
import { ArrowLeftRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { COMPARE_CHANGED_EVENT, getCompareStore } from "@/features/comparison/comparison-store";
import { useCompareDrawerBuckets } from "@/features/comparison/hooks/use-compare-drawer-buckets";
import { buildComparableTypeBySlugMap } from "@/features/comparison/resolve-comparable-type";
import type { ComparableTypeMeta } from "@/features/comparison/types";
import type { ComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";
import { cn } from "@/lib/utils";
import "@/features/comparison/comparison-shell.css";

const ComparisonDrawer = dynamic(
  () =>
    import("@/features/comparison/components/comparison-drawer").then(
      (m) => m.ComparisonDrawer,
    ),
  { ssr: false },
);

function getTotalCompareCount(): number {
  const store = getCompareStore();
  return Object.values(store).reduce((n, ids) => n + ids.length, 0);
}

export function useCompareFabState() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();
  const isComparePage = Boolean(pathname?.match(/\/compare(\/|$)/));

  useEffect(() => {
    const sync = () => setCount(getTotalCompareCount());
    sync();
    window.addEventListener(COMPARE_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COMPARE_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const visible = count > 0 && !isComparePage;

  return { count, visible };
}

type CompareWidgetFabProps = {
  className?: string;
  label?: string;
  locale?: string;
};

/** Circular compare control for the personalization widget — visible only when the list has items. */
export function CompareWidgetFab({ className, label = "Compare", locale = "en" }: CompareWidgetFabProps) {
  const { count, visible } = useCompareFabState();
  const { buckets, totalCount, refresh, clearAll } = useCompareDrawerBuckets();
  const t = useTranslations("compare");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [comparableTypes, setComparableTypes] = useState<ComparableTypeMeta[]>([]);
  const [shellFetched, setShellFetched] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchShellProps = useCallback(async () => {
    if (shellFetched) return;
    try {
      const res = await fetch(`/api/compare/shell?locale=${encodeURIComponent(locale)}`);
      if (!res.ok) return;
      const data = (await res.json()) as ComparisonShellProps;
      setComparableTypes(data.comparableTypes);
    } catch {
      // silently degrade — drawer still shows items without type labels
    } finally {
      setShellFetched(true);
    }
  }, [locale, shellFetched]);

  const openDrawer = useCallback(() => {
    void fetchShellProps();
    setDrawerOpen(true);
  }, [fetchShellProps]);

  const typeBySlug = useMemo(
    () => buildComparableTypeBySlugMap(comparableTypes),
    [comparableTypes]
  );

  const labels = {
    drawerTitle: t("drawerTitle"),
    compareNow: t("compareNow"),
    clearAll: t("clearAll"),
    empty: t("drawerEmpty"),
    remove: t("remove"),
    addMore: t("addMore"),
    clearBucket: t("clearBucket"),
    close: t("close"),
    viewComparison: t("viewComparison"),
  };

  const overlay =
    mounted && drawerOpen
      ? createPortal(
          <ComparisonDrawer
            id="global-compare-drawer"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            locale={locale}
            buckets={buckets}
            typeBySlug={typeBySlug}
            totalCount={totalCount}
            labels={labels}
            onClearAll={() => {
              clearAll();
              setDrawerOpen(false);
            }}
            onStoreChange={refresh}
          />,
          document.body,
        )
      : null;

  if (!visible) return <>{overlay}</>;

  return (
    <>
      <button
        type="button"
        className={cn("pp-fab-circle pp-fab-circle--active pp-compare-fab", className)}
        onClick={openDrawer}
        aria-label={`${label} (${count})`}
        title={`${label} (${count})`}
      >
        <ArrowLeftRight className="h-4 w-4" strokeWidth={2} aria-hidden />
        <span className="pp-compare-fab__badge" aria-hidden>
          {count}
        </span>
      </button>
      {overlay}
    </>
  );
}
