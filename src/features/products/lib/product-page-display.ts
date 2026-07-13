/**
 * Product detail page element visibility and block config.
 * Global defaults in site.json `productPageDisplay`; per-product overrides in `page_display`.
 */

import type { Product } from "@/features/products/types";
import { resolveProductBuyNow, type ProductBuyNowPartial } from "./product-buy-now";

export interface DisplayElementFlag {
  enabled: boolean;
}

export interface DisplayElementOverride {
  enabled?: boolean;
  inherit?: boolean;
}

export interface ProductPageDisplayPartial {
  breadcrumb?: DisplayElementOverride;
  gallery?: DisplayElementOverride;
  sideBuyBox?: DisplayElementOverride;
  compare?: DisplayElementOverride;
  cardBrand?: DisplayElementOverride;
  cardDiscountBadge?: DisplayElementOverride;
  saveToList?: DisplayElementOverride;
  price?: DisplayElementOverride;
  stock?: DisplayElementOverride;
  condition?: DisplayElementOverride;
  delivery?: DisplayElementOverride;
  quantity?: DisplayElementOverride;
  buyNow?: DisplayElementOverride;
  keySpecs?: DisplayElementOverride;
  inlineCta?: DisplayElementOverride;
  variations?: DisplayElementOverride;
  linkedTags?: DisplayElementOverride;
  shortDescription?: DisplayElementOverride;
  tabs?: DisplayElementOverride;
  tabDescription?: DisplayElementOverride;
  tabSpecs?: DisplayElementOverride;
  tabDocuments?: DisplayElementOverride;
  tabShipping?: DisplayElementOverride;
  tabReviews?: DisplayElementOverride;
  frequentlyBought?: DisplayElementOverride;
  crossLinks?: DisplayElementOverride;
  promo?: DisplayElementOverride;
  servicesBar?: DisplayElementOverride;
  trust?: DisplayElementOverride;
  floatingCta?: DisplayElementOverride;
  quickView?: DisplayElementOverride;
}

export interface ResolvedProductPageDisplay {
  breadcrumb: DisplayElementFlag;
  gallery: DisplayElementFlag;
  sideBuyBox: DisplayElementFlag;
  compare: DisplayElementFlag;
  cardBrand: DisplayElementFlag;
  cardDiscountBadge: DisplayElementFlag;
  saveToList: DisplayElementFlag;
  price: DisplayElementFlag;
  stock: DisplayElementFlag;
  condition: DisplayElementFlag;
  delivery: DisplayElementFlag;
  quantity: DisplayElementFlag;
  buyNow: DisplayElementFlag;
  keySpecs: DisplayElementFlag;
  inlineCta: DisplayElementFlag;
  variations: DisplayElementFlag;
  linkedTags: DisplayElementFlag;
  shortDescription: DisplayElementFlag;
  tabs: DisplayElementFlag;
  tabDescription: DisplayElementFlag;
  tabSpecs: DisplayElementFlag;
  tabDocuments: DisplayElementFlag;
  tabShipping: DisplayElementFlag;
  tabReviews: DisplayElementFlag;
  frequentlyBought: DisplayElementFlag;
  crossLinks: DisplayElementFlag;
  promo: DisplayElementFlag;
  servicesBar: DisplayElementFlag;
  trust: DisplayElementFlag;
  floatingCta: DisplayElementFlag;
  quickView: DisplayElementFlag;
}

export type ProductAddToCartBehavior = "link" | "stub";
export type ProductAddToCartVariant = "primary" | "outline";
export type ProductAddToCartSize = "md" | "lg";

export interface ProductAddToCartPartial {
  enabled?: boolean;
  label?: string;
  href?: string;
  openInNewTab?: boolean;
  behavior?: ProductAddToCartBehavior;
  variant?: ProductAddToCartVariant;
  size?: ProductAddToCartSize;
  fullWidth?: boolean;
}

export interface ResolvedProductAddToCart {
  enabled: boolean;
  label: string;
  href: string;
  openInNewTab: boolean;
  behavior: ProductAddToCartBehavior;
  variant: ProductAddToCartVariant;
  size: ProductAddToCartSize;
  fullWidth: boolean;
}

