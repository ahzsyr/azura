/**
 * Appearance tokens for storefront product CTAs (page vs card contexts).
 * Merged: product override → global site.json → built-in defaults.
 */

export type ProductCtaButtonSize = "sm" | "md" | "lg";

export type ProductCtaShadowPreset = "none" | "sm" | "md" | "lg" | "elevated";

export type ProductCtaHoverAnimation = "none" | "lift" | "glow" | "scale" | "underline";

export type ProductCtaIconPosition = "start" | "end";

export type ProductCtaAlignment = "start" | "center" | "end" | "stretch";

export type ProductCtaPositionMode = "static" | "sticky" | "fixed";

export type ProductCtaMobileBehavior = "inherit" | "full_width" | "compact" | "hide";

export type ProductCtaTextTransform = "none" | "uppercase" | "lowercase" | "capitalize";

/** Nested block in site.json / product JSON: shared defaults + per-context overrides. */
export interface ProductCtaAppearanceNestPartial {
  shared?: ProductCtaAppearancePartial;
  page?: ProductCtaAppearancePartial;
  card?: ProductCtaAppearancePartial;
}

export interface ProductCtaAppearancePartial {
  buttonSize?: ProductCtaButtonSize;
  /** Pixel radius; omit or null to use theme token --az-radius-md */
  borderRadiusPx?: number | null;
  paddingBlock?: string;
  paddingInline?: string;
  fontSize?: string;
  fontWeight?: string | number;
  letterSpacing?: string;
  textTransform?: ProductCtaTextTransform;
  iconPosition?: ProductCtaIconPosition;
  iconSize?: string;
  fullWidth?: boolean;
  shadow?: ProductCtaShadowPreset;
  hoverAnimation?: ProductCtaHoverAnimation;
  transitionMs?: number;
  positionMode?: ProductCtaPositionMode;
  alignment?: ProductCtaAlignment;
  mobileBehavior?: ProductCtaMobileBehavior;
  /** When true, numeric/themed colors come from active theme preset */
  inheritThemePreset?: boolean;
  /** Named admin preset for future theme packs */
  customPresetId?: string | null;
  /** Page: pin CTA while scrolling; card: keep chip visible on scroll */
  floatingOnScroll?: boolean;
  /** Custom width when not full width, e.g. 12rem or 240px */
  buttonWidthCss?: string;
}

export interface ProductCtaAppearanceResolved
  extends Required<Omit<ProductCtaAppearancePartial, "borderRadiusPx" | "customPresetId" | "buttonWidthCss">> {
  borderRadiusPx: number | null;
  customPresetId: string | null;
  buttonWidthCss: string;
}

const APPEARANCE_DEFAULTS: ProductCtaAppearanceResolved = {
  buttonSize: "md",
  borderRadiusPx: null,
  paddingBlock: "",
  paddingInline: "",
  fontSize: "",
  fontWeight: "",
  letterSpacing: "",
  textTransform: "uppercase",
  iconPosition: "start",
  iconSize: "",
  fullWidth: false,
  shadow: "sm",
  hoverAnimation: "lift",
  transitionMs: 200,
  positionMode: "static",
  alignment: "stretch",
  mobileBehavior: "inherit",
  inheritThemePreset: true,
  customPresetId: null,
  floatingOnScroll: false,
  buttonWidthCss: "",
};

export const DEFAULT_PRODUCT_CTA_APPEARANCE_PAGE: ProductCtaAppearanceResolved = { ...APPEARANCE_DEFAULTS };

export const DEFAULT_PRODUCT_CTA_APPEARANCE_CARD: ProductCtaAppearanceResolved = {
  ...APPEARANCE_DEFAULTS,
  buttonSize: "sm",
  shadow: "elevated",
  alignment: "end",
};

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

function str(v: unknown, fb: string): string {
  return typeof v === "string" ? v : fb;
}

function isButtonSize(v: unknown): v is ProductCtaButtonSize {
  return v === "sm" || v === "md" || v === "lg";
}

function isShadow(v: unknown): v is ProductCtaShadowPreset {
  return v === "none" || v === "sm" || v === "md" || v === "lg" || v === "elevated";
}

function isHover(v: unknown): v is ProductCtaHoverAnimation {
  return v === "none" || v === "lift" || v === "glow" || v === "scale" || v === "underline";
}

