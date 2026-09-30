/**
 * Optional storefront layout overrides for product detail page and product cards.
 * Stored in site.json as `productPageLayout` and `productCardLayout`.
 */

export type ProductPageGalleryLayout = "classic" | "wide_gallery" | "stacked";
export type ProductPageMediaPosition = "start" | "end";
export type ProductPageTabsMode = "tabs" | "accordion";
export type ProductPageSurfaceStyle = "plain" | "card" | "elevated";
export type ProductPageAnimation = "none" | "fade" | "slide-up";
export type ProductPageTabletColumnMode = "single" | "split";
export type ProductPageGalleryMobileLayout = "classic" | "immersive";
export type ProductPageGalleryThumbPlacement = "below" | "left" | "right";

export interface ProductPageLayoutPartial {
  galleryLayout?: ProductPageGalleryLayout;
  mediaPosition?: ProductPageMediaPosition;
  /** Tablet layout: single column or gallery + buy box side-by-side */
  tabletColumnMode?: ProductPageTabletColumnMode;
  /** Mobile gallery presentation */
  galleryMobileLayout?: ProductPageGalleryMobileLayout;
  /** Thumbnail rail position relative to main image */
  galleryThumbPlacement?: ProductPageGalleryThumbPlacement;
  /** Override unified mobile/tablet block order (stack keys) */
  mobileStackOrder?: string[];
  stickyBuyBox?: boolean;
  /** Keep breadcrumb (col-tree-nav) visible while scrolling on desktop */
  stickyBreadcrumb?: boolean;
  /** Use two-column layout with fixed/sticky buy column on desktop */
  fixedBuyColumn?: boolean;
  breadcrumbStickyTop?: string;
  buyBoxStickyTop?: string;
  heroGap?: string;
  sectionGap?: string;
  borderRadius?: string;
  surfaceStyle?: ProductPageSurfaceStyle;
  tabsMode?: ProductPageTabsMode;
  /** On small screens, show gallery block before buy box when true */
  mobileGalleryFirst?: boolean;
  inheritThemePreset?: boolean;
  titleFontSize?: string;
  bodyFontSize?: string;
  animationEntrance?: ProductPageAnimation;
  animationDurationMs?: number;
}

export interface ResolvedProductPageLayout extends Required<
  Omit<
    ProductPageLayoutPartial,
    | "buyBoxStickyTop"
    | "breadcrumbStickyTop"
    | "heroGap"
    | "sectionGap"
    | "borderRadius"
    | "titleFontSize"
    | "bodyFontSize"
    | "animationDurationMs"
  >
> {
  stickyBreadcrumb: boolean;
  fixedBuyColumn: boolean;
  breadcrumbStickyTop: string;
  buyBoxStickyTop: string;
  heroGap: string;
  sectionGap: string;
  borderRadius: string;
  titleFontSize: string;
  bodyFontSize: string;
  animationDurationMs: number;
}

export type ProductCardHoverBehavior = "lift" | "glow" | "scale_image" | "none";
export type ProductCardImageRatio = "auto" | "1-1" | "4-3" | "3-4" | "16-9";
export type ProductCardBadgePosition = "top-left" | "top-right";
export type ProductCardShadow = "none" | "sm" | "md" | "lg";
export type ProductCardPrimaryAction = "buy_now" | "cta";
export type ProductCardActionArrangement = "auto" | "single_row" | "stacked";

export interface ProductCardLayoutPartial {
  hoverBehavior?: ProductCardHoverBehavior;
  imageAspectRatio?: ProductCardImageRatio;
  badgePosition?: ProductCardBadgePosition;
  /** Show compare action on product cards */
  showCompare?: boolean;
  /** Show brand line on product cards */
  showBrand?: boolean;
  /** Show discount percentage badge on product cards */
  showDiscountBadge?: boolean;
  titleFontSize?: string;
  priceFontSize?: string;
  shadow?: ProductCardShadow;
  borderWidth?: string;
  borderRadius?: string;
  overlayStrength?: number;
  contentPadding?: string;
  contentPaddingMobile?: string;
  showQuickAction?: boolean;
  cardPrimaryAction?: ProductCardPrimaryAction;
  /** Bottom-bar / inline action button layout on product cards */
  cardActionArrangement?: ProductCardActionArrangement;
  inheritThemePreset?: boolean;
}

