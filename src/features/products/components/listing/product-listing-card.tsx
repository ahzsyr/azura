"use client";

import { memo, useEffect, type CSSProperties } from "react";
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
import { cardSessionDebugLog } from "@/lib/debug/agent-log";
import { ProductCardShell } from "@/features/products/card-design/components/product-card-shell";
import { ProductCardMedia } from "@/features/products/card-design/components/product-card-media";
import { ProductCardContent } from "@/features/products/card-design/components/product-card-content";
import { ProductCardEffects } from "@/features/products/card-design/components/product-card-effects";
import { ProductCardBadges } from "@/features/products/card-design/components/product-card-badges";
import {
  ProductCardMediaOverlayActions,
  ProductCardActionBar,
} from "@/features/products/card-design/components/product-card-actions";
import { buildProductCardRenderContext } from "@/features/products/card-design/components/build-product-card-context";

type Props = {
  product: ProductListingRecord;
  href: string;
  numberLocale?: string;
  cardStyle?: CSSProperties;
  priority?: boolean;
  localePrefix?: string;
  buyNow?: ResolvedProductBuyNow;
  quoteCta?: ResolvedProductCtaConfig;
  cardLayout?: ResolvedProductCardLayout;
  pageDisplay?: ResolvedProductPageDisplay;
  cardVariant?: ProductCardVariant;
  displayOverrides?: ProductCardDisplayOverrides;
  personalizationFlags?: {
    recent?: boolean;
    recommended?: boolean;
    trending?: boolean;
  };
};

export const ProductListingCard = memo(function ProductListingCard({
  product,
  href,
  numberLocale = "en-US",
  cardStyle,
  priority = false,
  localePrefix = "en",
  buyNow: buyNowProp,
  quoteCta: quoteCtaProp,
  cardLayout: cardLayoutProp,
  pageDisplay: _pageDisplayProp,
  cardVariant: cardVariantProp,
  displayOverrides,
  personalizationFlags,
}: Props) {
  const theme = useProductCardTheme();
  const cardLayout = cardLayoutProp ?? theme.cardLayout;
  const buyNow = buyNowProp ?? theme.buyNow;
  const quoteCta = quoteCtaProp ?? theme.quoteCta;
  const cardVariant = cardVariantProp ?? theme.cardVariant;
  const design = theme.design;
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
    quoteCta,
    cardVariant,
    layoutTokens: theme.cardLayoutCssVars,
    designDataAttrs: theme.designDataAttrs,
    personalizationFlags,
  });

  const badgesInContentOrder = design.contentOrder.includes("badges");
  const showOverlayBadges = !badgesInContentOrder;

  // #region agent log
  useEffect(() => {
    cardSessionDebugLog(
      "product-listing-card.tsx:mount",
      "ProductListingCard mounted",
      {
        slug: product.slug,
        badgesInContentOrder,
        showOverlayBadges,
        hoverSwap: design.media.hoverSwap,
      },
      "H1",
    );
    return () => {
      cardSessionDebugLog(
        "product-listing-card.tsx:unmount",
        "ProductListingCard unmounted",
        { slug: product.slug },
        "H4",
      );
    };
  }, [product.slug, badgesInContentOrder, showOverlayBadges, design.media.hoverSwap]);
  // #endregion

  return (
    <ProductCardShell ctx={ctx} cardStyle={cardStyle}>
      <ProductCardEffects ctx={ctx} />
      <ProductCardMediaOverlayActions ctx={ctx} />
      {showOverlayBadges ? <ProductCardBadges ctx={ctx} placement="overlay" /> : null}
      <ProductCardMedia ctx={ctx} />
      <ProductCardContent ctx={ctx} />
      <ProductCardActionBar ctx={ctx} />
    </ProductCardShell>
  );
});
