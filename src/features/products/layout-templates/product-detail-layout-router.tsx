"use client";

import type { ReactNode } from "react";
import type { ProductDetailViewModel } from "@/view-models/product-detail";
import type { ProductPageLayoutTemplateId } from "./types";
import type { DeferredMainKey } from "@/features/products/components/pdp/product-deferred-sections";
import { UniFiProductDetailTemplate } from "./unifi/unifi-template";
import { DefaultProductDetailTemplate } from "./default/default-template";

type Props = {
  templateId: ProductPageLayoutTemplateId;
  viewModel: ProductDetailViewModel;
  deferredSectionBlocks?: Partial<Record<DeferredMainKey, ReactNode>>;
};

export function ProductDetailLayoutRouter({
  templateId,
  viewModel,
  deferredSectionBlocks,
}: Props) {
  switch (templateId) {
    case "unifi":
      return <UniFiProductDetailTemplate viewModel={viewModel} />;
    case "default":
    default:
      return (
        <DefaultProductDetailTemplate
          viewModel={viewModel}
          deferredSectionBlocks={deferredSectionBlocks}
        />
      );
  }
}