export interface ResolvedProductCardLayout extends Required<
  Omit<ProductCardLayoutPartial, "borderWidth" | "borderRadius" | "titleFontSize" | "priceFontSize" | "contentPadding" | "contentPaddingMobile" | "overlayStrength">
> {
  borderWidth: string;
  borderRadius: string;
  titleFontSize: string;
  priceFontSize: string;
  contentPadding: string;
  contentPaddingMobile: string;
  overlayStrength: number;
}

const PAGE_DEFAULTS: ResolvedProductPageLayout = {
  galleryLayout: "classic",
  mediaPosition: "start",
  tabletColumnMode: "single",
  galleryMobileLayout: "immersive",
  galleryThumbPlacement: "below",
  mobileStackOrder: [],
  stickyBuyBox: true,
  stickyBreadcrumb: true,
  fixedBuyColumn: true,
  breadcrumbStickyTop: "5.5rem",
  buyBoxStickyTop: "6rem",
  heroGap: "",
  sectionGap: "",
  borderRadius: "",
  surfaceStyle: "plain",
  tabsMode: "tabs",
  mobileGalleryFirst: true,
  inheritThemePreset: true,
  titleFontSize: "",
  bodyFontSize: "",
  animationEntrance: "none",
  animationDurationMs: 320,
};

const CARD_DEFAULTS: ResolvedProductCardLayout = {
  hoverBehavior: "lift",
  imageAspectRatio: "auto",
  badgePosition: "top-left",
  showCompare: true,
  showBrand: true,
  showDiscountBadge: true,
  titleFontSize: "",
  priceFontSize: "",
  shadow: "sm",
  borderWidth: "",
  borderRadius: "",
  overlayStrength: 35,
  contentPadding: "",
  contentPaddingMobile: "",
  showQuickAction: false,
  cardPrimaryAction: "buy_now",
  cardActionArrangement: "auto",
  inheritThemePreset: true,
};

function str(v: unknown, fb: string): string {
  return typeof v === "string" ? v : fb;
}

function num(v: unknown, fb: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.min(4000, v));
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Math.max(0, Math.min(4000, Number(v)));
  return fb;
}

function isGalleryLayout(v: unknown): v is ProductPageGalleryLayout {
  return v === "classic" || v === "wide_gallery" || v === "stacked";
}
function isMediaPos(v: unknown): v is ProductPageMediaPosition {
  return v === "start" || v === "end";
}
function isTabs(v: unknown): v is ProductPageTabsMode {
  return v === "tabs" || v === "accordion";
}
function isSurface(v: unknown): v is ProductPageSurfaceStyle {
  return v === "plain" || v === "card" || v === "elevated";
}
function isAnim(v: unknown): v is ProductPageAnimation {
  return v === "none" || v === "fade" || v === "slide-up";
}
function isTabletColumn(v: unknown): v is ProductPageTabletColumnMode {
  return v === "single" || v === "split";
}
function isGalleryMobile(v: unknown): v is ProductPageGalleryMobileLayout {
  return v === "classic" || v === "immersive";
}
function isGalleryThumbPlacement(v: unknown): v is ProductPageGalleryThumbPlacement {
  return v === "below" || v === "left" || v === "right";
}
function isHover(v: unknown): v is ProductCardHoverBehavior {
  return v === "lift" || v === "glow" || v === "scale_image" || v === "none";
}
function isRatio(v: unknown): v is ProductCardImageRatio {
  return v === "auto" || v === "1-1" || v === "4-3" || v === "3-4" || v === "16-9";
}
function isBadge(v: unknown): v is ProductCardBadgePosition {
  return v === "top-left" || v === "top-right";
}
function isShadow(v: unknown): v is ProductCardShadow {
  return v === "none" || v === "sm" || v === "md" || v === "lg";
}
function isPrimaryAction(v: unknown): v is ProductCardPrimaryAction {
  return v === "buy_now" || v === "cta";
}
function isActionArrangement(v: unknown): v is ProductCardActionArrangement {
  return v === "auto" || v === "single_row" || v === "stacked";
}