function isIconPos(v: unknown): v is ProductCtaIconPosition {
  return v === "start" || v === "end";
}

function isAlign(v: unknown): v is ProductCtaAlignment {
  return v === "start" || v === "center" || v === "end" || v === "stretch";
}

function isPosMode(v: unknown): v is ProductCtaPositionMode {
  return v === "static" || v === "sticky" || v === "fixed";
}

function isMobile(v: unknown): v is ProductCtaMobileBehavior {
  return v === "inherit" || v === "full_width" || v === "compact" || v === "hide";
}

function isTextTransform(v: unknown): v is ProductCtaTextTransform {
  return v === "none" || v === "uppercase" || v === "lowercase" || v === "capitalize";
}

/** Normalize a partial appearance fragment from JSON. */
export function normalizeProductCtaAppearancePartial(raw: unknown): ProductCtaAppearancePartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductCtaAppearancePartial = {};
  if (isButtonSize(o.buttonSize)) out.buttonSize = o.buttonSize;
  if (o.borderRadiusPx === null) out.borderRadiusPx = null;
  else {
    const n = num(o.borderRadiusPx);
    if (n !== undefined) out.borderRadiusPx = n;
  }
  if (typeof o.paddingBlock === "string") out.paddingBlock = o.paddingBlock;
  if (typeof o.paddingInline === "string") out.paddingInline = o.paddingInline;
  if (typeof o.fontSize === "string") out.fontSize = o.fontSize;
  if (typeof o.fontWeight === "string" || typeof o.fontWeight === "number") out.fontWeight = o.fontWeight as string | number;
  if (typeof o.letterSpacing === "string") out.letterSpacing = o.letterSpacing;
  if (isTextTransform(o.textTransform)) out.textTransform = o.textTransform;
  if (isIconPos(o.iconPosition)) out.iconPosition = o.iconPosition;
  if (typeof o.iconSize === "string") out.iconSize = o.iconSize;
  if (typeof o.fullWidth === "boolean") out.fullWidth = o.fullWidth;
  if (isShadow(o.shadow)) out.shadow = o.shadow;
  if (isHover(o.hoverAnimation)) out.hoverAnimation = o.hoverAnimation;
  const tm = num(o.transitionMs);
  if (tm !== undefined) out.transitionMs = Math.max(0, Math.min(2000, Math.round(tm)));
  if (isPosMode(o.positionMode)) out.positionMode = o.positionMode;
  if (isAlign(o.alignment)) out.alignment = o.alignment;
  if (isMobile(o.mobileBehavior)) out.mobileBehavior = o.mobileBehavior;
  if (typeof o.inheritThemePreset === "boolean") out.inheritThemePreset = o.inheritThemePreset;
  if (o.customPresetId === null) out.customPresetId = null;
  else if (typeof o.customPresetId === "string") out.customPresetId = o.customPresetId;
  if (typeof o.floatingOnScroll === "boolean") out.floatingOnScroll = o.floatingOnScroll;
  if (typeof o.buttonWidthCss === "string") out.buttonWidthCss = o.buttonWidthCss;
  return Object.keys(out).length ? out : undefined;
}