export interface ProductPromoPartial {
  enabled?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  openInNewTab?: boolean;
}

export interface ResolvedProductPromo {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  openInNewTab: boolean;
}

export interface ProductTrustPartial {
  enabled?: boolean;
  provider?: string;
  label?: string;
  rating?: number;
  reviewCount?: number;
  href?: string;
}

export interface ResolvedProductTrust {
  enabled: boolean;
  provider: string;
  label: string;
  rating: number;
  reviewCount: number;
  href: string;
}

export interface ProductVariationCombination {
  sku?: string;
  price?: number;
  old_price?: number | null;
  price_adjustment?: number;
  [key: string]: string | number | null | undefined;
}

export const PRODUCT_PAGE_MAIN_ORDER_KEYS = [
  "gallery",
  "tabs",
  "frequentlyBought",
  "crossLinks",
  "promo",
  "servicesBar",
  "trust",
] as const;

export const PRODUCT_PAGE_SIDE_ORDER_KEYS = [
  "linkedTags",
  "shortDescription",
  "inlineCta",
  "variations",
  "compare",
  "saveToList",
  "price",
  "stock",
  "condition",
  "delivery",
  "quantity",
  "buyNow",
  "keySpecs",
] as const;

export type ProductPageMainOrderKey = (typeof PRODUCT_PAGE_MAIN_ORDER_KEYS)[number];
export type ProductPageSideOrderKey = (typeof PRODUCT_PAGE_SIDE_ORDER_KEYS)[number];

export interface ProductPageElementOrderPartial {
  main?: string[];
  side?: string[];
}

export interface ResolvedProductPageElementOrder {
  main: ProductPageMainOrderKey[];
  side: ProductPageSideOrderKey[];
}

export interface SiteProductPageDefaults {
  productPageDisplay?: ProductPageDisplayPartial;
  productPageAddToCart?: ProductAddToCartPartial;
  productBuyNow?: ProductBuyNowPartial;
  productPagePromo?: ProductPromoPartial;
  productPageTrust?: ProductTrustPartial;
  productPageElementOrder?: ProductPageElementOrderPartial;
}

const DISPLAY_KEYS = [
  "breadcrumb",
  "gallery",
  "sideBuyBox",
  "compare",
  "cardBrand",
  "cardDiscountBadge",
  "saveToList",
  "price",
  "stock",
  "condition",
  "delivery",
  "quantity",
  "buyNow",
  "keySpecs",
  "inlineCta",
  "variations",
  "linkedTags",
  "shortDescription",
  "tabs",
  "tabDescription",
  "tabSpecs",
  "tabDocuments",
  "tabShipping",
  "tabReviews",
  "frequentlyBought",
  "crossLinks",
  "promo",
  "servicesBar",
  "trust",
  "floatingCta",
  "quickView",
] as const;

type DisplayKey = (typeof DISPLAY_KEYS)[number];

const DISPLAY_DEFAULTS: ResolvedProductPageDisplay = Object.fromEntries(
  DISPLAY_KEYS.map((k) => [k, { enabled: true }]),
) as unknown as ResolvedProductPageDisplay;

const PROMO_DEFAULTS: ResolvedProductPromo = {
  enabled: true,
  eyebrow: "Events",
  title: "B R T Trading in Dubai 2026",
  subtitle: "Visit our booth for live demos, exclusive offers, and networking gear showcases.",
  ctaLabel: "Learn more",
  ctaHref: "/about",
  openInNewTab: false,
};

const MAIN_ORDER_DEFAULTS: ProductPageMainOrderKey[] = [...PRODUCT_PAGE_MAIN_ORDER_KEYS];
const SIDE_ORDER_DEFAULTS: ProductPageSideOrderKey[] = [...PRODUCT_PAGE_SIDE_ORDER_KEYS];

const TRUST_DEFAULTS: ResolvedProductTrust = {
  enabled: true,
  provider: "Trustpilot",
  label: "Excellent",
  rating: 4.6,
  reviewCount: 0,
  href: "",
};

function isQuickViewExplicitInPartial(partial: ProductPageDisplayPartial | undefined): boolean {
  const q = partial?.quickView;
  return Boolean(q && typeof q.enabled === "boolean");
}