export function normalizeProductPageLayoutPartial(raw: unknown): ProductPageLayoutPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductPageLayoutPartial = {};
  if (isGalleryLayout(o.galleryLayout)) out.galleryLayout = o.galleryLayout;
  if (isMediaPos(o.mediaPosition)) out.mediaPosition = o.mediaPosition;
  if (isTabletColumn(o.tabletColumnMode)) out.tabletColumnMode = o.tabletColumnMode;
  if (isGalleryMobile(o.galleryMobileLayout)) out.galleryMobileLayout = o.galleryMobileLayout;
  if (isGalleryThumbPlacement(o.galleryThumbPlacement)) out.galleryThumbPlacement = o.galleryThumbPlacement;
  if (Array.isArray(o.mobileStackOrder)) {
    out.mobileStackOrder = o.mobileStackOrder.filter((k): k is string => typeof k === "string");
  }
  if (typeof o.stickyBuyBox === "boolean") out.stickyBuyBox = o.stickyBuyBox;
  if (typeof o.stickyBreadcrumb === "boolean") out.stickyBreadcrumb = o.stickyBreadcrumb;
  if (typeof o.fixedBuyColumn === "boolean") out.fixedBuyColumn = o.fixedBuyColumn;
  if (typeof o.breadcrumbStickyTop === "string") out.breadcrumbStickyTop = o.breadcrumbStickyTop;
  if (typeof o.buyBoxStickyTop === "string") out.buyBoxStickyTop = o.buyBoxStickyTop;
  if (typeof o.heroGap === "string") out.heroGap = o.heroGap;
  if (typeof o.sectionGap === "string") out.sectionGap = o.sectionGap;
  if (typeof o.borderRadius === "string") out.borderRadius = o.borderRadius;
  if (isSurface(o.surfaceStyle)) out.surfaceStyle = o.surfaceStyle;
  if (isTabs(o.tabsMode)) out.tabsMode = o.tabsMode;
  if (typeof o.mobileGalleryFirst === "boolean") out.mobileGalleryFirst = o.mobileGalleryFirst;
  if (typeof o.inheritThemePreset === "boolean") out.inheritThemePreset = o.inheritThemePreset;
  if (typeof o.titleFontSize === "string") out.titleFontSize = o.titleFontSize;
  if (typeof o.bodyFontSize === "string") out.bodyFontSize = o.bodyFontSize;
  if (isAnim(o.animationEntrance)) out.animationEntrance = o.animationEntrance;
  const d = num(o.animationDurationMs, NaN);
  if (!Number.isNaN(d)) out.animationDurationMs = d;
  return Object.keys(out).length ? out : undefined;
}

export function normalizeProductCardLayoutPartial(raw: unknown): ProductCardLayoutPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductCardLayoutPartial = {};
  if (isHover(o.hoverBehavior)) out.hoverBehavior = o.hoverBehavior;
  if (isRatio(o.imageAspectRatio)) out.imageAspectRatio = o.imageAspectRatio;
  if (isBadge(o.badgePosition)) out.badgePosition = o.badgePosition;
  if (typeof o.titleFontSize === "string") out.titleFontSize = o.titleFontSize;
  if (typeof o.priceFontSize === "string") out.priceFontSize = o.priceFontSize;
  if (isShadow(o.shadow)) out.shadow = o.shadow;
  if (typeof o.borderWidth === "string") out.borderWidth = o.borderWidth;
  if (typeof o.borderRadius === "string") out.borderRadius = o.borderRadius;
  if (typeof o.overlayStrength === "number" && Number.isFinite(o.overlayStrength)) {
    out.overlayStrength = Math.max(0, Math.min(100, o.overlayStrength));
  }
  if (typeof o.contentPadding === "string") out.contentPadding = o.contentPadding;
  if (typeof o.contentPaddingMobile === "string") out.contentPaddingMobile = o.contentPaddingMobile;
  if (typeof o.showQuickAction === "boolean") out.showQuickAction = o.showQuickAction;
  if (isPrimaryAction(o.cardPrimaryAction)) out.cardPrimaryAction = o.cardPrimaryAction;
  if (isActionArrangement(o.cardActionArrangement)) out.cardActionArrangement = o.cardActionArrangement;
  if (typeof o.showCompare === "boolean") out.showCompare = o.showCompare;
  if (typeof o.showBrand === "boolean") out.showBrand = o.showBrand;
  if (typeof o.showDiscountBadge === "boolean") out.showDiscountBadge = o.showDiscountBadge;
  if (typeof o.inheritThemePreset === "boolean") out.inheritThemePreset = o.inheritThemePreset;
  return Object.keys(out).length ? out : undefined;
}

