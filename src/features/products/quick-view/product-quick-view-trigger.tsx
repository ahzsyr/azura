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
  const warm = useCallback(() => {
    prefetchQuickViewData(slug, localePrefix);
    preloadQuickViewModal();
  }, [slug, localePrefix]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      warm();
      window.dispatchEvent(
        new CustomEvent("az:product-quick-view", {
          detail: { slug, localePrefix, seed },
        }),
      );
    },
    [slug, localePrefix, seed, warm],
  );

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      onPointerEnter={warm}
      onFocus={warm}
      aria-label="Quick view product"
    >
      Quick view
    </button>
  );
}