/** Quick View page element — falls back to Buy Now when not explicitly configured. */
function resolveQuickViewPageFlag(
  globalPartial: ProductPageDisplayPartial | undefined,
  productPartial: ProductPageDisplayPartial | undefined,
  buyNowEnabled: boolean,
): DisplayElementFlag {
  const product = productPartial?.quickView;
  if (product && typeof product.enabled === "boolean" && product.inherit !== true) {
    return { enabled: product.enabled };
  }
  const global = globalPartial?.quickView;
  if (global && typeof global.enabled === "boolean") {
    return { enabled: global.enabled };
  }
  if (!isQuickViewExplicitInPartial(globalPartial) && !isQuickViewExplicitInPartial(productPartial)) {
    return { enabled: buyNowEnabled };
  }
  return { enabled: true };
}

function mergeFlag(
  key: DisplayKey,
  globalPartial: ProductPageDisplayPartial | undefined,
  productPartial: ProductPageDisplayPartial | undefined,
): DisplayElementFlag {
  const legacyKey = key === "buyNow" ? ("addToCart" as const) : null;
  const productPartialAny = productPartial as ProductPageDisplayPartial & {
    addToCart?: DisplayElementOverride;
  };
  const globalPartialAny = globalPartial as ProductPageDisplayPartial & {
    addToCart?: DisplayElementOverride;
  };
  const product =
    productPartial?.[key] ?? (legacyKey ? productPartialAny?.[legacyKey] : undefined);
  if (product && typeof product.enabled === "boolean" && product.inherit !== true) {
    return { enabled: product.enabled };
  }
  const global =
    globalPartial?.[key] ?? (legacyKey ? globalPartialAny?.[legacyKey] : undefined);
  if (global && typeof global.enabled === "boolean") {
    return { enabled: global.enabled };
  }
  return { enabled: true };
}

/** @deprecated No-op — legacy addToCart display alias removed. */
export function syncBuyNowAddToCartDisplay(
  display: ResolvedProductPageDisplay,
): ResolvedProductPageDisplay {
  return display;
}

export function normalizeProductPageDisplayPartial(raw: unknown): ProductPageDisplayPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductPageDisplayPartial = {};
  for (const key of DISPLAY_KEYS) {
    const v = o[key];
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const item = v as Record<string, unknown>;
    const entry: DisplayElementOverride = {};
    if (typeof item.enabled === "boolean") entry.enabled = item.enabled;
    if (typeof item.inherit === "boolean") entry.inherit = item.inherit;
    if (Object.keys(entry).length) out[key] = entry;
  }
  return Object.keys(out).length ? out : undefined;
}

export function resolveProductPageDisplay(
  globalPartial?: ProductPageDisplayPartial | null,
  productPartial?: ProductPageDisplayPartial | null,
): ResolvedProductPageDisplay {
  const g = globalPartial ?? {};
  const p = productPartial ?? {};
  const out = { ...DISPLAY_DEFAULTS };
  for (const key of DISPLAY_KEYS) {
    if (key === "quickView") continue;
    out[key] = mergeFlag(key, g, p);
  }
  out.quickView = resolveQuickViewPageFlag(g, p, out.buyNow.enabled);
  return syncBuyNowAddToCartDisplay(out);
}

function str(v: unknown, fb: string): string {
  return typeof v === "string" ? v.trim() || fb : fb;
}

function bool(v: unknown, fb: boolean): boolean {
  return typeof v === "boolean" ? v : fb;
}

const SIDE_ORDER_LEGACY_ALIASES: Record<string, string> = { addToCart: "buyNow" };

