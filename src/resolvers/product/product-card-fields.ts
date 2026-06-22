import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import type { ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import type { ResolvedProductCtaConfig } from "@/features/products/lib/product-cta";
import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductCardDisplay } from "@/features/products/lib/product-card-display";
import type { ResolvedProductCardDesign } from "@/features/products/card-design/product-card-design.types";
import type { ProductCardVariant } from "@/features/products/lib/product-card-variant";
import type { ProductListingRecord } from "@/features/products/listing/types";
import { buildBuyNowHref } from "@/features/products/lib/product-buy-now";
import {
  computeDiscount,
  resolveProductCardPriceDisplay,
} from "@/features/products/card-design/product-card-price";
import { resolveProductCardBadges } from "@/features/products/card-design/resolve-product-card-badges";
import type { ProductCardViewModel } from "@/view-models/product-card";

function isActionTypeEnabled(
  design: ResolvedProductCardDesign,
  type: ResolvedProductCardDesign["actions"]["enabledTypes"][number],
): boolean {
  return design.actions.enabledTypes.includes(type);
}

export type ResolveProductCardFieldsInput = {
  entityId: string;
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
  personalizationFlags?: ProductCardViewModel["personalizationFlags"];
  linkPrefetch?: boolean;
};

/** Pure card field resolution — shared by server resolvers and client render context builder. */
export function resolveProductCardFields(
  input: ResolveProductCardFieldsInput,
): ProductCardViewModel {
  const {
    entityId,
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
    linkPrefetch,
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
  const hasRating = cardDisplay.showRating && product.rating != null && product.rating > 0;

  return {
    templateId: "product-card",
    entityId,
    slug: product.slug,
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
    layoutTokens,
    designDataAttrs,
    personalizationFlags,
    linkPrefetch,
  };
}
