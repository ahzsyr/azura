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
  resolveProductCardResponsiveRules,
  type ResolvedProductCardDesign,
  type ProductCardResponsiveRules,
  type ProductCardDesignTokens,
  type ProductCardContentSlot,
  type ProductCardResponsivePartial,
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
  productCta: ResolvedProductCtaConfig;
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
  const productCta = resolveProductCta(globalCta, undefined);
  const cardDisplay = resolveProductCardDisplay(pageDisplay, cardLayout, buyNow, productCta);
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
    productCta,
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
  elementsRules?: ProductPageElementsRules;
  buyNow?: ResolvedProductBuyNow;
  productCta?: ResolvedProductCtaConfig;
  design?: ResolvedProductCardDesign;
  responsive?: ProductCardResponsiveRules;
}): ProductCardTheme {
  const fallback = defaultProductCardTheme();
  const cardLayout = props.cardLayout ?? fallback.cardLayout;
  const pageDisplay = props.pageDisplay ?? fallback.pageDisplay;
  const buyNow = props.buyNow ?? fallback.buyNow;
  const productCta = props.productCta ?? fallback.productCta;
  const elementsRules = props.elementsRules
    ?? (props.pageDisplay
      ? {
          ...fallback.elementsRules,
          desktop: { ...fallback.elementsRules.desktop, display: pageDisplay },
          tablet: { ...fallback.elementsRules.tablet, display: pageDisplay },
          mobile: { ...fallback.elementsRules.mobile, display: pageDisplay },
        }
      : fallback.elementsRules);
  const cardDisplay = resolveProductCardDisplay(
    elementsRules.desktop.display,
    cardLayout,
    buyNow,
    productCta,
  );
  const design =
    props.design
    ?? buildProductCardDesignFromSite({}, cardLayout).design;
  const responsive =
    props.responsive
    ?? resolveProductCardResponsiveRules(design);
  const legacyVars = props.cardLayoutCssVars ?? productCardLayoutCssVars(cardLayout);
  const designTokens = mergeDesignTokens(legacyVars, design, cardLayout);
  return {
    cardLayout,
    cardLayoutCssVars: designTokens,
    pageDisplay: elementsRules.desktop.display,
    elementsRules,
    cardDisplay,
    buyNow,
    productCta,
    design,
    designTokens,
    designDataAttrs: productCardDesignDataAttrs(design),
    contentOrder: design.contentOrder,
    responsive,
  };
}

export function buildProductCardPreviewTheme(input: {
  design: ResolvedProductCardDesign;
  cardLayout: ResolvedProductCardLayout;
  elementsRules: ProductPageElementsRules;
  buyNow: ResolvedProductBuyNow;
  productCta: ResolvedProductCtaConfig;
  responsivePartial?: ProductCardResponsivePartial | null;
}): ProductCardTheme {
  const cardDisplay = resolveProductCardDisplay(
    input.elementsRules.desktop.display,
    input.cardLayout,
    input.buyNow,
    input.productCta,
  );
  const legacyVars = productCardLayoutCssVars(input.cardLayout);
  const responsive = resolveProductCardResponsiveRules(
    input.design,
    input.responsivePartial,
  );
  const designTokens = mergeDesignTokens(legacyVars, input.design, input.cardLayout);

  return {
    cardLayout: input.cardLayout,
    cardLayoutCssVars: designTokens,
    pageDisplay: input.elementsRules.desktop.display,
    elementsRules: input.elementsRules,
    cardDisplay,
    buyNow: input.buyNow,
    productCta: input.productCta,
    design: input.design,
    designTokens,
    designDataAttrs: productCardDesignDataAttrs(input.design),
    contentOrder: input.design.contentOrder,
    responsive,
  };
}

export function productCardThemeWithDesign(
  base: ProductCardTheme,
  design: ResolvedProductCardDesign,
  options?: { responsivePartial?: ProductCardResponsivePartial | null },
): ProductCardTheme {
  const responsive = resolveProductCardResponsiveRules(
    design,
    options?.responsivePartial,
  );
  const legacyVars = productCardLayoutCssVars(base.cardLayout);
  const designTokens = mergeDesignTokens(legacyVars, design, base.cardLayout);
  return {
    ...base,
    design,
    responsive,
    designTokens,
    designDataAttrs: productCardDesignDataAttrs(design),
    contentOrder: design.contentOrder,
    cardLayoutCssVars: designTokens,
  };
}
