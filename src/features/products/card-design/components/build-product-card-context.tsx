"use client";

import type { ReactNode } from "react";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { ProductCtaButton } from "@/features/products/components/pdp/product-cta-button";
import { ProductBuyNowCardButton } from "@/features/products/components/listing/product-buy-now-card-button";
import { buildBuyNowHref } from "@/features/products/lib/product-buy-now";
import {
  computeDiscount,
  resolveProductCardPriceDisplay,
} from "../product-card-price";
import { resolveProductCardBadges } from "../resolve-product-card-badges";
import type { ProductCardRenderContext } from "./product-card-context";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductCardDisplay } from "@/features/products/lib/product-card-display";
import type { ResolvedProductCardDesign } from "../product-card-design.types";
import type { ProductCardVariant } from "@/features/products/lib/product-card-variant";

function isActionTypeEnabled(
  design: ResolvedProductCardDesign,
  type: ResolvedProductCardDesign["actions"]["enabledTypes"][number],
): boolean {
  return design.actions.enabledTypes.includes(type);
}

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
}): ProductCardRenderContext {
  const {
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
    layoutTokens,
    designDataAttrs,
    personalizationFlags,
  } = input;

  const sale = product.price.value;
  const compare = product.old_price ?? null;
  const { discountPercent } = computeDiscount(sale, compare);
  const priceDisplay = resolveProductCardPriceDisplay(product, design.pricingMode);
  const badges = resolveProductCardBadges(product, design, discountPercent);

  const buyNowEnabled = isActionTypeEnabled(design, "buy_now");
  const quoteEnabled = isActionTypeEnabled(design, "quote");
  const buyNowHref =
    buyNowEnabled && cardDisplay.showBuyNow ? buildBuyNowHref(buyNow, product.slug) : null;
  const showQuoteCta = quoteEnabled && cardDisplay.showQuoteCta;
  const showBuyNow = Boolean(buyNowHref);
  const quoteLayout = quoteCta.cardLayout ?? "floating_corner";
  const cardActionArrangement = cardLayout.cardActionArrangement;

  const quoteCtaNode: ReactNode = showQuoteCta ? (
    <ProductCtaButton config={quoteCta} localePrefix={localePrefix} placement="card" />
  ) : null;
  const buyNowNode: ReactNode =
    showBuyNow && buyNowHref ? (
      <ProductBuyNowCardButton
        config={buyNow}
        href={buyNowHref}
        className="pl-card__buy-now--bar"
      />
    ) : null;
  const hasRating = cardDisplay.showRating && product.rating != null && product.rating > 0;

  return {
    product,
    href,
    navHref: stripAnyLocalePrefix(href),
    numberLocale,
    localePrefix,
    priority,
    cardLayout,
    cardDisplay,
    design,
    buyNow,
    quoteCta,
    cardVariant,
    badges,
    priceDisplay,
    discountPercent,
    buyNowHref,
    showQuoteCta,
    showBuyNow,
    quoteLayout,
    cardActionArrangement,
    hasRating,
    quoteCtaNode,
    buyNowNode,
    layoutTokens,
    designDataAttrs,
    personalizationFlags,
  };
}
