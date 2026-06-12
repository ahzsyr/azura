import type { ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import { applyProductCardPreset } from "./product-card-presets";
import { migrateLegacyCardLayoutToDesign } from "./migrate-legacy-card-layout";
import {
  DEFAULT_CONTENT_ORDER,
  type ProductCardBadgeRule,
  type ProductCardContentSlot,
  type ProductCardDesignPartial,
  type ProductCardHoverEffect,
  type ProductCardLayoutMode,
  type ProductCardMotionPreset,
  type ProductCardPricingMode,
  type ProductCardResponsivePartial,
  type ProductCardResponsiveRules,
  type ProductCardStylePreset,
  type ResolvedProductCardActions,
  type ResolvedProductCardDesign,
} from "./product-card-design.types";

const DEFAULT_BADGE_RULES: ProductCardBadgeRule[] = [
  { type: "sale", enabled: true, priority: 10 },
  { type: "low_stock", enabled: true, priority: 20 },
  { type: "new", enabled: true, tagPrefix: "badge:new", priority: 30 },
  { type: "bestseller", enabled: true, tagPrefix: "badge:bestseller", priority: 40 },
  { type: "trending", enabled: true, tagPrefix: "badge:trending", priority: 50 },
];

export const DESIGN_DEFAULTS: ResolvedProductCardDesign = {
  presetId: "modern_commerce",
  style: "modern_commerce",
  layout: "classic_grid",
  motion: "premium",
  hoverEffect: "lift",
  pricingMode: "retail",
  contentOrder: [...DEFAULT_CONTENT_ORDER],
  badgePosition: "top-left",
  maxBadges: 3,
  badgeRules: DEFAULT_BADGE_RULES,
  showCategory: false,
  effects: {
    enabled: false,
    gradientBorder: false,
    glow: false,
    glassLayer: false,
    lightSweep: false,
    noiseTexture: false,
  },
  media: {
    hoverSwap: true,
    galleryEnabled: false,
    maxGalleryImages: 4,
    effect: "zoom",
    showSkeleton: true,
  },
  actions: {
    enabledTypes: ["buy_now", "quote", "wishlist", "compare", "quick_view"],
    customActions: [],
    primaryAction: "buy_now",
  },
  personalization: {
    highlightRecent: false,
    highlightRecommended: false,
    highlightTrending: false,
  },
  inheritThemePreset: true,
};

const STYLE_PRESETS: ProductCardStylePreset[] = [
  "minimal", "modern_commerce", "luxury", "glass", "editorial",
  "dark_premium", "neon_tech", "electronics", "fashion", "furniture", "b2b_catalog",
];

const LAYOUT_MODES: ProductCardLayoutMode[] = [
  "classic_grid", "compact_store", "marketplace", "luxury_showcase",
  "editorial", "horizontal", "floating", "split", "masonry", "adaptive",
];

const MOTION_PRESETS: ProductCardMotionPreset[] = [
  "subtle", "premium", "interactive", "luxury", "disabled",
];

const HOVER_EFFECTS: ProductCardHoverEffect[] = [
  "lift", "glow", "scale_image", "none", "tilt", "spotlight",
  "magnetic", "reveal", "depth", "cinematic", "liquid",
];

const PRICING_MODES: ProductCardPricingMode[] = [
  "minimal", "retail", "marketplace", "luxury", "enterprise",
];

function isStyle(v: unknown): v is ProductCardStylePreset {
  return typeof v === "string" && STYLE_PRESETS.includes(v as ProductCardStylePreset);
}

function isLayout(v: unknown): v is ProductCardLayoutMode {
  return typeof v === "string" && LAYOUT_MODES.includes(v as ProductCardLayoutMode);
}

function isMotion(v: unknown): v is ProductCardMotionPreset {
  return typeof v === "string" && MOTION_PRESETS.includes(v as ProductCardMotionPreset);
}

function isHover(v: unknown): v is ProductCardHoverEffect {
  return typeof v === "string" && HOVER_EFFECTS.includes(v as ProductCardHoverEffect);
}

function isPricing(v: unknown): v is ProductCardPricingMode {
  return typeof v === "string" && PRICING_MODES.includes(v as ProductCardPricingMode);
}

function isContentSlot(v: unknown): v is ProductCardContentSlot {
  const slots: ProductCardContentSlot[] = [
    "brand", "category", "title", "badges", "description",
    "features", "price", "rating", "stock", "actions",
  ];
  return typeof v === "string" && slots.includes(v as ProductCardContentSlot);
}

export function normalizeProductCardDesignPartial(raw: unknown): ProductCardDesignPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductCardDesignPartial = {};

  if (isStyle(o.presetId)) out.presetId = o.presetId;
  if (isStyle(o.style)) out.style = o.style;
  if (isLayout(o.layout)) out.layout = o.layout;
  if (isMotion(o.motion)) out.motion = o.motion;
  if (isHover(o.hoverEffect)) out.hoverEffect = o.hoverEffect;
  if (isPricing(o.pricingMode)) out.pricingMode = o.pricingMode;
  if (typeof o.showCategory === "boolean") out.showCategory = o.showCategory;
  if (typeof o.inheritThemePreset === "boolean") out.inheritThemePreset = o.inheritThemePreset;
  if (o.badgePosition === "top-left" || o.badgePosition === "top-right" || o.badgePosition === "bottom" || o.badgePosition === "inline") {
    out.badgePosition = o.badgePosition;
  }
  if (typeof o.maxBadges === "number" && Number.isFinite(o.maxBadges)) {
    out.maxBadges = Math.max(1, Math.min(6, o.maxBadges));
  }
  if (Array.isArray(o.contentOrder)) {
    const order = o.contentOrder.filter(isContentSlot);
    if (order.length) out.contentOrder = order;
  }
  if (Array.isArray(o.badgeRules)) {
    out.badgeRules = o.badgeRules.filter(
      (r): r is ProductCardBadgeRule =>
        !!r && typeof r === "object" && typeof (r as ProductCardBadgeRule).type === "string",
    );
  }
  if (o.effects && typeof o.effects === "object") {
    const e = o.effects as Record<string, unknown>;
    out.effects = {
      enabled: typeof e.enabled === "boolean" ? e.enabled : undefined,
      gradientBorder: typeof e.gradientBorder === "boolean" ? e.gradientBorder : undefined,
      glow: typeof e.glow === "boolean" ? e.glow : undefined,
      glassLayer: typeof e.glassLayer === "boolean" ? e.glassLayer : undefined,
      lightSweep: typeof e.lightSweep === "boolean" ? e.lightSweep : undefined,
      noiseTexture: typeof e.noiseTexture === "boolean" ? e.noiseTexture : undefined,
    };
  }
  if (o.media && typeof o.media === "object") {
    const m = o.media as Record<string, unknown>;
    out.media = {
      hoverSwap: typeof m.hoverSwap === "boolean" ? m.hoverSwap : undefined,
      galleryEnabled: typeof m.galleryEnabled === "boolean" ? m.galleryEnabled : undefined,
      maxGalleryImages: typeof m.maxGalleryImages === "number" ? m.maxGalleryImages : undefined,
      effect: m.effect === "none" || m.effect === "zoom" || m.effect === "tilt" || m.effect === "parallax" || m.effect === "blur_reveal"
        ? m.effect
        : undefined,
      showSkeleton: typeof m.showSkeleton === "boolean" ? m.showSkeleton : undefined,
    };
  }
  if (o.actions && typeof o.actions === "object") {
    const a = o.actions as Record<string, unknown>;
    out.actions = {
      primaryAction: a.primaryAction === "quote" ? "quote" : a.primaryAction === "buy_now" ? "buy_now" : undefined,
      enabledTypes: Array.isArray(a.enabledTypes) ? a.enabledTypes.filter((t): t is ResolvedProductCardActions["enabledTypes"][number] => typeof t === "string") : undefined,
      customActions: Array.isArray(a.customActions) ? a.customActions as ResolvedProductCardActions["customActions"] : undefined,
    };
  }
  if (o.personalization && typeof o.personalization === "object") {
    const p = o.personalization as Record<string, unknown>;
    out.personalization = {
      highlightRecent: typeof p.highlightRecent === "boolean" ? p.highlightRecent : undefined,
      highlightRecommended: typeof p.highlightRecommended === "boolean" ? p.highlightRecommended : undefined,
      highlightTrending: typeof p.highlightTrending === "boolean" ? p.highlightTrending : undefined,
    };
  }

  return Object.keys(out).length ? out : undefined;
}

