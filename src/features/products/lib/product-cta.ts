/**
 * Product CTA — global defaults (site.json `productCta`) merged with optional per-product `product_cta`.
 * Fallback: product → global site.json → theme defaults (see DEFAULT_RESOLVED_PRODUCT_CTA).
 */
import type { LocaleConfig } from "./i18n/types";
import { localePath } from "./i18n/url-helpers";
import {
  DEFAULT_PRODUCT_CTA_APPEARANCE_CARD,
  DEFAULT_PRODUCT_CTA_APPEARANCE_PAGE,
  mergeProductCtaAppearance,
  normalizeProductCtaAppearancePartial,
  type ProductCtaAppearanceNestPartial,
  type ProductCtaAppearancePartial,
  type ProductCtaAppearanceResolved,
} from "./product-cta-appearance";

export type ProductCtaVariant = "solid" | "outline" | "ghost" | "link" | "soft" | "gradient";

export type ProductCtaLinkType = "internal" | "external";

export type ProductCtaCardVisibility = "always" | "hover";

export type ProductInternalLinkKind = "page" | "collection" | "product";

/** Optional metadata when linking to CMS content (path is still stored in internalPath). */
export interface ProductCtaInternalLink {
  kind: ProductInternalLinkKind;
  slug: string;
  title?: string;
}

/**
 * Card presentation modes. Legacy `cardVisibility` still applies for hover reveal on supported layouts.
 * - floating_corner — default overlay at bottom-right
 * - overlay — centered over media
 * - bottom_bar — full-width strip at card bottom
 * - inline_meta — row below price/rating (outside product link)
 * - quick_action — compact chip on media (top-right)
 */
export type ProductCtaCardLayout = "floating_corner" | "overlay" | "bottom_bar" | "inline_meta" | "quick_action";

/** Fully merged effective configuration. */
export interface ResolvedProductCtaConfig {
  enabled: boolean;
  label: string;
  icon: string;
  variant: ProductCtaVariant;
  linkType: ProductCtaLinkType;
  /** Path without locale prefix, e.g. `/contact` */
  internalPath: string;
  externalUrl: string;
  openInNewTab: boolean;
  placements: {
    inline: boolean;
    floating: boolean;
    card: boolean;
  };
  cardVisibility: ProductCtaCardVisibility;
  cardLayout: ProductCtaCardLayout;
  internalLink?: ProductCtaInternalLink;
  /** Public URL for custom PNG/SVG icon (takes precedence over `icon` class when set). */
  iconUrl: string;
  appearance: {
    page: ProductCtaAppearanceResolved;
    card: ProductCtaAppearanceResolved;
  };
}

/** Partial overrides (global site.json or per-product `product_cta`). */
export type ProductCtaPartial = Partial<{
  enabled: boolean;
  label: string;
  icon: string;
  variant: ProductCtaVariant;
  linkType: ProductCtaLinkType;
  internalPath: string;
  externalUrl: string;
  openInNewTab: boolean;
  placements: Partial<ResolvedProductCtaConfig["placements"]>;
  cardVisibility: ProductCtaCardVisibility;
  cardLayout: ProductCtaCardLayout;
  internalLink: ProductCtaInternalLink | null;
  iconUrl: string;
  appearance: ProductCtaAppearanceNestPartial;
}>;

export const DEFAULT_RESOLVED_PRODUCT_CTA: ResolvedProductCtaConfig = {
  enabled: false,
  label: "Shop now",
  icon: "fa-solid fa-bag-shopping",
  iconUrl: "",
  variant: "solid",
  linkType: "internal",
  internalPath: "/contact",
  externalUrl: "",
  openInNewTab: false,
  placements: {
    inline: true,
    floating: false,
    card: false,
  },
  cardVisibility: "always",
  cardLayout: "floating_corner",
  appearance: {
    page: { ...DEFAULT_PRODUCT_CTA_APPEARANCE_PAGE },
    card: { ...DEFAULT_PRODUCT_CTA_APPEARANCE_CARD },
  },
};

export const PRODUCT_CTA_ICON_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "fa-solid fa-bag-shopping", label: "Bag" },
  { value: "fa-solid fa-cart-shopping", label: "Cart" },
  { value: "fa-solid fa-arrow-right", label: "Arrow" },
  { value: "fa-solid fa-phone", label: "Phone" },
  { value: "fa-solid fa-envelope", label: "Envelope" },
  { value: "fa-solid fa-bolt", label: "Bolt" },
  { value: "fa-solid fa-star", label: "Star" },
  { value: "fa-regular fa-circle-check", label: "Check" },
  { value: "fa-solid fa-up-right-from-square", label: "External" },
];

export type { ProductCtaAppearanceNestPartial, ProductCtaAppearancePartial, ProductCtaAppearanceResolved };

function isVariant(v: unknown): v is ProductCtaVariant {
  return v === "solid" || v === "outline" || v === "ghost" || v === "link" || v === "soft" || v === "gradient";
}

