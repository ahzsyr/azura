"use client";

import { useMemo, type CSSProperties } from "react";
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
  ProductCardFloatingCta,
  ProductCardFallbackFloatingBuy,
} from "@/features/products/card-design/components/product-card-actions";
import { buildProductCardRenderContextFromViewModel } from "@/features/products/card-design/components/build-product-card-context";
import {
  useOptionalProductCardTheme,
} from "@/features/products/components/listing/product-card-theme-context";
import { useProductPageViewport } from "@/features/products/lib/product-pdp-breakpoints";
import { resolveEffectiveCardDesignState } from "@/features/products/lib/resolve-effective-card-design";

type Props = {
  viewModel: ProductCardViewModel;
  cardStyle?: CSSProperties;
};

export function ProductCardTemplate({ viewModel, cardStyle }: Props) {
  const theme = useOptionalProductCardTheme();
  const viewport = useProductPageViewport();

  const effective = useMemo(() => {
    if (theme) {
      return resolveEffectiveCardDesignState({
        design: theme.design,
        responsive: theme.responsive,
        cardLayout: theme.cardLayout,
        viewport,
      });
    }
    return {
      design: viewModel.design,
      designTokens: viewModel.layoutTokens,
      designDataAttrs: viewModel.designDataAttrs,
      contentOrder: viewModel.design.contentOrder,
    };
  }, [theme, viewport, viewModel]);

  const ctx = useMemo(
    () =>
      buildProductCardRenderContextFromViewModel({
        ...viewModel,
        design: effective.design,
        layoutTokens: effective.designTokens,
        designDataAttrs: effective.designDataAttrs,
      }),
    [viewModel, effective],
  );

  const badgesInContentOrder = effective.contentOrder.includes("badges");
  const showOverlayBadges = !badgesInContentOrder;

  return (
    <ProductCardShell ctx={ctx} cardStyle={cardStyle}>
      <ProductCardEffects ctx={ctx} />
      <ProductCardMediaOverlayActions ctx={ctx} />
      {showOverlayBadges ? <ProductCardBadges ctx={ctx} placement="overlay" /> : null}
      <ProductCardQuickAction ctx={ctx} />
      <ProductCardOverlayCta ctx={ctx} />
      <ProductCardFloatingBuy ctx={ctx} />
      <ProductCardFloatingCta ctx={ctx} />
      <ProductCardFallbackFloatingBuy ctx={ctx} />
      <ProductCardMedia ctx={ctx} />
      <ProductCardContent ctx={ctx} />
      <ProductCardActionBar ctx={ctx} />
    </ProductCardShell>
  );
}
