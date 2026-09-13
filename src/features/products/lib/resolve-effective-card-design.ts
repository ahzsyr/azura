import {
  mergeDesignTokens,
  productCardDesignDataAttrs,
} from "@/features/products/card-design/product-card-design-tokens";
import type {
  ProductCardContentSlot,
  ProductCardResponsiveRules,
  ResolvedProductCardDesign,
} from "@/features/products/card-design/product-card-design.types";
import { resolveResponsiveDesignForDevice } from "@/features/products/card-design/resolve-product-card-responsive";
import type { ProductPageViewport } from "@/features/products/lib/product-pdp-breakpoints";
import {
  productCardLayoutCssVars,
  type ResolvedProductCardLayout,
} from "@/features/products/lib/product-storefront-layout";

export type ProductCardResponsiveViewport = keyof ProductCardResponsiveRules;

export function viewportToResponsiveDevice(
  viewport: ProductPageViewport,
): ProductCardResponsiveViewport {
  if (viewport === "desktop") return "desktop";
  if (viewport === "tablet") return "tablet";
  return "mobile";
}

export function resolveEffectiveCardDesignState(input: {
  design: ResolvedProductCardDesign;
  responsive: ProductCardResponsiveRules;
  cardLayout: ResolvedProductCardLayout;
  viewport: ProductPageViewport;
}): {
  design: ResolvedProductCardDesign;
  designTokens: Record<string, string>;
  designDataAttrs: Record<string, string>;
  contentOrder: ProductCardContentSlot[];
} {
  const device = viewportToResponsiveDevice(input.viewport);
  const design = resolveResponsiveDesignForDevice(input.responsive, device);
  const legacyVars = productCardLayoutCssVars(input.cardLayout);
  const designTokens = mergeDesignTokens(legacyVars, design, input.cardLayout);

  return {
    design,
    designTokens,
    designDataAttrs: productCardDesignDataAttrs(design),
    contentOrder: design.contentOrder,
  };
}
