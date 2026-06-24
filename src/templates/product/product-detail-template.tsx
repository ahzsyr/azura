"use client";

import type { ReactNode } from "react";
import type { ProductDetailViewModel } from "@/view-models/product-detail";
import { ProductDetailViewBody } from "@/features/products/components/pdp/product-detail-view-body";
import type { DeferredMainKey } from "@/features/products/components/pdp/product-deferred-sections";

type Props = {
  viewModel: ProductDetailViewModel;
  deferredSectionBlocks?: Partial<Record<DeferredMainKey, ReactNode>>;
};

export function ProductDetailTemplate({ viewModel, deferredSectionBlocks }: Props) {
  return (
    <ProductDetailViewBody
      locale={viewModel.locale}
      slug={viewModel.slug}
      product={viewModel.product}
      layoutRules={viewModel.layoutRules}
      elementsRules={viewModel.elementsRules}
      pageCtx={viewModel.pageCtx}
      labels={viewModel.labels}
      productCtaEffective={viewModel.productCtaEffective}
      buyNowHref={viewModel.buyNowHref}
      promoResolved={viewModel.promoResolved}
      trustResolved={viewModel.trustResolved}
      collectionTrail={viewModel.collectionTrail}
      tagLinks={viewModel.tagLinks}
      brandHref={viewModel.brandHref}
      title={viewModel.title}
      productId={viewModel.productId}
      crossLinkGroups={viewModel.crossLinkGroups}
      purchasePrices={viewModel.purchasePrices}
      priceMatrix={viewModel.priceMatrix}
      deliveryOptions={viewModel.deliveryOptions}
      conditionInVariations={viewModel.conditionInVariations}
      currencyCtx={viewModel.currencyCtx}
      allCollections={viewModel.allCollections}
      cardTheme={viewModel.cardTheme}
      quoteCta={viewModel.quoteCta}
      deferredSectionBlocks={deferredSectionBlocks}
      overflow={viewModel.overflow}
    />
  );
}