export function resolveProductPageLayout(partial?: ProductPageLayoutPartial | null): ResolvedProductPageLayout {
  const p = partial ?? {};
  return {
    galleryLayout: p.galleryLayout ?? PAGE_DEFAULTS.galleryLayout,
    mediaPosition: p.mediaPosition ?? PAGE_DEFAULTS.mediaPosition,
    tabletColumnMode: p.tabletColumnMode ?? PAGE_DEFAULTS.tabletColumnMode,
    galleryMobileLayout: p.galleryMobileLayout ?? PAGE_DEFAULTS.galleryMobileLayout,
    galleryThumbPlacement: p.galleryThumbPlacement ?? PAGE_DEFAULTS.galleryThumbPlacement,
    mobileStackOrder: p.mobileStackOrder?.length ? [...p.mobileStackOrder] : [],
    stickyBuyBox: p.stickyBuyBox ?? PAGE_DEFAULTS.stickyBuyBox,
    stickyBreadcrumb: p.stickyBreadcrumb ?? PAGE_DEFAULTS.stickyBreadcrumb,
    fixedBuyColumn: p.fixedBuyColumn ?? PAGE_DEFAULTS.fixedBuyColumn,
    breadcrumbStickyTop: str(p.breadcrumbStickyTop, PAGE_DEFAULTS.breadcrumbStickyTop),
    buyBoxStickyTop: str(p.buyBoxStickyTop, PAGE_DEFAULTS.buyBoxStickyTop),
    heroGap: str(p.heroGap, PAGE_DEFAULTS.heroGap),
    sectionGap: str(p.sectionGap, PAGE_DEFAULTS.sectionGap),
    borderRadius: str(p.borderRadius, PAGE_DEFAULTS.borderRadius),
    surfaceStyle: p.surfaceStyle ?? PAGE_DEFAULTS.surfaceStyle,
    tabsMode: p.tabsMode ?? PAGE_DEFAULTS.tabsMode,
    mobileGalleryFirst: p.mobileGalleryFirst ?? PAGE_DEFAULTS.mobileGalleryFirst,
    inheritThemePreset: p.inheritThemePreset ?? PAGE_DEFAULTS.inheritThemePreset,
    titleFontSize: str(p.titleFontSize, PAGE_DEFAULTS.titleFontSize),
    bodyFontSize: str(p.bodyFontSize, PAGE_DEFAULTS.bodyFontSize),
    animationEntrance: p.animationEntrance ?? PAGE_DEFAULTS.animationEntrance,
    animationDurationMs: p.animationDurationMs ?? PAGE_DEFAULTS.animationDurationMs,
  };
}

export function resolveProductCardLayout(partial?: ProductCardLayoutPartial | null): ResolvedProductCardLayout {
  const p = partial ?? {};
  return {
    hoverBehavior: p.hoverBehavior ?? CARD_DEFAULTS.hoverBehavior,
    imageAspectRatio: p.imageAspectRatio ?? CARD_DEFAULTS.imageAspectRatio,
    badgePosition: p.badgePosition ?? CARD_DEFAULTS.badgePosition,
    titleFontSize: str(p.titleFontSize, CARD_DEFAULTS.titleFontSize),
    priceFontSize: str(p.priceFontSize, CARD_DEFAULTS.priceFontSize),
    shadow: p.shadow ?? CARD_DEFAULTS.shadow,
    borderWidth: str(p.borderWidth, CARD_DEFAULTS.borderWidth),
    borderRadius: str(p.borderRadius, CARD_DEFAULTS.borderRadius),
    overlayStrength: p.overlayStrength ?? CARD_DEFAULTS.overlayStrength,
    contentPadding: str(p.contentPadding, CARD_DEFAULTS.contentPadding),
    contentPaddingMobile: str(p.contentPaddingMobile, CARD_DEFAULTS.contentPaddingMobile),
    showQuickAction: p.showQuickAction ?? CARD_DEFAULTS.showQuickAction,
    cardPrimaryAction: p.cardPrimaryAction ?? CARD_DEFAULTS.cardPrimaryAction,
    cardActionArrangement: p.cardActionArrangement ?? CARD_DEFAULTS.cardActionArrangement,
    showCompare: p.showCompare ?? CARD_DEFAULTS.showCompare,
    showBrand: p.showBrand ?? CARD_DEFAULTS.showBrand,
    showDiscountBadge: p.showDiscountBadge ?? CARD_DEFAULTS.showDiscountBadge,
    inheritThemePreset: p.inheritThemePreset ?? CARD_DEFAULTS.inheritThemePreset,
  };
}

