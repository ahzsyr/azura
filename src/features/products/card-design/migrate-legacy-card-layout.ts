import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import type { ProductCardDesignPartial, ProductCardHoverEffect } from "./product-card-design.types";

/** Map legacy productCardLayout fields into v2 design partial when productCardDesign is absent. */
export function migrateLegacyCardLayoutToDesign(
  layout: ResolvedProductCardLayout,
): ProductCardDesignPartial {
  const hoverMap: Record<string, ProductCardHoverEffect> = {
    lift: "lift",
    glow: "glow",
    scale_image: "scale_image",
    none: "none",
  };

  return {
    hoverEffect: hoverMap[layout.hoverBehavior] ?? "lift",
    badgePosition:
      layout.badgePosition === "top-right" ? "top-right" : "top-left",
    inheritThemePreset: layout.inheritThemePreset,
    media: {
      effect: layout.hoverBehavior === "scale_image" ? "zoom" : "none",
    },
    actions: {
      primaryAction: layout.cardPrimaryAction === "cta" ? "cta" : "buy_now",
    },
  };
}

/** Sync resolved v2 design back to legacy cardLayout fields for dual-write compat. */
export function designToLegacyLayoutPatch(
  design: ProductCardDesignPartial,
  current: ResolvedProductCardLayout,
): Partial<ResolvedProductCardLayout> {
  const patch: Partial<ResolvedProductCardLayout> = {};
  const hover = design.hoverEffect ?? current.hoverBehavior;
  if (hover === "lift" || hover === "glow" || hover === "scale_image" || hover === "none") {
    patch.hoverBehavior = hover;
  }
  if (design.badgePosition === "top-left" || design.badgePosition === "top-right") {
    patch.badgePosition = design.badgePosition;
  }
  if (typeof design.inheritThemePreset === "boolean") {
    patch.inheritThemePreset = design.inheritThemePreset;
  }
  if (design.actions?.primaryAction) {
    patch.cardPrimaryAction = design.actions.primaryAction === "cta" ? "cta" : "buy_now";
  }
  return patch;
}
