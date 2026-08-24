/**
 * Shared class/style helpers for ProductCtaButton (Astro) — keeps markup DRY.
 */
import type { ResolvedProductCtaConfig } from "./product-cta";
import {
  productCtaAppearanceToStyle,
  productCtaButtonSizeClass,
  productCtaHoverAnimClass,
  productCtaShadowClass,
  productCtaWrapAlignClass,
} from "./product-cta-appearance";
import { productCtaCssVariant } from "./product-cta";

export type ProductCtaPlacement = "inline" | "floating" | "card";

export function productCtaAppearanceContext(placement: ProductCtaPlacement): "page" | "card" {
  return placement === "card" ? "card" : "page";
}

export function productCtaButtonClassList(
  config: ResolvedProductCtaConfig,
  placement: ProductCtaPlacement,
): string[] {
  const ctx = productCtaAppearanceContext(placement);
  const a = config.appearance[ctx];
  const classes = [
    "prd-cta-btn",
    productCtaCssVariant(config.variant),
    productCtaButtonSizeClass(a.buttonSize),
    productCtaShadowClass(a.shadow),
    productCtaHoverAnimClass(a.hoverAnimation),
    a.iconPosition === "end" ? "prd-cta-btn--icon-end" : "prd-cta-btn--icon-start",
    a.fullWidth ? "prd-cta-btn--full" : "",
    a.mobileBehavior === "full_width" ? "prd-cta-btn--mob-full" : "",
    a.mobileBehavior === "compact" ? "prd-cta-btn--mob-compact" : "",
    a.mobileBehavior === "hide" ? "prd-cta-btn--mob-hide" : "",
  ];
  return classes.filter(Boolean);
}

export function productCtaWrapClassList(
  config: ResolvedProductCtaConfig,
  placement: ProductCtaPlacement,
  cardVisibility: ResolvedProductCtaConfig["cardVisibility"],
): string[] {
  const ctx = productCtaAppearanceContext(placement);
  const a = config.appearance[ctx];
  const base = ["prd-cta-wrap", productCtaWrapAlignClass(a.alignment, placement === "card" ? "card" : "inline")];
  if (placement === "card") {
    base.push("prd-cta-wrap--card-floating");
    base.push(cardVisibility === "hover" ? "prd-cta-wrap--card-hover" : "prd-cta-wrap--card-always");
  }
  if (placement === "inline" && a.positionMode === "sticky") base.push("prd-cta-wrap--sticky");
  if (placement === "inline" && a.positionMode === "fixed") base.push("prd-cta-wrap--fixed-bar");
  if (placement === "floating") base.push("prd-cta-wrap--page-float");
  if (a.floatingOnScroll && placement !== "inline") base.push("prd-cta-wrap--float-scroll");
  return base;
}

export function productCtaWrapStyle(
  config: ResolvedProductCtaConfig,
  placement: ProductCtaPlacement,
): Record<string, string> {
  const ctx = productCtaAppearanceContext(placement);
  return productCtaAppearanceToStyle(config.appearance[ctx]);
}
