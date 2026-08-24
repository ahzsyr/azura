import type { Product } from "@/features/products/types";
import {
  resolveProductPageDisplay,
  type ProductPageDisplayPartial,
  type ResolvedProductPageDisplay,
} from "@/features/products/lib/product-page-display";
import { resolveProductCardDisplay } from "@/features/products/lib/product-card-display";
import { resolveProductBuyNow } from "@/features/products/lib/product-buy-now";
import {
  mergeProductCta,
  normalizeProductCtaGlobal,
  resolveProductCta,
} from "@/features/products/lib/product-cta";
import { migrateProductCtaFromLegacyAddToCart } from "@/features/products/lib/product-cta-migrate";
import { resolveProductCardLayout } from "@/features/products/lib/product-storefront-layout";

export type ProductSearchCardDisplay = {
  showBrand: boolean;
  showPrice: boolean;
  showRating: boolean;
  showSnippet: boolean;
  showImage: boolean;
};

function plainTextField(value: string | undefined | null): string {
  if (!value?.trim()) return "";
  let text = value.trim();
  if (text.includes("<")) {
    text = text
      .replace(/<\s*(script|style|noscript|template)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return text;
}

/** Visible PDP text only — excludes tags, categories, and other hidden element sources. */
export function buildProductDisplaySnippet(
  product: Product,
  display: ResolvedProductPageDisplay,
): string {
  const parts: string[] = [];

  if (display.shortDescription.enabled) {
    const short = plainTextField(product.short_description);
    if (short) parts.push(short);
  }

  if (!parts.length && display.tabDescription.enabled) {
    const description = plainTextField(product.description);
    if (description) parts.push(description);
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function searchCardDisplayFromPage(
  pageDisplay: ResolvedProductPageDisplay,
): ProductSearchCardDisplay {
  return {
    showBrand: pageDisplay.cardBrand.enabled,
    showPrice: pageDisplay.price.enabled,
    showRating: pageDisplay.trust.enabled,
    showSnippet: pageDisplay.shortDescription.enabled || pageDisplay.tabDescription.enabled,
    showImage: pageDisplay.gallery.enabled,
  };
}

export function resolveProductSearchDisplay(
  site: Record<string, unknown> | undefined,
  product: Product,
): { displaySnippet: string; searchCardDisplay: ProductSearchCardDisplay } {
  const pageDisplay = resolveProductPageDisplay(
    site?.productPageDisplay as ProductPageDisplayPartial | undefined,
    product.page_display,
  );

  const pageFlags = searchCardDisplayFromPage(pageDisplay);
  const listingCard = site ? resolveListingCardDisplay(site, pageDisplay) : null;

  const searchCardDisplay: ProductSearchCardDisplay = {
    showBrand: listingCard?.showBrand ?? pageFlags.showBrand,
    showPrice: listingCard?.showPrice ?? pageFlags.showPrice,
    showRating: listingCard?.showRating ?? pageFlags.showRating,
    showSnippet: pageFlags.showSnippet,
    showImage: pageFlags.showImage,
  };

  const displaySnippet = searchCardDisplay.showSnippet
    ? buildProductDisplaySnippet(product, pageDisplay)
    : "";

  return { displaySnippet, searchCardDisplay };
}

export function resolveSiteDefaultProductSearchCardDisplay(
  site: Record<string, unknown> | undefined,
): ProductSearchCardDisplay {
  return resolveProductSearchDisplay(site, {
    id: "site-default",
    productTitle: "",
    price: { value: 0, currency: "USD" },
    media: { images: [] },
    reviews: { rating: 0, count: 0 },
  }).searchCardDisplay;
}

export function mergeProductSearchCardDisplay(
  siteDefault: ProductSearchCardDisplay | undefined,
  hitDisplay: ProductSearchCardDisplay | undefined,
): ProductSearchCardDisplay | undefined {
  if (!siteDefault && !hitDisplay) return undefined;
  return {
    showBrand: hitDisplay?.showBrand ?? siteDefault?.showBrand ?? true,
    showPrice: hitDisplay?.showPrice ?? siteDefault?.showPrice ?? true,
    showRating: hitDisplay?.showRating ?? siteDefault?.showRating ?? true,
    showSnippet: hitDisplay?.showSnippet ?? siteDefault?.showSnippet ?? true,
    showImage: hitDisplay?.showImage ?? siteDefault?.showImage ?? true,
  };
}

function resolveListingCardDisplay(
  site: Record<string, unknown>,
  pageDisplay: ResolvedProductPageDisplay,
) {
  const cardLayout = resolveProductCardLayout(
    site.productCardLayout as Parameters<typeof resolveProductCardLayout>[0],
  );
  const buyNow = resolveProductBuyNow(
    site.productBuyNow as Parameters<typeof resolveProductBuyNow>[0],
    site.productPageAddToCart as Parameters<typeof resolveProductBuyNow>[1],
  );
  const migratedCta = migrateProductCtaFromLegacyAddToCart(
    site.productCta,
    site.productPageAddToCart,
  );
  const globalCta = migratedCta
    ? mergeProductCta(normalizeProductCtaGlobal(site.productCta), migratedCta)
    : normalizeProductCtaGlobal(site.productCta);
  const productCta = resolveProductCta(globalCta, undefined);
  return resolveProductCardDisplay(pageDisplay, cardLayout, buyNow, productCta);
}