function mergeOrderKeys<T extends string>(saved: string[] | undefined, allowed: readonly T[], defaults: T[]): T[] {
  const allowedSet = new Set<string>(allowed);
  const seen = new Set<string>();
  const out: T[] = [];
  for (const rawKey of saved ?? []) {
    const key = (SIDE_ORDER_LEGACY_ALIASES[rawKey] ?? rawKey) as T;
    if (!allowedSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  for (const key of defaults) {
    if (!seen.has(key)) out.push(key);
  }
  return out;
}

export function normalizeProductPageElementOrderPartial(
  raw: unknown,
): ProductPageElementOrderPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductPageElementOrderPartial = {};
  if (Array.isArray(o.main)) out.main = o.main.filter((k): k is string => typeof k === "string");
  if (Array.isArray(o.side)) out.side = o.side.filter((k): k is string => typeof k === "string");
  return Object.keys(out).length ? out : undefined;
}

export function resolveProductPageElementOrder(
  raw?: ProductPageElementOrderPartial | null,
): ResolvedProductPageElementOrder {
  return {
    main: mergeOrderKeys(raw?.main, PRODUCT_PAGE_MAIN_ORDER_KEYS, MAIN_ORDER_DEFAULTS),
    side: mergeOrderKeys(raw?.side, PRODUCT_PAGE_SIDE_ORDER_KEYS, SIDE_ORDER_DEFAULTS),
  };
}

export function normalizeProductPromoPartial(raw: unknown): ProductPromoPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductPromoPartial = {};
  if (typeof o.enabled === "boolean") out.enabled = o.enabled;
  if (typeof o.eyebrow === "string") out.eyebrow = o.eyebrow;
  if (typeof o.title === "string") out.title = o.title;
  if (typeof o.subtitle === "string") out.subtitle = o.subtitle;
  if (typeof o.ctaLabel === "string") out.ctaLabel = o.ctaLabel;
  if (typeof o.ctaHref === "string") out.ctaHref = o.ctaHref;
  if (typeof o.openInNewTab === "boolean") out.openInNewTab = o.openInNewTab;
  return Object.keys(out).length ? out : undefined;
}

export function resolveProductPromo(
  globalPartial?: ProductPromoPartial | null,
  productPartial?: ProductPromoPartial | null,
  display?: ResolvedProductPageDisplay,
): ResolvedProductPromo {
  const g = globalPartial ?? {};
  const p = productPartial ?? {};
  const enabled =
    display?.promo.enabled !== false &&
    bool(p.enabled, bool(g.enabled, PROMO_DEFAULTS.enabled));
  return {
    enabled,
    eyebrow: str(p.eyebrow, str(g.eyebrow, PROMO_DEFAULTS.eyebrow)),
    title: str(p.title, str(g.title, PROMO_DEFAULTS.title)),
    subtitle: str(p.subtitle, str(g.subtitle, PROMO_DEFAULTS.subtitle)),
    ctaLabel: str(p.ctaLabel, str(g.ctaLabel, PROMO_DEFAULTS.ctaLabel)),
    ctaHref: str(p.ctaHref, str(g.ctaHref, PROMO_DEFAULTS.ctaHref)),
    openInNewTab: bool(p.openInNewTab, bool(g.openInNewTab, PROMO_DEFAULTS.openInNewTab)),
  };
}

export function normalizeProductTrustPartial(raw: unknown): ProductTrustPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductTrustPartial = {};
  if (typeof o.enabled === "boolean") out.enabled = o.enabled;
  if (typeof o.provider === "string") out.provider = o.provider;
  if (typeof o.label === "string") out.label = o.label;
  if (typeof o.rating === "number" && Number.isFinite(o.rating)) out.rating = o.rating;
  if (typeof o.reviewCount === "number" && Number.isFinite(o.reviewCount)) out.reviewCount = o.reviewCount;
  if (typeof o.href === "string") out.href = o.href;
  return Object.keys(out).length ? out : undefined;
}

export function resolveProductTrust(
  globalPartial?: ProductTrustPartial | null,
  productPartial?: ProductTrustPartial | null,
  productReviews?: { rating?: number; count?: number },
  display?: ResolvedProductPageDisplay,
): ResolvedProductTrust {
  const g = globalPartial ?? {};
  const p = productPartial ?? {};
  const rating =
    typeof p.rating === "number" && Number.isFinite(p.rating)
      ? p.rating
      : typeof g.rating === "number" && Number.isFinite(g.rating)
        ? g.rating
        : productReviews?.rating ?? TRUST_DEFAULTS.rating;
  const reviewCount =
    typeof p.reviewCount === "number" && Number.isFinite(p.reviewCount)
      ? p.reviewCount
      : typeof g.reviewCount === "number" && Number.isFinite(g.reviewCount)
        ? g.reviewCount
        : productReviews?.count ?? TRUST_DEFAULTS.reviewCount;
  const enabled =
    display?.trust.enabled !== false &&
    bool(p.enabled, bool(g.enabled, TRUST_DEFAULTS.enabled));
  return {
    enabled,
    provider: str(p.provider, str(g.provider, TRUST_DEFAULTS.provider)),
    label: str(p.label, str(g.label, TRUST_DEFAULTS.label)),
    rating,
    reviewCount,
    href: str(p.href, str(g.href, TRUST_DEFAULTS.href)),
  };
}

