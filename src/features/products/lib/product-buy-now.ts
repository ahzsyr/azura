/**
 * Buy Now / Shop Now — global shop URL (domain + slug path prefix) with optional per-product slug override.
 * Stored in site.json as `productBuyNow`; legacy `productPageAddToCart` is mapped when absent.
 */
import type { ProductAddToCartPartial } from "./product-page-display";

export type ProductBuyNowVariant = "primary" | "outline";
export type ProductBuyNowSize = "md" | "lg";

export interface ProductBuyNowPartial {
  enabled?: boolean;
  label?: string;
  shopBaseUrl?: string;
  slugPathPrefix?: string;
  openInNewTab?: boolean;
  variant?: ProductBuyNowVariant;
  size?: ProductBuyNowSize;
  fullWidth?: boolean;
  placements?: Partial<{ page: boolean; card: boolean }>;
}

export interface ResolvedProductBuyNow {
  enabled: boolean;
  label: string;
  shopBaseUrl: string;
  slugPathPrefix: string;
  openInNewTab: boolean;
  variant: ProductBuyNowVariant;
  size: ProductBuyNowSize;
  fullWidth: boolean;
  placements: { page: boolean; card: boolean };
}

export const DEFAULT_RESOLVED_PRODUCT_BUY_NOW: ResolvedProductBuyNow = {
  enabled: true,
  label: "Buy Now",
  shopBaseUrl: "",
  slugPathPrefix: "/",
  openInNewTab: true,
  variant: "primary",
  size: "md",
  fullWidth: false,
  placements: { page: true, card: true },
};

function str(v: unknown, fb: string): string {
  return typeof v === "string" ? v.trim() : fb;
}

function bool(v: unknown, fb: boolean): boolean {
  return typeof v === "boolean" ? v : fb;
}

function normalizePlacements(raw: unknown, base: ResolvedProductBuyNow["placements"]) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...base };
  const o = raw as Record<string, unknown>;
  return {
    page: typeof o.page === "boolean" ? o.page : base.page,
    card: typeof o.card === "boolean" ? o.card : base.card,
  };
}

/** Map legacy add-to-cart block into buy-now shape (ignores quote-style flat href for shop URL). */
function fromLegacyAddToCart(legacy: ProductAddToCartPartial | null | undefined): ProductBuyNowPartial | undefined {
  if (!legacy || typeof legacy !== "object") return undefined;
  const out: ProductBuyNowPartial = {};
  if (typeof legacy.enabled === "boolean") out.enabled = legacy.enabled;
  if (typeof legacy.label === "string" && legacy.label.trim()) {
    const label = legacy.label.trim();
    if (!/quote/i.test(label)) out.label = label;
  }
  if (typeof legacy.openInNewTab === "boolean") out.openInNewTab = legacy.openInNewTab;
  if (legacy.variant === "primary" || legacy.variant === "outline") out.variant = legacy.variant;
  if (legacy.size === "md" || legacy.size === "lg") out.size = legacy.size;
  if (typeof legacy.fullWidth === "boolean") out.fullWidth = legacy.fullWidth;
  const href = typeof legacy.href === "string" ? legacy.href.trim() : "";
  if (href && /^https?:\/\//i.test(href)) {
    try {
      const u = new URL(href);
      out.shopBaseUrl = u.origin;
      const path = u.pathname.replace(/\/$/, "") || "";
      if (path && path !== "/") out.slugPathPrefix = `${path}/`;
    } catch {
      /* ignore */
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function normalizeProductBuyNowPartial(raw: unknown): ProductBuyNowPartial | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: ProductBuyNowPartial = {};
  if (typeof o.enabled === "boolean") out.enabled = o.enabled;
  if (typeof o.label === "string") out.label = o.label;
  if (typeof o.shopBaseUrl === "string") out.shopBaseUrl = o.shopBaseUrl;
  if (typeof o.slugPathPrefix === "string") out.slugPathPrefix = o.slugPathPrefix;
  if (typeof o.openInNewTab === "boolean") out.openInNewTab = o.openInNewTab;
  if (o.variant === "primary" || o.variant === "outline") out.variant = o.variant;
  if (o.size === "md" || o.size === "lg") out.size = o.size;
  if (typeof o.fullWidth === "boolean") out.fullWidth = o.fullWidth;
  if (o.placements) out.placements = normalizePlacements(o.placements, DEFAULT_RESOLVED_PRODUCT_BUY_NOW.placements);
  return Object.keys(out).length ? out : undefined;
}

export function resolveProductBuyNow(
  globalBuyNow?: ProductBuyNowPartial | null,
  legacyGlobalAddToCart?: ProductAddToCartPartial | null,
): ResolvedProductBuyNow {
  const base = DEFAULT_RESOLVED_PRODUCT_BUY_NOW;
  const legacy = fromLegacyAddToCart(legacyGlobalAddToCart);
  const g = { ...legacy, ...globalBuyNow };
  return {
    enabled: bool(g.enabled, base.enabled),
    label: str(g.label, base.label) || base.label,
    shopBaseUrl: str(g.shopBaseUrl, base.shopBaseUrl),
    slugPathPrefix: normalizeSlugPathPrefix(str(g.slugPathPrefix, base.slugPathPrefix)),
    openInNewTab: bool(g.openInNewTab, base.openInNewTab),
    variant: g.variant === "outline" ? "outline" : g.variant === "primary" ? "primary" : base.variant,
    size: g.size === "lg" ? "lg" : g.size === "md" ? "md" : base.size,
    fullWidth: bool(g.fullWidth, base.fullWidth),
    placements: normalizePlacements(g.placements, base.placements),
  };
}

function normalizeSlugPathPrefix(prefix: string): string {
  const t = prefix.trim();
  if (!t || t === "/") return "/";
  const withLeading = t.startsWith("/") ? t : `/${t}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

function normalizeShopBase(base: string): string {
  const t = base.trim().replace(/\/+$/, "");
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function encodeSlugSegment(slug: string): string {
  return slug
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/");
}

/** Build external shop URL for a product. Returns null when base URL is unset. */
export function buildBuyNowHref(
  cfg: ResolvedProductBuyNow,
  productSlug: string,
  slugOverride?: string | null,
): string | null {
  if (!cfg.enabled) return null;
  const base = normalizeShopBase(cfg.shopBaseUrl);
  if (!base) return null;
  const slug = (slugOverride?.trim() || productSlug.trim());
  if (!slug) return null;
  const prefix = normalizeSlugPathPrefix(cfg.slugPathPrefix);
  const path = prefix === "/" ? encodeSlugSegment(slug) : `${prefix}${encodeSlugSegment(slug)}`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function serializeProductBuyNowForSite(r: ResolvedProductBuyNow): Record<string, unknown> {
  const out: Record<string, unknown> = {
    enabled: r.enabled,
    label: r.label,
    shopBaseUrl: r.shopBaseUrl,
    slugPathPrefix: r.slugPathPrefix,
    openInNewTab: r.openInNewTab,
    variant: r.variant,
    size: r.size,
    fullWidth: r.fullWidth,
    placements: { page: r.placements.page, card: r.placements.card },
  };
  return out;
}

/** Sample preview URL for admin (uses placeholder slug). */
export function previewBuyNowHref(cfg: ResolvedProductBuyNow, sampleSlug = "sample-product"): string | null {
  return buildBuyNowHref(cfg, sampleSlug);
}