function isLinkType(v: unknown): v is ProductCtaLinkType {
  return v === "internal" || v === "external";
}

function isCardVisibility(v: unknown): v is ProductCtaCardVisibility {
  return v === "always" || v === "hover";
}

function isCardLayout(v: unknown): v is ProductCtaCardLayout {
  return (
    v === "floating_corner" ||
    v === "overlay" ||
    v === "bottom_bar" ||
    v === "inline_meta" ||
    v === "quick_action"
  );
}

function str(v: unknown, fb: string): string {
  return typeof v === "string" ? v.trim() : fb;
}

function normalizeInternalLink(raw: unknown): ProductCtaInternalLink | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const kind = o.kind;
  const slug = str(o.slug, "");
  if (!slug) return undefined;
  if (kind !== "page" && kind !== "collection" && kind !== "product") return undefined;
  const title = str(o.title, "");
  return { kind, slug, ...(title ? { title } : {}) };
}

function mergeAppearanceFromPartial(
  base: ResolvedProductCtaConfig["appearance"],
  partial?: ProductCtaAppearanceNestPartial | null,
): ResolvedProductCtaConfig["appearance"] {
  if (!partial) return { page: { ...base.page }, card: { ...base.card } };
  const shared = normalizeProductCtaAppearancePartial(partial.shared);
  const pageP = normalizeProductCtaAppearancePartial(partial.page);
  const cardP = normalizeProductCtaAppearancePartial(partial.card);
  return {
    page: mergeProductCtaAppearance(mergeProductCtaAppearance(base.page, shared), pageP),
    card: mergeProductCtaAppearance(mergeProductCtaAppearance(base.card, shared), cardP),
  };
}

function resolveAppearanceFromRaw(
  raw: unknown,
  basePage: ProductCtaAppearanceResolved,
  baseCard: ProductCtaAppearanceResolved,
): ResolvedProductCtaConfig["appearance"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { page: { ...basePage }, card: { ...baseCard } };
  }
  return mergeAppearanceFromPartial(
    { page: basePage, card: baseCard },
    raw as ProductCtaAppearanceNestPartial,
  );
}

/** Normalize global defaults from `site.json` (or fragment). */
export function normalizeProductCtaGlobal(raw: unknown): ResolvedProductCtaConfig {
  const base = DEFAULT_RESOLVED_PRODUCT_CTA;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ...base,
      placements: { ...base.placements },
      appearance: {
        page: { ...base.appearance.page },
        card: { ...base.appearance.card },
      },
    };
  }

  const o = raw as Record<string, unknown>;
  const placementsRaw =
    o.placements && typeof o.placements === "object" && !Array.isArray(o.placements)
      ? (o.placements as Record<string, unknown>)
      : {};

  let linkType: ProductCtaLinkType = isLinkType(o.linkType) ? o.linkType : base.linkType;
  const externalUrlRaw = str(o.externalUrl, "");
  const internalPathRaw = str(o.internalPath, base.internalPath);
  if (linkType === "internal" && !internalPathRaw.trim() && externalUrlRaw.trim()) {
    linkType = "external";
  }

  const appearance = resolveAppearanceFromRaw(o.appearance, base.appearance.page, base.appearance.card);
  const internalLink = normalizeInternalLink(o.internalLink);

  return {
    enabled: o.enabled === true,
    label: str(o.label, base.label) || base.label,
    icon: str(o.icon, base.icon) || base.icon,
    iconUrl: str(o.iconUrl, base.iconUrl),
    variant: isVariant(o.variant) ? o.variant : base.variant,
    linkType,
    internalPath: internalPathRaw.trim() || "/",
    externalUrl: externalUrlRaw,
    openInNewTab: o.openInNewTab === true,
    placements: {
      inline:
        typeof placementsRaw.inline === "boolean"
          ? placementsRaw.inline
          : base.placements.inline,
      floating:
        typeof placementsRaw.floating === "boolean"
          ? placementsRaw.floating
          : base.placements.floating,
      card:
        typeof placementsRaw.card === "boolean" ? placementsRaw.card : base.placements.card,
    },
    cardVisibility: isCardVisibility(o.cardVisibility) ? o.cardVisibility : base.cardVisibility,
    cardLayout: isCardLayout(o.cardLayout) ? o.cardLayout : base.cardLayout,
    ...(internalLink ? { internalLink } : {}),
    appearance,
  };
}