/** Resolve all PDP display config for a product page render. */
export function resolveProductPageContext(
  site:
    | SiteProductPageDefaults
    | {
        productPageDisplay?: ResolvedProductPageDisplay | ProductPageDisplayPartial;
        productPageAddToCart?: ResolvedProductAddToCart | ProductAddToCartPartial;
        productBuyNow?: ProductBuyNowPartial;
        productPagePromo?: ResolvedProductPromo | ProductPromoPartial;
        productPageTrust?: ResolvedProductTrust | ProductTrustPartial;
        productPageElementOrder?: ProductPageElementOrderPartial;
      }
    | undefined,
  product: Product & {
    page_display?: ProductPageDisplayPartial;
    buy_now_slug?: string;
    promo?: ProductPromoPartial;
    trust?: ProductTrustPartial;
    variation_combinations?: ProductVariationCombination[];
  },
) {
  const display = resolveProductPageDisplay(site?.productPageDisplay, product.page_display);
  const buyNow = resolveProductBuyNow(
    site && "productBuyNow" in site ? site.productBuyNow : undefined,
    site?.productPageAddToCart,
  );
  return {
    display,
    elementOrder: resolveProductPageElementOrder(site?.productPageElementOrder),
    buyNow,
    promo: resolveProductPromo(site?.productPagePromo, product.promo, display),
    trust: resolveProductTrust(site?.productPageTrust, product.trust, product.reviews, display),
    buyNowSlugOverride: product.buy_now_slug?.trim() || undefined,
  };
}

/** Labels for admin order lists and element toggles. */
export const PRODUCT_PAGE_ELEMENT_LABELS: Partial<
  Record<keyof ResolvedProductPageDisplay, string>
> = {
  breadcrumb: "Breadcrumb",
  gallery: "Gallery",
  sideBuyBox: "Buy box column",
  compare: "Compare on cards",
  cardBrand: "Brand line on cards",
  cardDiscountBadge: "Discount badge on cards",
  saveToList: "Wishlist on cards",
  price: "Price",
  stock: "Stock status",
  condition: "Condition pills",
  delivery: "Delivery options",
  quantity: "Quantity",
  buyNow: "Buy Now / Shop Now",
  keySpecs: "Key specs table",
  inlineCta: "Inline CTA",
  variations: "Variation chips",
  linkedTags: "Linked tags",
  shortDescription: "Short description",
  tabs: "Tab bar",
  tabDescription: "Description tab",
  tabSpecs: "Specifications tab",
  tabDocuments: "Documents tab",
  tabShipping: "Shipping tab",
  tabReviews: "Reviews tab",
  frequentlyBought: "Frequently bought together",
  crossLinks: "Cross links",
  promo: "Promo banner",
  servicesBar: "Services bar",
  trust: "Trust widget",
  floatingCta: "Floating CTA",
};

export function serializeProductPageDisplayForSite(r: ResolvedProductPageDisplay): ProductPageDisplayPartial {
  const o: ProductPageDisplayPartial = {};
  for (const key of DISPLAY_KEYS) {
    if (!r[key].enabled) o[key] = { enabled: false };
  }
  return o;
}

export type ProductTabKey = "description" | "specs" | "documents" | "shipping" | "reviews";

export function enabledProductTabs(display: ResolvedProductPageDisplay): ProductTabKey[] {
  const tabs: ProductTabKey[] = [];
  if (display.tabDescription.enabled) tabs.push("description");
  if (display.tabSpecs.enabled) tabs.push("specs");
  if (display.tabDocuments.enabled) tabs.push("documents");
  if (display.tabShipping.enabled) tabs.push("shipping");
  if (display.tabReviews.enabled) tabs.push("reviews");
  return tabs;
}