function mergePartial(base: ResolvedProductCardDesign, partial: ProductCardDesignPartial): ResolvedProductCardDesign {
  const style = partial.style ?? partial.presetId ?? base.style;
  return {
    presetId: partial.presetId ?? base.presetId,
    style,
    layout: partial.layout ?? base.layout,
    motion: partial.motion ?? base.motion,
    hoverEffect: partial.hoverEffect ?? base.hoverEffect,
    pricingMode: partial.pricingMode ?? base.pricingMode,
    contentOrder: partial.contentOrder ?? base.contentOrder,
    badgePosition: partial.badgePosition ?? base.badgePosition,
    maxBadges: partial.maxBadges ?? base.maxBadges,
    badgeRules: partial.badgeRules ?? base.badgeRules,
    showCategory: partial.showCategory ?? base.showCategory,
    effects: { ...base.effects, ...partial.effects },
    media: { ...base.media, ...partial.media },
    actions: { ...base.actions, ...partial.actions },
    personalization: { ...base.personalization, ...partial.personalization },
    inheritThemePreset: partial.inheritThemePreset ?? base.inheritThemePreset,
  };
}

export function resolveProductCardDesign(input: {
  partial?: ProductCardDesignPartial | null;
  legacyLayout?: ResolvedProductCardLayout | null;
}): ResolvedProductCardDesign {
  let merged: ProductCardDesignPartial = {};

  if (input.legacyLayout) {
    merged = { ...merged, ...migrateLegacyCardLayoutToDesign(input.legacyLayout) };
  }

  if (input.partial) {
    merged = { ...merged, ...input.partial };
  }

  if (merged.presetId && isStyle(merged.presetId)) {
    merged = applyProductCardPreset(merged.presetId, merged);
  }

  return mergePartial({ ...DESIGN_DEFAULTS }, merged);
}

