"use client";

import { ArrowLeftRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { COMPARE_CHANGED_EVENT, getCompareStore } from "@/features/comparison/comparison-store";
import { cn } from "@/lib/utils";

export const COMPARE_OPEN_DRAWER_EVENT = "comparison:open-drawer";

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

  const openDrawer = useCallback(() => {
    window.dispatchEvent(new CustomEvent(COMPARE_OPEN_DRAWER_EVENT));
  }, []);

  return { count, visible, openDrawer };
}

type CompareWidgetFabProps = {
  className?: string;
  label?: string;
};

/** Circular compare control for the personalization widget — visible only when the list has items. */
export function CompareWidgetFab({ className, label = "Compare" }: CompareWidgetFabProps) {
  const { count, visible, openDrawer } = useCompareFabState();

  if (!visible) return null;

  return (
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
  );
}