export function mergeProductCtaAppearance(
  base: ProductCtaAppearanceResolved,
  partial?: ProductCtaAppearancePartial | null,
): ProductCtaAppearanceResolved {
  if (!partial) return base;
  return {
    buttonSize: partial.buttonSize ?? base.buttonSize,
    borderRadiusPx: partial.borderRadiusPx !== undefined ? partial.borderRadiusPx : base.borderRadiusPx,
    paddingBlock: partial.paddingBlock !== undefined ? str(partial.paddingBlock, base.paddingBlock) : base.paddingBlock,
    paddingInline: partial.paddingInline !== undefined ? str(partial.paddingInline, base.paddingInline) : base.paddingInline,
    fontSize: partial.fontSize !== undefined ? str(partial.fontSize, base.fontSize) : base.fontSize,
    fontWeight: partial.fontWeight !== undefined ? partial.fontWeight : base.fontWeight,
    letterSpacing: partial.letterSpacing !== undefined ? str(partial.letterSpacing, base.letterSpacing) : base.letterSpacing,
    textTransform: partial.textTransform ?? base.textTransform,
    iconPosition: partial.iconPosition ?? base.iconPosition,
    iconSize: partial.iconSize !== undefined ? str(partial.iconSize, base.iconSize) : base.iconSize,
    fullWidth: partial.fullWidth ?? base.fullWidth,
    shadow: partial.shadow ?? base.shadow,
    hoverAnimation: partial.hoverAnimation ?? base.hoverAnimation,
    transitionMs: partial.transitionMs ?? base.transitionMs,
    positionMode: partial.positionMode ?? base.positionMode,
    alignment: partial.alignment ?? base.alignment,
    mobileBehavior: partial.mobileBehavior ?? base.mobileBehavior,
    inheritThemePreset: partial.inheritThemePreset ?? base.inheritThemePreset,
    customPresetId: partial.customPresetId !== undefined ? partial.customPresetId : base.customPresetId,
    floatingOnScroll: partial.floatingOnScroll ?? base.floatingOnScroll,
    buttonWidthCss:
      partial.buttonWidthCss !== undefined ? str(partial.buttonWidthCss, base.buttonWidthCss) : base.buttonWidthCss,
  };
}

export function productCtaButtonSizeClass(size: ProductCtaButtonSize): string {
  switch (size) {
    case "sm":
      return "prd-cta-btn--sz-sm";
    case "lg":
      return "prd-cta-btn--sz-lg";
    default:
      return "prd-cta-btn--sz-md";
  }
}

export function productCtaShadowClass(shadow: ProductCtaShadowPreset): string {
  return `prd-cta-shadow--${shadow}`;
}

export function productCtaHoverAnimClass(anim: ProductCtaHoverAnimation): string {
  return anim === "none" ? "" : `prd-cta-hover--${anim}`;
}

/** Inline style object for CSS variables consumed by ProductCtaButton. */
export function productCtaAppearanceToStyle(
  a: ProductCtaAppearanceResolved,
): Record<string, string> {
  const style: Record<string, string> = {
    "--prd-cta-transition-ms": `${a.transitionMs}ms`,
  };
  if (a.borderRadiusPx != null && Number.isFinite(a.borderRadiusPx) && a.borderRadiusPx >= 0) {
    style["--prd-cta-radius"] = `${a.borderRadiusPx}px`;
  }
  const pb = a.paddingBlock.trim();
  const pi = a.paddingInline.trim();
  if (pb) style["--prd-cta-pad-y"] = pb;
  if (pi) style["--prd-cta-pad-x"] = pi;
  const fs = a.fontSize.trim();
  if (fs) style["--prd-cta-font-size"] = fs;
  const fw = a.fontWeight === "" || a.fontWeight == null ? "" : String(a.fontWeight);
  if (fw) style["--prd-cta-font-weight"] = fw;
  const ls = a.letterSpacing.trim();
  if (ls) style["--prd-cta-letter-spacing"] = ls;
  style["--prd-cta-text-transform"] = a.textTransform;
  const isz = a.iconSize.trim();
  if (isz) style["--prd-cta-icon-size"] = isz;
  const bw = a.buttonWidthCss.trim();
  if (bw && !a.fullWidth) style["--prd-cta-width"] = bw;
  return style;
}

export function productCtaWrapAlignClass(alignment: ProductCtaAlignment, placement: "inline" | "card"): string {
  if (placement === "card" && alignment === "stretch") return "prd-cta-wrap--align-end";
  switch (alignment) {
    case "center":
      return "prd-cta-wrap--align-center";
    case "end":
      return "prd-cta-wrap--align-end";
    case "stretch":
      return "prd-cta-wrap--align-stretch";
    default:
      return "prd-cta-wrap--align-start";
  }
}

/** Build a partial of only keys that differ from global (for per-product appearance overrides). */
export function diffResolvedAppearance(
  globalResolved: ProductCtaAppearanceResolved,
  edited: ProductCtaAppearanceResolved,
): ProductCtaAppearancePartial {
  const out: ProductCtaAppearancePartial = {};
  (Object.keys(edited) as (keyof ProductCtaAppearanceResolved)[]).forEach((k) => {
    if (edited[k] !== globalResolved[k]) {
      (out as Record<string, unknown>)[k] = edited[k];
    }
  });
  return out;
}