/** Deep-merge partial overrides onto a resolved config (per-product or nested defaults). */
export function mergeProductCta(base: ResolvedProductCtaConfig, partial: unknown): ResolvedProductCtaConfig {
  if (!partial || typeof partial !== "object" || Array.isArray(partial)) {
    return {
      ...base,
      placements: { ...base.placements },
      appearance: {
        page: { ...base.appearance.page },
        card: { ...base.appearance.card },
      },
    };
  }

  const p = partial as ProductCtaPartial;
  const placementsIn = p.placements;

  let internalLink: ProductCtaInternalLink | undefined = base.internalLink;
  if (p.internalLink === null) internalLink = undefined;
  else if (p.internalLink !== undefined) {
    const n = normalizeInternalLink(p.internalLink);
    internalLink = n ?? internalLink;
  }

  const appearance = p.appearance
    ? mergeAppearanceFromPartial(base.appearance, p.appearance)
    : { page: { ...base.appearance.page }, card: { ...base.appearance.card } };

  return {
    enabled: typeof p.enabled === "boolean" ? p.enabled : base.enabled,
    label: p.label !== undefined ? str(p.label, base.label) : base.label,
    icon: p.icon !== undefined ? str(p.icon, base.icon) : base.icon,
    iconUrl: p.iconUrl !== undefined ? str(p.iconUrl, "") : base.iconUrl,
    variant: p.variant !== undefined ? (isVariant(p.variant) ? p.variant : base.variant) : base.variant,
    linkType: p.linkType !== undefined ? (isLinkType(p.linkType) ? p.linkType : base.linkType) : base.linkType,
    internalPath: p.internalPath !== undefined ? str(p.internalPath, base.internalPath) : base.internalPath,
    externalUrl: p.externalUrl !== undefined ? str(p.externalUrl, "") : base.externalUrl,
    openInNewTab: typeof p.openInNewTab === "boolean" ? p.openInNewTab : base.openInNewTab,
    placements: {
      inline:
        placementsIn && typeof placementsIn.inline === "boolean"
          ? placementsIn.inline
          : base.placements.inline,
      floating:
        placementsIn && typeof placementsIn.floating === "boolean"
          ? placementsIn.floating
          : base.placements.floating,
      card:
        placementsIn && typeof placementsIn.card === "boolean"
          ? placementsIn.card
          : base.placements.card,
    },
    cardVisibility:
      p.cardVisibility !== undefined
        ? (isCardVisibility(p.cardVisibility) ? p.cardVisibility : base.cardVisibility)
        : base.cardVisibility,
    cardLayout:
      p.cardLayout !== undefined
        ? (isCardLayout(p.cardLayout) ? p.cardLayout : base.cardLayout)
        : base.cardLayout,
    ...(internalLink ? { internalLink } : {}),
    appearance,
  };
}

/** Effective CTA for a product: global theme defaults + optional `product_cta` on the document. */
export function resolveProductCta(
  global: ResolvedProductCtaConfig,
  productOverride: unknown,
): ResolvedProductCtaConfig {
  return mergeProductCta(global, productOverride);
}

export function buildProductCtaHref(
  cfg: ResolvedProductCtaConfig,
  locale: LocaleConfig,
): string | null {
  if (!cfg.enabled) return null;
  const ext = cfg.externalUrl.trim();
  if (cfg.linkType === "external") {
    return ext || null;
  }
  const path = cfg.internalPath.trim() || "/";
  if (path === "/" && ext) return ext;
  return localePath(path.startsWith("/") ? path : `/${path}`, locale.code);
}

/** Validate external URL field (http(s), mailto, tel). Empty string is valid. */
export function validateProductCtaExternalUrl(raw: string): { valid: boolean; message?: string } {
  const t = raw.trim();
  if (!t) return { valid: true };
  if (/^mailto:/i.test(t) || /^tel:/i.test(t)) return { valid: true };
  try {
    const u = new URL(t);
    if (u.protocol === "http:" || u.protocol === "https:") return { valid: true };
    return { valid: false, message: "Only http(s), mailto, and tel URLs are allowed." };
  } catch {
    if (t.startsWith("/")) {
      return {
        valid: false,
        message: "Site paths belong in the internal link selector, not the external URL field.",
      };
    }
    return { valid: false, message: "Enter a valid URL (e.g. https://…), mailto:, or tel:." };
  }
}

/** Shape written to `site.json` under `productCta`. */
export function serializeProductCtaForSite(r: ResolvedProductCtaConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {
    enabled: r.enabled,
    label: r.label,
    icon: r.icon,
    iconUrl: r.iconUrl,
    variant: r.variant,
    linkType: r.linkType,
    internalPath: r.internalPath,
    externalUrl: r.externalUrl,
    openInNewTab: r.openInNewTab,
    placements: {
      inline: r.placements.inline,
      floating: r.placements.floating,
      card: r.placements.card,
    },
    cardVisibility: r.cardVisibility,
    cardLayout: r.cardLayout,
    appearance: {
      page: { ...r.appearance.page },
      card: { ...r.appearance.card },
    },
  };
  if (r.internalLink) out.internalLink = { ...r.internalLink };
  return out;
}

export function productCtaCssVariant(variant: ProductCtaVariant): string {
  switch (variant) {
    case "outline":
      return "prd-cta-btn--outline";
    case "ghost":
      return "prd-cta-btn--ghost";
    case "link":
      return "prd-cta-btn--link";
    case "soft":
      return "prd-cta-btn--soft";
    case "gradient":
      return "prd-cta-btn--gradient";
    case "solid":
    default:
      return "prd-cta-btn--solid";
  }
}
