"use client";

import type { ReactNode } from "react";
import { ProductCtaButton } from "@/features/products/components/pdp/product-cta-button";
import { ProductBuyNowCardButton } from "@/features/products/components/listing/product-buy-now-card-button";
import { resolveProductCardFields } from "@/resolvers/product/product-card-fields";
import type { ProductCardRenderContext } from "./product-card-context";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductCardDisplay } from "@/features/products/lib/product-card-display";
import type { ResolvedProductCardDesign } from "../product-card-design.types";
import type { ProductCardVariant } from "@/features/products/lib/product-card-variant";
import type { ProductCardViewModel } from "@/view-models/product-card";

export function buildProductCardRenderContext(input: {
  product: ProductListingRecord;
  href: string;
  numberLocale: string;
  localePrefix: string;
  priority: boolean;
  cardLayout: ResolvedProductCardLayout;
  cardDisplay: ResolvedProductCardDisplay;
  design: ResolvedProductCardDesign;
  buyNow: ResolvedProductBuyNow;
  quoteCta: ResolvedProductCtaConfig;
  cardVariant: ProductCardVariant;
  layoutTokens: Record<string, string>;
  designDataAttrs: Record<string, string>;
  personalizationFlags?: ProductCardRenderContext["personalizationFlags"];
  linkPrefetch?: boolean;
}): ProductCardRenderContext {
  const viewModel = resolveProductCardFields({
    entityId: input.product.id || input.product.slug,
    ...input,
  });

  return buildProductCardRenderContextFromViewModel(viewModel);
}

export function buildProductCardRenderContextFromViewModel(
  viewModel: ProductCardViewModel,
): ProductCardRenderContext {
  const quoteCtaNode: ReactNode = viewModel.showQuoteCta ? (
    <ProductCtaButton
      config={viewModel.quoteCta}
      localePrefix={viewModel.localePrefix}
      placement="card"
    />
  ) : null;
  const buyNowNode: ReactNode =
    viewModel.showBuyNow && viewModel.buyNowHref ? (
      <ProductBuyNowCardButton
        config={viewModel.buyNow}
        href={viewModel.buyNowHref}
        className="pl-card__buy-now--bar"
      />
    ) : null;

  return {
    ...viewModel,
    quoteCtaNode,
    buyNowNode,
  };
}
