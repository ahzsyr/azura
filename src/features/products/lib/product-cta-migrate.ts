/**
 * One-time style migration: lift quote-style settings from legacy productPageAddToCart into productCta.
 */
import type { ProductAddToCartPartial } from "./product-page-display";
import type { ProductCtaPartial } from "./product-cta";
import { DEFAULT_RESOLVED_PRODUCT_CTA } from "./product-cta";

function isQuoteLikeAddToCart(legacy: ProductAddToCartPartial): boolean {
  const label = (legacy.label ?? "").trim();
  if (/quote/i.test(label)) return true;
  const href = (legacy.href ?? "").trim();
  if (href === "#" || href.startsWith("/")) return true;
  return legacy.behavior === "link" && Boolean(href);
}

/** When site has no productCta but legacy add-to-cart looks like a quote CTA, seed productCta partial. */
export function migrateProductCtaFromLegacyAddToCart(
  existingCta: unknown,
  legacyAddToCart: unknown,
): ProductCtaPartial | undefined {
  if (existingCta && typeof existingCta === "object" && !Array.isArray(existingCta)) {
    const o = existingCta as Record<string, unknown>;
    if (o.enabled === true || (typeof o.label === "string" && o.label.trim())) return undefined;
  }
  if (!legacyAddToCart || typeof legacyAddToCart !== "object" || Array.isArray(legacyAddToCart)) {
    return undefined;
  }
  const legacy = legacyAddToCart as ProductAddToCartPartial;
  if (!isQuoteLikeAddToCart(legacy)) return undefined;

  const href = (legacy.href ?? "").trim();
  const partial: ProductCtaPartial = {
    enabled: legacy.enabled !== false,
    label: legacy.label?.trim() || "Get Quote",
    openInNewTab: legacy.openInNewTab === true,
    placements: { inline: true, floating: false, card: false },
    variant: "outline",
  };
  if (href && /^https?:\/\//i.test(href)) {
    partial.linkType = "external";
    partial.externalUrl = href;
  } else if (href && href !== "#") {
    partial.linkType = "internal";
    partial.internalPath = href.startsWith("/") ? href : `/${href}`;
  } else {
    partial.linkType = "internal";
    partial.internalPath = DEFAULT_RESOLVED_PRODUCT_CTA.internalPath;
  }
  return partial;
}