/** Strip empty / default-equal fields for minimal site.json (optional). */
export function serializeProductPageLayoutForSite(r: ResolvedProductPageLayout): ProductPageLayoutPartial {
  const o: ProductPageLayoutPartial = {};
  if (r.galleryLayout !== PAGE_DEFAULTS.galleryLayout) o.galleryLayout = r.galleryLayout;
  if (r.mediaPosition !== PAGE_DEFAULTS.mediaPosition) o.mediaPosition = r.mediaPosition;
  if (r.tabletColumnMode !== PAGE_DEFAULTS.tabletColumnMode) o.tabletColumnMode = r.tabletColumnMode;
  if (r.galleryMobileLayout !== PAGE_DEFAULTS.galleryMobileLayout) {
    o.galleryMobileLayout = r.galleryMobileLayout;
  }
  if (r.galleryThumbPlacement !== PAGE_DEFAULTS.galleryThumbPlacement) {
    o.galleryThumbPlacement = r.galleryThumbPlacement;
  }
  if (r.mobileStackOrder.length) o.mobileStackOrder = [...r.mobileStackOrder];
  if (r.stickyBuyBox !== PAGE_DEFAULTS.stickyBuyBox) o.stickyBuyBox = r.stickyBuyBox;
  if (r.stickyBreadcrumb !== PAGE_DEFAULTS.stickyBreadcrumb) o.stickyBreadcrumb = r.stickyBreadcrumb;
  if (r.fixedBuyColumn !== PAGE_DEFAULTS.fixedBuyColumn) o.fixedBuyColumn = r.fixedBuyColumn;
  if (r.breadcrumbStickyTop !== PAGE_DEFAULTS.breadcrumbStickyTop) o.breadcrumbStickyTop = r.breadcrumbStickyTop;
  if (r.buyBoxStickyTop !== PAGE_DEFAULTS.buyBoxStickyTop) o.buyBoxStickyTop = r.buyBoxStickyTop;
  if (r.heroGap) o.heroGap = r.heroGap;
  if (r.sectionGap) o.sectionGap = r.sectionGap;
  if (r.borderRadius) o.borderRadius = r.borderRadius;
  if (r.surfaceStyle !== PAGE_DEFAULTS.surfaceStyle) o.surfaceStyle = r.surfaceStyle;
  if (r.tabsMode !== PAGE_DEFAULTS.tabsMode) o.tabsMode = r.tabsMode;
  if (r.mobileGalleryFirst !== PAGE_DEFAULTS.mobileGalleryFirst) o.mobileGalleryFirst = r.mobileGalleryFirst;
  if (r.inheritThemePreset !== PAGE_DEFAULTS.inheritThemePreset) o.inheritThemePreset = r.inheritThemePreset;
  if (r.titleFontSize) o.titleFontSize = r.titleFontSize;
  if (r.bodyFontSize) o.bodyFontSize = r.bodyFontSize;
  if (r.animationEntrance !== PAGE_DEFAULTS.animationEntrance) o.animationEntrance = r.animationEntrance;
  if (r.animationDurationMs !== PAGE_DEFAULTS.animationDurationMs) o.animationDurationMs = r.animationDurationMs;
  return o;
}

