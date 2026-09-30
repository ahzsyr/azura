"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  COMPARE_CHANGED_EVENT,
  getCompareIdsForType,
} from "@/features/comparison/comparison-store";
import { PRODUCT_COMPARE_SLUG } from "@/features/comparison/product-comparison.constants";

type Props = {
  locale: string;
};

export function ComparisonStickyBar({ locale }: Props) {
  const [count, setCount] = useState(0);

  const sync = useCallback(() => {
    setCount(getCompareIdsForType(PRODUCT_COMPARE_SLUG).length);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(COMPARE_CHANGED_EVENT, sync);
    window.addEventListener("az:catalog-compare-changed", sync);
    return () => {
      window.removeEventListener(COMPARE_CHANGED_EVENT, sync);
      window.removeEventListener("az:catalog-compare-changed", sync);
    };
  }, [sync]);

  if (count === 0) return null;

  return (
    <aside className="cmp-sticky-bar" aria-label="Compare products">
      <span className="cmp-sticky-bar__count">{count} in compare</span>
      <Link href="/compare" className="cmp-sticky-bar__link" locale={locale}>
        View comparison
      </Link>
    </aside>
  );
}
