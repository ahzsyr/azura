"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import {
  COMPARE_CHANGED_EVENT,
  isInCompareList,
  toggleCompareList,
} from "@/features/comparison/comparison-store";
import {
  PRODUCT_COMPARE_MAX,
  PRODUCT_COMPARE_SLUG,
} from "@/features/comparison/product-comparison.constants";

type Props = {
  productId: string;
  className?: string;
  label?: string;
};

export function ProductCardCompareButton({
  productId,
  className = "",
  label = "Compare",
}: Props) {
  const [active, setActive] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const sync = () => setActive(isInCompareList(PRODUCT_COMPARE_SLUG, productId));
    sync();
    window.addEventListener(COMPARE_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COMPARE_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [productId]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleCompareList(PRODUCT_COMPARE_SLUG, productId, PRODUCT_COMPARE_MAX);
    setActive(isInCompareList(PRODUCT_COMPARE_SLUG, productId));

    if (result === "full") {
      setFull(true);
      window.setTimeout(() => setFull(false), 2500);
    }
  };

  const title = full
    ? `Maximum ${PRODUCT_COMPARE_MAX} items`
    : active
      ? `${label} — selected`
      : label;

  return (
    <button
      type="button"
      className={`pl-card__compare-btn${active ? " is-active" : ""}${full ? " is-full" : ""} ${className}`.trim()}
      aria-pressed={active}
      aria-label={title}
      title={title}
      onClick={onClick}
    >
      <ArrowLeftRight size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
