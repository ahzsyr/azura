"use client";

import { AddToCompareButton } from "@/features/comparison/components/add-to-compare-button";
import {
  PRODUCT_COMPARE_MAX,
  PRODUCT_COMPARE_SLUG,
} from "@/features/comparison/product-comparison.constants";

type Props = {
  productId: string;
  label?: string;
  className?: string;
};

export function ProductAddToCompare({ productId, label = "Compare", className }: Props) {
  return (
    <AddToCompareButton
      contentTypeSlug={PRODUCT_COMPARE_SLUG}
      itemId={productId}
      maxItems={PRODUCT_COMPARE_MAX}
      label={label}
      className={className}
      variant="card"
    />
  );
}
