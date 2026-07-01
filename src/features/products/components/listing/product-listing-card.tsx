"use client";

import { memo, type CSSProperties } from "react";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import {
  mergeProductCardDisplayOverrides,
  type ProductCardDisplayOverrides,
} from "@/features/products/lib/product-card-display";
import { useProductCardTheme } from "@/features/products/components/listing/product-card-theme-context";
import type { ProductCardVariant } from "@/features/products/lib/product-card-variant";
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
import type { ProductCardViewModel } from "@/view-models/product-card";
import { ProductCardTemplate } from "@/templates/product/product-card-template";
import { buildProductCardRenderContext } from "@/features/products/card-design/components/build-product-card-context";

type Props = {
  product: ProductListingRecord;
  href: string;
  numberLocale?: string;
  cardStyle?: CSSProperties;
  priority?: boolean;
  localePrefix?: string;
  buyNow?: ResolvedProductBuyNow;
  productCta?: ResolvedProductCtaConfig;
  cardLayout?: ResolvedProductCardLayout;
  pageDisplay?: ResolvedProductPageDisplay;
  cardVariant?: ProductCardVariant;
  displayOverrides?: ProductCardDisplayOverrides;
  personalizationFlags?: {
    recent?: boolean;
    recommended?: boolean;
    trending?: boolean;
  };
  /** When provided, renders via template registry (Phase 4). */
  viewModel?: ProductCardViewModel;
};

export const ProductListingCard = memo(function ProductListingCard(props: Props) {
  if (props.viewModel) {
    return <ProductCardTemplate viewModel={props.viewModel} cardStyle={props.cardStyle} />;
  }
  return <ProductListingCardThemed {...props} />;
});

const ProductListingCardThemed = memo(function ProductListingCardThemed({
  product,
  href,
  numberLocale = "en-US",
  cardStyle,
  priority = false,
  localePrefix = "en",
  buyNow: buyNowProp,
  productCta: productCtaProp,
  cardLayout: cardLayoutProp,
  pageDisplay: _pageDisplayProp,
  cardVariant: cardVariantProp,
  displayOverrides,
  personalizationFlags,
}: Omit<Props, "viewModel">) {
  const theme = useProductCardTheme();
  const cardLayout = cardLayoutProp ?? theme.cardLayout;
  const buyNow = buyNowProp ?? theme.buyNow;
  const productCta = productCtaProp ?? theme.productCta;
  const cardVariant = cardVariantProp ?? theme.cardVariant;
  const design = theme.effectiveDesign;
  const cardDisplay = mergeProductCardDisplayOverrides(
    theme.effectiveCardDisplay,
    displayOverrides,
  );

  const ctx = buildProductCardRenderContext({
    product,
    href,
    numberLocale,
    localePrefix,
    priority,
    cardLayout,
    cardDisplay,
    design,
    buyNow,
    productCta,
    cardVariant,
    layoutTokens: theme.effectiveDesignTokens,
    designDataAttrs: theme.effectiveDesignDataAttrs,
    personalizationFlags,
    linkPrefetch: false,
  });

  const badgesInContentOrder = design.contentOrder.includes("badges");
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
});
