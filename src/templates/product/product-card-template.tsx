"use client";

import type { CSSProperties } from "react";
import type { ProductCardViewModel } from "@/view-models/product-card";
import { ProductCardShell } from "@/features/products/card-design/components/product-card-shell";
import { ProductCardMedia } from "@/features/products/card-design/components/product-card-media";
import { ProductCardContent } from "@/features/products/card-design/components/product-card-content";
import { ProductCardEffects } from "@/features/products/card-design/components/product-card-effects";
import { ProductCardBadges } from "@/features/products/card-design/components/product-card-badges";
import {
  ProductCardMediaOverlayActions,
  ProductCardActionBar,
  ProductCardQuickAction,
  ProductCardOverlayCta,
  ProductCardFloatingBuy,
  ProductCardFloatingQuote,
  ProductCardFallbackFloatingBuy,
} from "@/features/products/card-design/components/product-card-actions";
import { buildProductCardRenderContextFromViewModel } from "@/features/products/card-design/components/build-product-card-context";

type Props = {
  viewModel: ProductCardViewModel;
  cardStyle?: CSSProperties;
};

export function ProductCardTemplate({ viewModel, cardStyle }: Props) {
  const ctx = buildProductCardRenderContextFromViewModel(viewModel);
  const badgesInContentOrder = viewModel.design.contentOrder.includes("badges");
  const showOverlayBadges = !badgesInContentOrder;

  return (
    <ProductCardShell ctx={ctx} cardStyle={cardStyle}>
      <ProductCardEffects ctx={ctx} />
      <ProductCardMediaOverlayActions ctx={ctx} />
      {showOverlayBadges ? <ProductCardBadges ctx={ctx} placement="overlay" /> : null}
      <ProductCardQuickAction ctx={ctx} />
      <ProductCardOverlayCta ctx={ctx} />
      <ProductCardFloatingBuy ctx={ctx} />
      <ProductCardFloatingQuote ctx={ctx} />
      <ProductCardFallbackFloatingBuy ctx={ctx} />
      <ProductCardMedia ctx={ctx} />
      <ProductCardContent ctx={ctx} />
      <ProductCardActionBar ctx={ctx} />
    </ProductCardShell>
  );
}
