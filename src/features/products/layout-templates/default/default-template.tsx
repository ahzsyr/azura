"use client";

import type { ReactNode } from "react";
import type { ProductDetailViewModel } from "@/view-models/product-detail";
import { ProductDetailTemplate } from "@/templates/product/product-detail-template";
import type { DeferredMainKey } from "@/features/products/components/pdp/product-deferred-sections";

type Props = {
  viewModel: ProductDetailViewModel;
  deferredSectionBlocks?: Partial<Record<DeferredMainKey, ReactNode>>;
};

/** Default PDP — current product page, unchanged. */
export function DefaultProductDetailTemplate({ viewModel, deferredSectionBlocks }: Props) {
  return (
    <ProductDetailTemplate
      viewModel={viewModel}
      deferredSectionBlocks={deferredSectionBlocks}
    />
  );
}
