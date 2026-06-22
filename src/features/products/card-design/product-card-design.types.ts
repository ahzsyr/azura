import type { ProductCardHoverBehavior, ResolvedProductCardLayout } from "@/features/products/lib/product-storefront-layout";

/** Visual style presets for product cards. */
export type ProductCardStylePreset =
  | "minimal"
  | "modern_commerce"
  | "luxury"
  | "glass"
  | "editorial"
  | "dark_premium"
  | "neon_tech"
  | "electronics"
  | "fashion"
  | "furniture"
  | "b2b_catalog";

/** Card layout modes. */
export type ProductCardLayoutMode =
  | "classic_grid"
  | "compact_store"
  | "marketplace"
  | "luxury_showcase"
  | "editorial"
  | "horizontal"
  | "floating"
  | "split"
  | "masonry"
  | "adaptive";

/** Motion intensity presets. */
export type ProductCardMotionPreset = "subtle" | "premium" | "interactive" | "luxury" | "disabled";

/** Extended hover behaviors (includes legacy + new). */
export type ProductCardHoverEffect =
  | ProductCardHoverBehavior
  | "tilt"
  | "spotlight"
  | "magnetic"
  | "reveal"
  | "depth"
  | "cinematic"
  | "liquid";

export type ProductCardPricingMode =
  | "minimal"
  | "retail"
  | "marketplace"
  | "luxury"
  | "enterprise";

export type ProductCardContentSlot =
  | "brand"
  | "category"
  | "title"
  | "badges"
  | "description"
  | "features"
  | "price"
  | "rating"
  | "stock"
  | "actions";

export type ProductCardBadgeType =
  | "sale"
  | "new"
  | "limited"
  | "exclusive"
  | "premium"
  | "trending"
  | "bestseller"
  | "featured"
  | "low_stock"
  | "new_arrival"
  | "pre_order"
  | "coming_soon"
  | "staff_pick"
  | "custom";

export type ProductCardBadgePosition = "top-left" | "top-right" | "bottom" | "inline";

export type ProductCardActionType =
  | "buy_now"
  | "quote"
  | "wishlist"
  | "compare"
  | "quick_view"
  | "custom_link";

export type ProductCardActionPlacement =
  | "floating_corner"
  | "overlay"
  | "bottom_bar"
  | "inline"
  | "sticky"
  | "expandable"
  | "split"
  | "quick_menu"
  | "mobile_sticky";

export type ProductCardMediaEffect = "none" | "zoom" | "tilt" | "parallax" | "blur_reveal";

export const DEFAULT_CONTENT_ORDER: ProductCardContentSlot[] = [
  "brand",
  "category",
  "title",
  "badges",
  "description",
  "features",
  "price",
  "rating",
  "stock",
  "actions",
];

export interface ProductCardBadgeRule {
  type: ProductCardBadgeType;
  enabled: boolean;
  /** Match product tags starting with this prefix (e.g. "badge:new"). */
  tagPrefix?: string;
  label?: string;
  priority?: number;
}

export interface ProductCardCustomAction {
  id: string;
  enabled: boolean;
  label: string;
  icon?: string;
  href: string;
  openInNewTab?: boolean;
  placements: ProductCardActionPlacement[];
}

export interface ProductCardEffectsConfig {
  enabled: boolean;
  gradientBorder: boolean;
  glow: boolean;
  glassLayer: boolean;
  lightSweep: boolean;
  noiseTexture: boolean;
}

export interface ProductCardMediaConfig {
  hoverSwap: boolean;
  galleryEnabled: boolean;
  maxGalleryImages: number;
  effect: ProductCardMediaEffect;
  showSkeleton: boolean;
}

export interface ProductCardPersonalizationConfig {
  highlightRecent: boolean;
  highlightRecommended: boolean;
  highlightTrending: boolean;
}

export interface ProductCardDesignPartial {
  presetId?: ProductCardStylePreset;
  style?: ProductCardStylePreset;
  layout?: ProductCardLayoutMode;
  motion?: ProductCardMotionPreset;
  hoverEffect?: ProductCardHoverEffect;
  pricingMode?: ProductCardPricingMode;
  contentOrder?: ProductCardContentSlot[];
  badgePosition?: ProductCardBadgePosition;
  maxBadges?: number;
  badgeRules?: ProductCardBadgeRule[];
  showCategory?: boolean;
  effects?: Partial<ProductCardEffectsConfig>;
  media?: Partial<ProductCardMediaConfig>;
  actions?: Partial<ResolvedProductCardActionsPartial>;
  personalization?: Partial<ProductCardPersonalizationConfig>;
  inheritThemePreset?: boolean;
}

export interface ResolvedProductCardActionsPartial {
  enabledTypes: ProductCardActionType[];
  customActions: ProductCardCustomAction[];
  primaryAction: "buy_now" | "quote";
}

export interface ResolvedProductCardActions {
  enabledTypes: ProductCardActionType[];
  customActions: ProductCardCustomAction[];
  primaryAction: "buy_now" | "quote";
}

export interface ProductCardResponsivePartial {
  desktop?: ProductCardDesignPartial;
  tablet?: ProductCardDesignPartial;
  mobile?: ProductCardDesignPartial;
  smallMobile?: ProductCardDesignPartial;
}

export interface ResolvedProductCardDesign {
  presetId: ProductCardStylePreset;
  style: ProductCardStylePreset;
  layout: ProductCardLayoutMode;
  motion: ProductCardMotionPreset;
  hoverEffect: ProductCardHoverEffect;
  pricingMode: ProductCardPricingMode;
  contentOrder: ProductCardContentSlot[];
  badgePosition: ProductCardBadgePosition;
  maxBadges: number;
  badgeRules: ProductCardBadgeRule[];
  showCategory: boolean;
  effects: ProductCardEffectsConfig;
  media: ProductCardMediaConfig;
  actions: ResolvedProductCardActions;
  personalization: ProductCardPersonalizationConfig;
  inheritThemePreset: boolean;
}

export interface ProductCardResponsiveRules {
  desktop: ResolvedProductCardDesign;
  tablet: ResolvedProductCardDesign;
  mobile: ResolvedProductCardDesign;
  smallMobile: ResolvedProductCardDesign;
}

export type ProductCardDesignTokens = Record<string, string>;

export interface ProductCardDesignInput {
  partial?: ProductCardDesignPartial | null;
  legacyLayout?: ResolvedProductCardLayout | null;
  responsive?: ProductCardResponsivePartial | null;
}
