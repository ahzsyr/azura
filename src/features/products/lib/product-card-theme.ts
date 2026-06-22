import {
  productCardLayoutCssVars,
  resolveProductCardLayout,
  type ResolvedProductCardLayout,
} from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductPageDisplay } from "@/features/products/lib/product-page-display";
import { resolveProductBuyNow, type ResolvedProductBuyNow } from "@/features/products/lib/product-buy-now";
import {
  mergeProductCta,
  normalizeProductCtaGlobal,
  resolveProductCta,
  type ResolvedProductCtaConfig,
} from "@/features/products/lib/product-cta";
import { migrateProductCtaFromLegacyAddToCart } from "@/features/products/lib/product-cta-migrate";
import {
  resolveProductCardDisplay,
  type ResolvedProductCardDisplay,
} from "@/features/products/lib/product-card-display";
import {
  buildProductCardDesignFromSite,
  type ResolvedProductCardDesign,
  type ProductCardResponsiveRules,
  type ProductCardDesignTokens,
  type ProductCardContentSlot,
  mergeDesignTokens,
  productCardDesignDataAttrs,
} from "@/features/products/card-design";
import {
  buildProductPageSettingsFromSite,
  type ProductPageElementsRules,
} from "@/features/products/lib/product-page-responsive";

export type ProductCardTheme = {
  cardLayout: ResolvedProductCardLayout;
  cardLayoutCssVars: Record<string, string>;
  pageDisplay: ResolvedProductPageDisplay;
  elementsRules: ProductPageElementsRules;
  cardDisplay: ResolvedProductCardDisplay;
  buyNow: ResolvedProductBuyNow;
  quoteCta: ResolvedProductCtaConfig;
  design: ResolvedProductCardDesign;
  designTokens: ProductCardDesignTokens;
  designDataAttrs: Record<string, string>;
  contentOrder: ProductCardContentSlot[];
  responsive: ProductCardResponsiveRules;
};

export function buildProductCardThemeFromSite(site: Record<string, unknown>): ProductCardTheme {
  const cardLayout = resolveProductCardLayout(
    site.productCardLayout as Parameters<typeof resolveProductCardLayout>[0],
  );
  const { elementsRules } = buildProductPageSettingsFromSite(site);
  const pageDisplay = elementsRules.desktop.display;
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
  const quoteCta = resolveProductCta(globalCta, undefined);
  const cardDisplay = resolveProductCardDisplay(pageDisplay, cardLayout, buyNow, quoteCta);
  const { design, responsive } = buildProductCardDesignFromSite(site, cardLayout);
  const legacyVars = productCardLayoutCssVars(cardLayout);
  const designTokens = mergeDesignTokens(legacyVars, design, cardLayout);

  return {
    cardLayout,
    cardLayoutCssVars: designTokens,
    pageDisplay,
    elementsRules,
    cardDisplay,
    buyNow,
    quoteCta,
    design,
    designTokens,
    designDataAttrs: productCardDesignDataAttrs(design),
    contentOrder: design.contentOrder,
    responsive,
  };
}

export function defaultProductCardTheme(): ProductCardTheme {
  return buildProductCardThemeFromSite({});
}

/** Build theme from legacy per-prop wiring (catalog island, PDP). */
export function productCardThemeFromLegacyProps(props: {
  cardLayout?: ResolvedProductCardLayout;
  cardLayoutCssVars?: Record<string, string>;
  pageDisplay?: ResolvedProductPageDisplay;
  buyNow?: ResolvedProductBuyNow;
  quoteCta?: ResolvedProductCtaConfig;
}): ProductCardTheme {
  const fallback = defaultProductCardTheme();
  const cardLayout = props.cardLayout ?? fallback.cardLayout;
  const pageDisplay = props.pageDisplay ?? fallback.pageDisplay;
  const buyNow = props.buyNow ?? fallback.buyNow;
  const quoteCta = props.quoteCta ?? fallback.quoteCta;
  const elementsRules = props.pageDisplay
    ? {
        ...fallback.elementsRules,
        desktop: { ...fallback.elementsRules.desktop, display: pageDisplay },
        tablet: { ...fallback.elementsRules.tablet, display: pageDisplay },
        mobile: { ...fallback.elementsRules.mobile, display: pageDisplay },
      }
    : fallback.elementsRules;
  const cardDisplay = resolveProductCardDisplay(pageDisplay, cardLayout, buyNow, quoteCta);
  const { design, responsive } = buildProductCardDesignFromSite({}, cardLayout);
  const legacyVars = props.cardLayoutCssVars ?? productCardLayoutCssVars(cardLayout);
  const designTokens = mergeDesignTokens(legacyVars, design, cardLayout);
  return {
    cardLayout,
    cardLayoutCssVars: designTokens,
    pageDisplay,
    elementsRules,
    cardDisplay,
    buyNow,
    quoteCta,
    design,
    designTokens,
    designDataAttrs: productCardDesignDataAttrs(design),
    contentOrder: design.contentOrder,
    responsive,
  };
}

export function productCardThemeWithDesign(
  base: ProductCardTheme,
  design: ResolvedProductCardDesign,
): ProductCardTheme {
  const designTokens = mergeDesignTokens(base.cardLayoutCssVars, design, base.cardLayout);
  return {
    ...base,
    design,
    designTokens,
    designDataAttrs: productCardDesignDataAttrs(design),
    contentOrder: design.contentOrder,
    cardLayoutCssVars: designTokens,
  };
}