export function serializeProductCardLayoutForSite(r: ResolvedProductCardLayout): ProductCardLayoutPartial {
  const o: ProductCardLayoutPartial = {};
  if (r.hoverBehavior !== CARD_DEFAULTS.hoverBehavior) o.hoverBehavior = r.hoverBehavior;
  if (r.imageAspectRatio !== CARD_DEFAULTS.imageAspectRatio) o.imageAspectRatio = r.imageAspectRatio;
  if (r.badgePosition !== CARD_DEFAULTS.badgePosition) o.badgePosition = r.badgePosition;
  if (r.titleFontSize) o.titleFontSize = r.titleFontSize;
  if (r.priceFontSize) o.priceFontSize = r.priceFontSize;
  if (r.shadow !== CARD_DEFAULTS.shadow) o.shadow = r.shadow;
  if (r.borderWidth) o.borderWidth = r.borderWidth;
  if (r.borderRadius) o.borderRadius = r.borderRadius;
  if (r.overlayStrength !== CARD_DEFAULTS.overlayStrength) o.overlayStrength = r.overlayStrength;
  if (r.contentPadding) o.contentPadding = r.contentPadding;
  if (r.contentPaddingMobile) o.contentPaddingMobile = r.contentPaddingMobile;
  if (r.showQuickAction !== CARD_DEFAULTS.showQuickAction) o.showQuickAction = r.showQuickAction;
  if (r.cardPrimaryAction !== CARD_DEFAULTS.cardPrimaryAction) o.cardPrimaryAction = r.cardPrimaryAction;
  if (r.cardActionArrangement !== CARD_DEFAULTS.cardActionArrangement) {
    o.cardActionArrangement = r.cardActionArrangement;
  }
  if (r.showCompare !== CARD_DEFAULTS.showCompare) o.showCompare = r.showCompare;
  if (r.showBrand !== CARD_DEFAULTS.showBrand) o.showBrand = r.showBrand;
  if (r.showDiscountBadge !== CARD_DEFAULTS.showDiscountBadge) o.showDiscountBadge = r.showDiscountBadge;
  if (r.inheritThemePreset !== CARD_DEFAULTS.inheritThemePreset) o.inheritThemePreset = r.inheritThemePreset;
  return o;
}

export function productPageLayoutDataAttrs(layout: ResolvedProductPageLayout): Record<string, string> {
  return {
    "data-prd-gallery": layout.galleryLayout,
    "data-prd-media": layout.mediaPosition,
    "data-prd-tabs": layout.tabsMode,
    "data-prd-surface": layout.surfaceStyle,
    "data-prd-sticky-buy": layout.stickyBuyBox ? "true" : "false",
    "data-prd-sticky-crumb": layout.stickyBreadcrumb ? "true" : "false",
    "data-prd-fixed-buy": layout.fixedBuyColumn ? "true" : "false",
    "data-prd-mobile-gallery": layout.mobileGalleryFirst ? "first" : "natural",
    "data-prd-tablet-columns": layout.tabletColumnMode,
    "data-prd-gallery-mobile": layout.galleryMobileLayout,
    "data-prd-gallery-thumbs": layout.galleryThumbPlacement,
    "data-prd-anim": layout.animationEntrance,
  };
}

export function productPageLayoutCssVars(layout: ResolvedProductPageLayout): Record<string, string> {
  const vars: Record<string, string> = {
    "--prd-anim-ms": `${layout.animationDurationMs}ms`,
  };
  if (layout.heroGap) vars["--prd-hero-gap"] = layout.heroGap;
  if (layout.sectionGap) vars["--prd-section-gap"] = layout.sectionGap;
  if (layout.borderRadius) vars["--prd-radius"] = layout.borderRadius;
  if (layout.breadcrumbStickyTop) vars["--prd-crumb-top"] = layout.breadcrumbStickyTop;
  if (layout.buyBoxStickyTop) vars["--prd-side-top"] = layout.buyBoxStickyTop;
  if (layout.titleFontSize) vars["--prd-title-fs"] = layout.titleFontSize;
  if (layout.bodyFontSize) vars["--prd-body-fs"] = layout.bodyFontSize;
  return vars;
}

type ProductPageLayoutRulesInput = {
  desktop: ResolvedProductPageLayout;
  tablet: ResolvedProductPageLayout;
  mobile: ResolvedProductPageLayout;
};

function copyLayoutLayerVars(
  layout: ResolvedProductPageLayout,
  viewport: "desktop" | "tablet" | "mobile",
  target: Record<string, string>,
): void {
  const layer = productPageLayoutCssVars(layout);
  for (const [key, value] of Object.entries(layer)) {
    target[`${key}-${viewport}`] = value;
    if (viewport === "desktop") target[key] = value;
  }
}

