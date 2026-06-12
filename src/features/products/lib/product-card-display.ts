import type { ResolvedProductBuyNow } from "./product-buy-now";
import type { ResolvedProductCtaConfig } from "./product-cta";
import type { ResolvedProductPageDisplay } from "./product-page-display";
import type { ResolvedProductCardLayout } from "./product-storefront-layout";

export type ProductCardDisplayOverrides = Partial<{
  showPrice: boolean;
  showRating: boolean;
  showStock: boolean;
  showCompare: boolean;
  showBrand: boolean;
  showShortDescription: boolean;
  showDiscountBadge: boolean;
  showBuyNow: boolean;
  showQuoteCta: boolean;
}>;

export type ResolvedProductCardDisplay = {
  showPrice: boolean;
  showRating: boolean;
  showStock: boolean;
  showCompare: boolean;
  showBrand: boolean;
  showShortDescription: boolean;
  showDiscountBadge: boolean;
  showBuyNow: boolean;
  showQuoteCta: boolean;
};

export function resolveProductCardDisplay(
  pageDisplay: ResolvedProductPageDisplay,
  cardLayout: ResolvedProductCardLayout,
  buyNow: ResolvedProductBuyNow,
  quoteCta: ResolvedProductCtaConfig,
): ResolvedProductCardDisplay {
  return {
    showPrice: pageDisplay.price.enabled,
    showRating: pageDisplay.trust.enabled,
    showStock: pageDisplay.stock.enabled,
    showCompare: cardLayout.showCompare && pageDisplay.compare.enabled,
    showBrand: cardLayout.showBrand,
    showShortDescription: pageDisplay.shortDescription.enabled,
    showDiscountBadge: cardLayout.showDiscountBadge,
    showBuyNow: pageDisplay.buyNow.enabled && buyNow.enabled && buyNow.placements.card,
    showQuoteCta: quoteCta.enabled && quoteCta.placements.card && Boolean(quoteCta.label),
  };
}

function andFlag(global: boolean, override: boolean | undefined): boolean {
  if (override === undefined) return global;
  return global && override;
}

/** Block/context overrides can only hide elements, never re-enable globally disabled ones. */
export function mergeProductCardDisplayOverrides(
  global: ResolvedProductCardDisplay,
  overrides?: ProductCardDisplayOverrides | null,
): ResolvedProductCardDisplay {
  if (!overrides) return global;
  return {
    showPrice: andFlag(global.showPrice, overrides.showPrice),
    showRating: andFlag(global.showRating, overrides.showRating),
    showStock: andFlag(global.showStock, overrides.showStock),
    showCompare: andFlag(global.showCompare, overrides.showCompare),
    showBrand: andFlag(global.showBrand, overrides.showBrand),
    showShortDescription: andFlag(global.showShortDescription, overrides.showShortDescription),
    showDiscountBadge: andFlag(global.showDiscountBadge, overrides.showDiscountBadge),
    showBuyNow: andFlag(global.showBuyNow, overrides.showBuyNow),
    showQuoteCta: andFlag(global.showQuoteCta, overrides.showQuoteCta),
  };
}

/** Map product block schema flags to display overrides. */
export function blockPropsToCardDisplayOverrides(props: {
  showPrice?: boolean;
  showRating?: boolean;
  showStock?: boolean;
  showCompare?: boolean;
}): ProductCardDisplayOverrides {
  const out: ProductCardDisplayOverrides = {};
  if (props.showPrice === false) out.showPrice = false;
  if (props.showRating === false) out.showRating = false;
  if (props.showStock === false) out.showStock = false;
  if (props.showCompare === false) out.showCompare = false;
  return out;
}

/** Non-catalog entities should not show commerce elements on cards. */
export function nonProductEntityCardOverrides(): ProductCardDisplayOverrides {
  return {
    showPrice: false,
    showRating: false,
    showStock: false,
    showCompare: false,
    showDiscountBadge: false,
    showBuyNow: false,
    showQuoteCta: false,
  };
}