function mergeResponsiveLayer(
  parent: ResolvedProductCardDesign,
  layer?: ProductCardDesignPartial | null,
): ResolvedProductCardDesign {
  if (!layer) return parent;
  return mergePartial(parent, layer);
}

export function resolveProductCardResponsiveRules(
  base: ResolvedProductCardDesign,
  responsive?: ProductCardResponsivePartial | null,
): ProductCardResponsiveRules {
  const desktop = mergeResponsiveLayer(base, responsive?.desktop);
  const tablet = mergeResponsiveLayer(desktop, responsive?.tablet);
  const mobile = mergeResponsiveLayer(tablet, responsive?.mobile);
  const smallMobile = mergeResponsiveLayer(mobile, responsive?.smallMobile);
  return { desktop, tablet, mobile, smallMobile };
}

export function serializeProductCardDesignForSite(
  design: ResolvedProductCardDesign,
): ProductCardDesignPartial {
  const o: ProductCardDesignPartial = {};
  if (design.presetId !== DESIGN_DEFAULTS.presetId) o.presetId = design.presetId;
  if (design.style !== DESIGN_DEFAULTS.style) o.style = design.style;
  if (design.layout !== DESIGN_DEFAULTS.layout) o.layout = design.layout;
  if (design.motion !== DESIGN_DEFAULTS.motion) o.motion = design.motion;
  if (design.hoverEffect !== DESIGN_DEFAULTS.hoverEffect) o.hoverEffect = design.hoverEffect;
  if (design.pricingMode !== DESIGN_DEFAULTS.pricingMode) o.pricingMode = design.pricingMode;
  if (design.showCategory !== DESIGN_DEFAULTS.showCategory) o.showCategory = design.showCategory;
  if (design.inheritThemePreset !== DESIGN_DEFAULTS.inheritThemePreset) o.inheritThemePreset = design.inheritThemePreset;
  if (design.badgePosition !== DESIGN_DEFAULTS.badgePosition) o.badgePosition = design.badgePosition;
  if (design.maxBadges !== DESIGN_DEFAULTS.maxBadges) o.maxBadges = design.maxBadges;
  if (JSON.stringify(design.contentOrder) !== JSON.stringify(DESIGN_DEFAULTS.contentOrder)) {
    o.contentOrder = design.contentOrder;
  }
  if (JSON.stringify(design.badgeRules) !== JSON.stringify(DESIGN_DEFAULTS.badgeRules)) {
    o.badgeRules = design.badgeRules;
  }
  const effectsChanged = JSON.stringify(design.effects) !== JSON.stringify(DESIGN_DEFAULTS.effects);
  if (effectsChanged) o.effects = design.effects;
  const mediaChanged = JSON.stringify(design.media) !== JSON.stringify(DESIGN_DEFAULTS.media);
  if (mediaChanged) o.media = design.media;
  const actionsChanged = JSON.stringify(design.actions) !== JSON.stringify(DESIGN_DEFAULTS.actions);
  if (actionsChanged) o.actions = design.actions;
  const persChanged = JSON.stringify(design.personalization) !== JSON.stringify(DESIGN_DEFAULTS.personalization);
  if (persChanged) o.personalization = design.personalization;
  return o;
}

export function buildProductCardDesignFromSite(
  site: Record<string, unknown>,
  legacyLayout?: ResolvedProductCardLayout,
): {
  design: ResolvedProductCardDesign;
  responsive: ProductCardResponsiveRules;
} {
  const partial = normalizeProductCardDesignPartial(site.productCardDesign);
  const responsiveRaw = site.productCardDesignResponsive as ProductCardResponsivePartial | undefined;
  const design = resolveProductCardDesign({ partial, legacyLayout });
  const responsive = resolveProductCardResponsiveRules(design, responsiveRaw);
  return { design, responsive };
}
