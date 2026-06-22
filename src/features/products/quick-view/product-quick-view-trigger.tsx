"use client";

import { useCallback } from "react";

type Props = {
  slug: string;
  localePrefix: string;
  className?: string;
};

export function ProductQuickViewTrigger({ slug, localePrefix, className = "" }: Props) {
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(
        new CustomEvent("az:product-quick-view", {
          detail: { slug, localePrefix },
        }),
      );
    },
    [slug, localePrefix],
  );

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label="Quick view product"
    >
      Quick view
    </button>
  );
}
