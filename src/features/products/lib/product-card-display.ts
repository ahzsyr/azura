import type { ResolvedProductBuyNow } from "./product-buy-now";
import { resolveProductBuyNow } from "./product-buy-now";
import {
  mergeProductCta,
  normalizeProductCtaGlobal,
  resolveProductCta,
  type ResolvedProductCtaConfig,
} from "./product-cta";
import { migrateProductCtaFromLegacyAddToCart } from "./product-cta-migrate";
import type { ProductPageViewport } from "./product-pdp-breakpoints";
import type { ResolvedProductPageDisplay } from "./product-page-display";
import { buildProductPageSettingsFromSite } from "./product-page-responsive";
import {
  resolveProductCardLayout,
  type ResolvedProductCardLayout,
} from "./product-storefront-layout";
import type { ProductPageDisplayPartial } from "./product-page-display";
import { normalizeProductPageDisplayPartial } from "./product-page-display";

/** Seed card listing visibility from legacy productCardLayout when new keys are absent. */
export function migrateCardVisibilityIntoPageDisplay(
  site: Record<string, unknown>,
  displayPartial?: ProductPageDisplayPartial | null,
): ProductPageDisplayPartial | undefined {
  const cardLayout = resolveProductCardLayout(
    site.productCardLayout as Parameters<typeof resolveProductCardLayout>[0],
  );
  const rawSiteDisplay = site.productPageDisplay as Record<string, unknown> | undefined;
  const base = displayPartial ?? normalizeProductPageDisplayPartial(site.productPageDisplay) ?? {};
  const out: ProductPageDisplayPartial = { ...base };

  if (!rawSiteDisplay?.cardBrand && out.cardBrand === undefined) {
    out.cardBrand = { enabled: cardLayout.showBrand };
  }
  if (!rawSiteDisplay?.cardDiscountBadge && out.cardDiscountBadge === undefined) {
    out.cardDiscountBadge = { enabled: cardLayout.showDiscountBadge };
  }
  if (!rawSiteDisplay?.compare && out.compare === undefined) {
    out.compare = { enabled: cardLayout.showCompare };
  } else if (out.compare?.enabled !== false && !cardLayout.showCompare) {
    out.compare = { enabled: false };
  }

  return Object.keys(out).length ? out : undefined;
}

export type ProductCardDisplayOverrides = Partial<{
  showPrice: boolean;
  showRating: boolean;
  showStock: boolean;
  showCompare: boolean;
  showBrand: boolean;
  showShortDescription: boolean;
  showDiscountBadge: boolean;
  showBuyNow: boolean;
  showProductCta: boolean;
  showWishlist: boolean;
  showQuickView: boolean;
  showLinkedTags: boolean;
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
  showProductCta: boolean;
  showWishlist: boolean;
  showQuickView: boolean;
  showLinkedTags: boolean;
};

export function resolveProductCardDisplay(
  pageDisplay: ResolvedProductPageDisplay,
  cardLayout: ResolvedProductCardLayout,
  buyNow: ResolvedProductBuyNow,
  productCta: ResolvedProductCtaConfig,
): ResolvedProductCardDisplay {
  return {
    showPrice: pageDisplay.price.enabled,
    showRating: pageDisplay.trust.enabled,
    showStock: pageDisplay.stock.enabled,
    showCompare: pageDisplay.compare.enabled,
    showBrand: pageDisplay.cardBrand.enabled,
    showShortDescription: pageDisplay.shortDescription.enabled,
    showDiscountBadge: pageDisplay.cardDiscountBadge.enabled,
    showBuyNow: pageDisplay.buyNow.enabled && buyNow.enabled && buyNow.placements.card,
    showProductCta: productCta.enabled && productCta.placements.card && Boolean(productCta.label),
    showWishlist: pageDisplay.saveToList.enabled,
    showQuickView: pageDisplay.quickView.enabled,
    showLinkedTags: pageDisplay.linkedTags.enabled,
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
    showProductCta: andFlag(global.showProductCta, overrides.showProductCta),
    showWishlist: andFlag(global.showWishlist, overrides.showWishlist),
    showQuickView: andFlag(global.showQuickView, overrides.showQuickView),
    showLinkedTags: andFlag(global.showLinkedTags, overrides.showLinkedTags),
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

const PRODUCT_PAGE_VIEWPORTS = ["desktop", "tablet", "mobile"] as const satisfies readonly ProductPageViewport[];

function resolveCardCommerceFromSite(site: Record<string, unknown>): {
  cardLayout: ResolvedProductCardLayout;
  buyNow: ResolvedProductBuyNow;
  productCta: ResolvedProductCtaConfig;
} {
  const cardLayout = resolveProductCardLayout(
    site.productCardLayout as Parameters<typeof resolveProductCardLayout>[0],
  );
  const buyNow = resolveProductBuyNow(
    site.productBuyNow as Parameters<typeof resolveProductBuyNow>[0],
    site.productPageAddToCart as Parameters<typeof resolveProductBuyNow>[1],
  );
  const migratedCta = migrateProductCtaFromLegacyAddToCart(
    site.productCta,
    site.productPageAddToCart,
  );
  const globalCta = migratedCta
    ? mergeProductCta(normalizeProductCtaGlobal(site.productCta), migratedCta)
    : normalizeProductCtaGlobal(site.productCta);
  const productCta = resolveProductCta(globalCta, undefined);
  return { cardLayout, buyNow, productCta };
}

/** Resolve card display flags for one viewport from locale site settings. */
export function resolveCardDisplayForViewport(
  site: Record<string, unknown>,
  viewport: ProductPageViewport,
): ResolvedProductCardDisplay {
  const { elementsRules } = buildProductPageSettingsFromSite(site);
  const { cardLayout, buyNow, productCta } = resolveCardCommerceFromSite(site);
  return resolveProductCardDisplay(elementsRules[viewport].display, cardLayout, buyNow, productCta);
}

/** Resolve card display flags for all viewports from locale site settings. */
export function resolveCardDisplayByViewport(
  site: Record<string, unknown>,
): Record<ProductPageViewport, ResolvedProductCardDisplay> {
  const { elementsRules } = buildProductPageSettingsFromSite(site);
  const { cardLayout, buyNow, productCta } = resolveCardCommerceFromSite(site);
  const out = {} as Record<ProductPageViewport, ResolvedProductCardDisplay>;
  for (const viewport of PRODUCT_PAGE_VIEWPORTS) {
    out[viewport] = resolveProductCardDisplay(
      elementsRules[viewport].display,
      cardLayout,
      buyNow,
      productCta,
    );
  }
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
    showProductCta: false,
    showWishlist: false,
    showQuickView: false,
  };
}
