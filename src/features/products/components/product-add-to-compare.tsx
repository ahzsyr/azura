"use client";

import { ProductCardCompareButton } from "@/features/products/card-design/components/product-card-compare-button";

type Props = {
  productId: string;
  label?: string;
  className?: string;
};

export function ProductAddToCompare({ productId, label = "Compare", className }: Props) {
  return (
    <ProductCardCompareButton productId={productId} label={label} className={className} />
  );
}
