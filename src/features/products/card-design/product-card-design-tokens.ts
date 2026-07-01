import {
  productCardLayoutCssVars,
  type ResolvedProductCardLayout,
} from "@/features/products/lib/product-storefront-layout";
import type {
  ProductCardDesignTokens,
  ProductCardMotionPreset,
  ResolvedProductCardDesign,
} from "./product-card-design.types";

function motionToCss(motion: ProductCardMotionPreset): Record<string, string> {
  switch (motion) {
    case "subtle":
      return {
        "--prd-motion-fast": "120ms",
        "--prd-motion-normal": "200ms",
        "--prd-motion-slow": "320ms",
        "--prd-motion-ease": "cubic-bezier(0.22, 1, 0.36, 1)",
      };
    case "premium":
      return {
        "--prd-motion-fast": "160ms",
        "--prd-motion-normal": "280ms",
        "--prd-motion-slow": "420ms",
        "--prd-motion-ease": "cubic-bezier(0.22, 1, 0.36, 1)",
      };
    case "interactive":
      return {
        "--prd-motion-fast": "100ms",
        "--prd-motion-normal": "180ms",
        "--prd-motion-slow": "260ms",
        "--prd-motion-ease": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      };
    case "luxury":
      return {
        "--prd-motion-fast": "240ms",
        "--prd-motion-normal": "480ms",
        "--prd-motion-slow": "720ms",
        "--prd-motion-ease": "cubic-bezier(0.16, 1, 0.3, 1)",
      };
    case "disabled":
      return {
        "--prd-motion-fast": "0ms",
        "--prd-motion-normal": "0ms",
        "--prd-motion-slow": "0ms",
        "--prd-motion-ease": "linear",
      };
    default:
      return {};
  }
}

function styleToCss(style: ResolvedProductCardDesign["style"]): Record<string, string> {
  switch (style) {
    case "minimal":
      return {
        "--prd-card-shadow": "0 1px 4px -2px rgba(0,0,0,0.08)",
        "--prd-card-pad": "0.65rem 0.75rem 0.8rem",
      };
    case "luxury":
      return {
        "--prd-card-shadow": "0 18px 44px -14px rgba(0,0,0,0.18)",
        "--prd-card-pad": "1rem 1.1rem 1.15rem",
        "--prd-card-title-fs": "1rem",
      };
    case "glass":
      return { "--prd-card-glass": "1" };
    case "editorial":
      return { "--prd-card-media-ar": "3 / 4", "--prd-card-pad": "0.85rem 0.9rem 1rem" };
    case "dark_premium":
      return { "--prd-card-glow": "1" };
    case "neon_tech":
      return { "--prd-card-neon": "1", "--prd-card-glow": "1" };
    case "b2b_catalog":
      return { "--prd-card-shadow": "none", "--prd-card-pad": "0.5rem 0.6rem 0.65rem" };
    default:
      return {};
  }
}

/** Map legacy hover to data attr compatible value. */
function legacyHoverFromDesign(hover: ResolvedProductCardDesign["hoverEffect"]): string {
  if (hover === "lift" || hover === "glow" || hover === "scale_image" || hover === "none") {
    return hover;
  }
  return hover;
}

export function productCardDesignDataAttrs(design: ResolvedProductCardDesign): Record<string, string> {
  return {
    "data-prd-style": design.style,
    "data-prd-layout": design.layout,
    "data-prd-motion": design.motion,
    "data-prd-card-hover": legacyHoverFromDesign(design.hoverEffect),
    "data-prd-hover": design.hoverEffect,
    "data-prd-pricing": design.pricingMode,
    "data-prd-content-align": design.contentAlignment,
    "data-prd-surface": design.cardSurface,
    "data-prd-card-badge":
      design.badgePosition === "top-right"
        ? "top-right"
        : design.badgePosition === "bottom"
          ? "bottom"
          : design.badgePosition === "inline"
            ? "inline"
            : "top-left",
    "data-prd-effects": design.effects.enabled ? "true" : "false",
    "data-prd-media-effect": design.media.effect,
    "data-prd-personalization-recent": design.personalization.highlightRecent ? "true" : "false",
    "data-prd-personalization-reco": design.personalization.highlightRecommended ? "true" : "false",
    "data-prd-personalization-trend": design.personalization.highlightTrending ? "true" : "false",
  };
}

export function productCardDesignCssVars(
  design: ResolvedProductCardDesign,
  legacyLayout?: ResolvedProductCardLayout,
): ProductCardDesignTokens {
  const legacyVars = legacyLayout ? productCardLayoutCssVars(legacyLayout) : {};
  return {
    ...legacyVars,
    ...styleToCss(design.style),
    ...motionToCss(design.motion),
    "--prd-card-overlay": legacyVars["--prd-card-overlay"] ?? "35%",
  };
}

export function mergeDesignTokens(
  legacyVars: Record<string, string>,
  design: ResolvedProductCardDesign,
  legacyLayout?: ResolvedProductCardLayout,
): ProductCardDesignTokens {
  return {
    ...legacyVars,
    ...productCardDesignCssVars(design, legacyLayout),
  };
}