/** Emit per-viewport layout data attrs + desktop sticky chrome attrs. */
export function productPageLayoutRulesDataAttrs(
  rules: ProductPageLayoutRulesInput,
): Record<string, string> {
  const attrs: Record<string, string> = {
    ...productPageLayoutDataAttrs(rules.desktop),
  };

  for (const viewport of ["desktop", "tablet", "mobile"] as const) {
    const layout = rules[viewport];
    attrs[`data-prd-gallery-${viewport}`] = layout.galleryLayout;
    attrs[`data-prd-media-${viewport}`] = layout.mediaPosition;
    attrs[`data-prd-tabs-${viewport}`] = layout.tabsMode;
    attrs[`data-prd-surface-${viewport}`] = layout.surfaceStyle;
    attrs[`data-prd-anim-${viewport}`] = layout.animationEntrance;
    attrs[`data-prd-sticky-buy-${viewport}`] = layout.stickyBuyBox ? "true" : "false";
    attrs[`data-prd-sticky-crumb-${viewport}`] = layout.stickyBreadcrumb ? "true" : "false";
    attrs[`data-prd-fixed-buy-${viewport}`] = layout.fixedBuyColumn ? "true" : "false";
    attrs[`data-prd-mobile-gallery-${viewport}`] = layout.mobileGalleryFirst ? "first" : "natural";
    attrs[`data-prd-tablet-columns-${viewport}`] = layout.tabletColumnMode;
    attrs[`data-prd-gallery-mobile-${viewport}`] = layout.galleryMobileLayout;
    attrs[`data-prd-gallery-thumbs-${viewport}`] = layout.galleryThumbPlacement;
  }

  return attrs;
}

/** Emit per-viewport CSS custom properties for spacing and typography. */
export function productPageLayoutRulesCssVars(
  rules: ProductPageLayoutRulesInput,
): Record<string, string> {
  const vars: Record<string, string> = {};
  copyLayoutLayerVars(rules.desktop, "desktop", vars);
  copyLayoutLayerVars(rules.tablet, "tablet", vars);
  copyLayoutLayerVars(rules.mobile, "mobile", vars);
  return vars;
}

function shadowToCss(sh: ProductCardShadow): string {
  switch (sh) {
    case "none":
      return "none";
    case "sm":
      return "0 4px 12px -6px rgba(0,0,0,0.18)";
    case "md":
      return "0 10px 28px -12px rgba(0,0,0,0.22)";
    case "lg":
      return "0 18px 44px -14px rgba(0,0,0,0.28)";
    default:
      return "none";
  }
}

function ratioToCss(r: ProductCardImageRatio): string {
  switch (r) {
    case "1-1":
      return "1 / 1";
    case "4-3":
      return "4 / 3";
    case "3-4":
      return "3 / 4";
    case "16-9":
      return "16 / 9";
    default:
      return "auto";
  }
}

export function productCardLayoutDataAttrs(layout: ResolvedProductCardLayout): Record<string, string> {
  return {
    "data-prd-card-hover": layout.hoverBehavior,
    "data-prd-card-ratio": layout.imageAspectRatio,
    "data-prd-card-badge": layout.badgePosition,
    "data-prd-card-compare": layout.showCompare ? "true" : "false",
    "data-prd-card-actions": layout.cardActionArrangement,
    "data-prd-card-primary": layout.cardPrimaryAction,
  };
}

export function productCardLayoutCssVars(layout: ResolvedProductCardLayout): Record<string, string> {
  const vars: Record<string, string> = {
    "--prd-card-shadow": shadowToCss(layout.shadow),
    "--prd-card-media-ar": ratioToCss(layout.imageAspectRatio),
    "--prd-card-overlay": `${layout.overlayStrength}%`,
  };
  if (layout.borderWidth) vars["--prd-card-bw"] = layout.borderWidth;
  if (layout.borderRadius) vars["--prd-card-radius"] = layout.borderRadius;
  if (layout.titleFontSize) vars["--prd-card-title-fs"] = layout.titleFontSize;
  if (layout.priceFontSize) vars["--prd-card-price-fs"] = layout.priceFontSize;
  if (layout.contentPadding) vars["--prd-card-pad"] = layout.contentPadding;
  if (layout.contentPaddingMobile) vars["--prd-card-pad-m"] = layout.contentPaddingMobile;
  return vars;
}
