"use client";

import { useCallback } from "react";
import { prefetchQuickViewData, preloadQuickViewModal } from "./quick-view-data";
import type { QuickViewSeed } from "./quick-view-types";

type Props = {
  slug: string;
  localePrefix: string;
  className?: string;
  seed?: QuickViewSeed;
};

export function ProductQuickViewTrigger({ slug, localePrefix, className = "", seed }: Props) {
  const prefetchData = useCallback(() => {
    prefetchQuickViewData(slug, localePrefix);
  }, [slug, localePrefix]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      prefetchData();
      preloadQuickViewModal();
      window.dispatchEvent(
        new CustomEvent("az:product-quick-view", {
          detail: { slug, localePrefix, seed },
        }),
      );
    },
    [slug, localePrefix, seed, prefetchData],
  );

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      onPointerEnter={prefetchData}
      onFocus={prefetchData}
      aria-label="Quick view product"
    >
      <svg
        className="pl-card__quick-view-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <path
          d="M2.2 12c1.55-2.74 4.88-6 9.8-6s8.25 3.26 9.8 6c-1.55 2.74-4.88 6-9.8 6s-8.25-3.26-9.8-6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </button>
  );
}
