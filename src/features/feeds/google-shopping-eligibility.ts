import { buildCanonicalUrl } from "@/i18n/seo-helpers";
import { resolveSeoOgImageUrl } from "@/features/seo/seo-image-url";
import { resolveProductPrimaryImageUrl } from "@/features/products/lib/product-primary-image";
import {
  detailedDescriptionPlainText,
  normalizeDetailedDescriptionInput,
} from "@/features/products/lib/product-detailed-description";
import { isProductPublishedForSearch } from "@/features/products/lib/product-publish-status";
import type { Product, ProductConditionOption } from "@/features/products/types";
import {
  resolveGoogleProductCategory,
  resolveGoogleProductType,
} from "./google-product-category";
import type { GoogleShoppingIssueCode } from "./google-shopping-issues";
import {
  looksLikeGtin,
  resolveProductIdentifiers,
  resolveProductOfferFacts,
} from "@/features/products/lib/product-offer-facts";
import {
  convertAmountToFeedCurrency,
  formatFeedShippingPrice,
  isFeedShippingConfigured,
  resolveGoogleShoppingFeedCurrency,
  resolveProductCurrency,
} from "./google-shopping-market";
import {
  GOOGLE_SHOPPING_FEED_VERSION,
  type GoogleShoppingAvailability,
  type GoogleShoppingCondition,
  type GoogleShoppingEligibilityResult,
  type GoogleShoppingFeedItem,
  type GoogleShoppingFeedProductInput,
  type GoogleShoppingMarket,
  type GoogleShoppingShipping,
} from "./google-shopping-feed.types";

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveGoogleShoppingTitle(product: Product): string {
  const override = (product as Product & { googleTitle?: string }).googleTitle?.trim();
  if (override) return override.slice(0, 150);
  return (
    product.productTitle?.trim() ||
    product.name?.trim() ||
    product.title?.trim() ||
    product.id ||
    ""
  ).slice(0, 150);
}

export function resolveGoogleShoppingDescription(product: Product): string {
  const override = (product as Product & { googleDescription?: string }).googleDescription?.trim();
  if (override) return stripHtml(override).slice(0, 5000);

  const detailPlain = detailedDescriptionPlainText(
    normalizeDetailedDescriptionInput(product.detailed_description),
  );
  const raw =
    product.description?.trim() ||
    product.short_description?.trim() ||
    detailPlain ||
    product.productTitle ||
    product.name ||
    product.title ||
    "";
  return stripHtml(raw).slice(0, 5000);
}

export { mapGoogleShoppingAvailability } from "@/features/products/lib/product-offer-facts";

export function mapGoogleShoppingCondition(
  options?: ProductConditionOption[],
): GoogleShoppingCondition {
  const first = options?.find(Boolean);
  if (first === "used" || first === "refurbished" || first === "new") return first;
  return "new";
}

export function formatGoogleShoppingPrice(value: number, currency: string): string {
  const amount = Number.isFinite(value) ? value : 0;
  const code = (currency || "").trim().toUpperCase();
  return `${amount.toFixed(2)} ${code}`;
}

type IdentifierOutcome = {
  gtin?: string;
  mpn?: string;
  identifierExists: "yes" | "no";
  warnings: GoogleShoppingIssueCode[];
};

function resolveIdentifiers(product: Product): IdentifierOutcome {
  const identifiers = resolveProductIdentifiers(product);
  const hasGtin = Boolean(identifiers.gtin && looksLikeGtin(identifiers.gtin));
  const hasMpn = Boolean(identifiers.mpn);
  const warnings: GoogleShoppingIssueCode[] = [];

  if (hasGtin) {
    if (!hasMpn) warnings.push("MISSING_MPN");
    return {
      gtin: identifiers.gtin,
      mpn: hasMpn ? identifiers.mpn : undefined,
      identifierExists: "yes",
      warnings,
    };
  }

  if (hasMpn) {
    warnings.push("MISSING_GTIN");
    return {
      mpn: identifiers.mpn,
      identifierExists: "no",
      warnings,
    };
  }

  warnings.push("MISSING_GTIN", "MISSING_MPN", "IDENTIFIER_UNAVAILABLE");
  return {
    identifierExists: "no",
    warnings,
  };
}

function isHttpsUrl(url: string): boolean {
  return /^https:\/\//i.test(url.trim());
}

function collectAdditionalImages(
  product: Product,
  primaryResolved: string,
  siteOrigin: string,
): string[] {
  const images = product.media?.images ?? [];
  const out: string[] = [];
  const seen = new Set([primaryResolved]);

  for (const img of images) {
    const raw = img.url?.trim();
    if (!raw) continue;
    const resolved = resolveSeoOgImageUrl(raw, siteOrigin);
    if (!resolved || !isHttpsUrl(resolved) || seen.has(resolved)) continue;
    seen.add(resolved);
    out.push(resolved);
    if (out.length >= 10) break;
  }
  return out;
}

function buildShipping(market: GoogleShoppingMarket): GoogleShoppingShipping | undefined {
  if (!isFeedShippingConfigured(market)) return undefined;
  return {
    country: market.shippingCountry!.trim(),
    service: market.shippingService!.trim(),
    price: formatFeedShippingPrice(market),
  };
}

type ComboRow = {
  sku: string;
  price: number;
  oldPrice?: number | null;
  color?: string;
  size?: string;
};

function extractVariantCombos(product: Product): ComboRow[] {
  const combos = product.variation_combinations ?? [];
  const rows: ComboRow[] = [];
  const seen = new Set<string>();

  for (const combo of combos) {
    if (!combo || typeof combo !== "object") continue;
    const sku = typeof combo.sku === "string" ? combo.sku.trim() : "";
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);

    let price = Number(product.price?.value);
    if (combo.price != null && combo.price !== "" && Number.isFinite(Number(combo.price))) {
      price = Number(combo.price);
    } else if (
      typeof combo.price_adjustment === "number" &&
      Number.isFinite(combo.price_adjustment)
    ) {
      price = Number(product.price?.value ?? 0) + combo.price_adjustment;
    }

    const oldPrice =
      combo.old_price != null && Number.isFinite(Number(combo.old_price))
        ? Number(combo.old_price)
        : product.old_price;

    const color =
      typeof combo.color === "string"
        ? combo.color
        : typeof (combo as { Color?: string }).Color === "string"
          ? (combo as { Color: string }).Color
          : undefined;
    const size =
      typeof combo.size === "string"
        ? combo.size
        : typeof (combo as { Size?: string }).Size === "string"
          ? (combo as { Size: string }).Size
          : undefined;

    rows.push({ sku, price, oldPrice, color, size });
  }

  return rows;
}

function buildFeedItem(params: {
  id: string;
  product: GoogleShoppingFeedProductInput;
  market: GoogleShoppingMarket;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  availability: GoogleShoppingAvailability;
  priceValue: number;
  oldPrice?: number | null;
  currency: string;
  brand: string;
  identifiers: IdentifierOutcome;
  googleCategory?: string;
  productType?: string;
  shipping?: GoogleShoppingShipping;
  itemGroupId?: string;
  color?: string;
  size?: string;
}): GoogleShoppingFeedItem {
  const {
    id,
    product,
    title,
    description,
    link,
    imageLink,
    additionalImageLinks,
    availability,
    priceValue,
    oldPrice,
    currency,
    brand,
    identifiers,
    googleCategory,
    productType,
    shipping,
    itemGroupId,
    color,
    size,
  } = params;

  const salePrice =
    oldPrice != null && Number.isFinite(oldPrice) && oldPrice > priceValue
      ? formatGoogleShoppingPrice(oldPrice, currency)
      : undefined;

  const customLabel0 = (product as Product & { customLabel0?: string }).customLabel0?.trim();

  return {
    id,
    title,
    description,
    link,
    imageLink,
    additionalImageLinks: additionalImageLinks.length ? additionalImageLinks : undefined,
    availability,
    price: formatGoogleShoppingPrice(priceValue, currency),
    salePrice,
    condition: mapGoogleShoppingCondition(product.condition_options),
    brand,
    gtin: identifiers.gtin,
    mpn: identifiers.mpn,
    identifierExists: identifiers.identifierExists,
    googleProductCategory: googleCategory,
    productType,
    itemGroupId,
    color,
    size,
    shipping,
    customLabel0: customLabel0 || undefined,
  };
}

/**
 * Single source of truth for Google Shopping eligibility and feed item construction.
 * Product Manager, diagnostics, and the feed service MUST all call this function.
 */
export function resolveGoogleShoppingEligibility(
  product: GoogleShoppingFeedProductInput,
  market: GoogleShoppingMarket,
): GoogleShoppingEligibilityResult {
  const issues: GoogleShoppingIssueCode[] = [];
  const warnings: GoogleShoppingIssueCode[] = [];
  const strict = market.validationMode === "strict";

  const publishStatus = product.publishStatus ?? "published";
  if (!isProductPublishedForSearch(publishStatus)) {
    issues.push("UNPUBLISHED");
  }

  if (product.excludeFromGoogleShopping === true) {
    issues.push("EXCLUDED");
  }

  if (product.availability === "RequestQuote") {
    issues.push("QUOTE_REQUIRED");
  } else if (product.availability === "ExternalPurchase") {
    issues.push("EXTERNAL_PURCHASE");
  }

  const title = resolveGoogleShoppingTitle(product);
  if (!title) issues.push("MISSING_TITLE");

  const description = resolveGoogleShoppingDescription(product);
  if (!description) issues.push("MISSING_DESCRIPTION");

  const brand = product.brand?.trim() || "";
  if (!brand) issues.push("MISSING_BRAND");

  const imageRaw = resolveProductPrimaryImageUrl(product);
  if (!imageRaw) {
    issues.push("MISSING_IMAGE");
  }

  let imageLink = "";
  if (imageRaw) {
    const resolved = resolveSeoOgImageUrl(imageRaw, market.siteOrigin);
    if (!resolved || !isHttpsUrl(resolved)) {
      issues.push("INVALID_IMAGE_URL");
    } else {
      imageLink = resolved;
    }
  }

  const priceValue = Number(product.price?.value);
  if (product.price?.value == null || product.price?.value === ("" as unknown)) {
    issues.push("MISSING_PRICE");
  } else if (!Number.isFinite(priceValue) || priceValue <= 0) {
    issues.push("INVALID_PRICE");
  }

  const slug = product.slug?.trim() || product.id;
  const link = buildCanonicalUrl(
    market.siteOrigin.replace(/\/$/, ""),
    market.localePrefix,
    `/products/${slug}`,
  );
  if (!link || !/^https?:\/\//i.test(link)) {
    issues.push("INVALID_CANONICAL_URL");
  }

  if (!isFeedShippingConfigured(market)) {
    issues.push("MISSING_SHIPPING");
  }

  const googleCategory = resolveGoogleProductCategory(product);
  if (!googleCategory) warnings.push("MISSING_GOOGLE_CATEGORY");

  const productType = resolveGoogleProductType(product);
  const facts = resolveProductOfferFacts(product, market);
  const sourceCurrency = resolveProductCurrency(product, market);
  const currency = facts.priceCurrency ?? resolveGoogleShoppingFeedCurrency(market);
  if (sourceCurrency !== currency) {
    warnings.push("CURRENCY_MISMATCH");
  }

  const identifiers = resolveIdentifiers(product);
  warnings.push(...identifiers.warnings);

  if (strict && warnings.includes("MISSING_GTIN")) {
    issues.push("MISSING_GTIN");
  }

  // Deduplicate
  const uniqueIssues = [...new Set(issues)];
  const uniqueWarnings = [...new Set(warnings.filter((w) => !uniqueIssues.includes(w)))];

  if (uniqueIssues.length > 0) {
    return {
      status: "excluded",
      issues: uniqueIssues,
      warnings: uniqueWarnings,
      item: null,
      items: [],
      feedVersion: GOOGLE_SHOPPING_FEED_VERSION,
    };
  }

  const availability = facts.shoppingAvailability;
  if (!availability || !facts.emitOffer || facts.price == null) {
    // Should already be caught by QUOTE_REQUIRED / EXTERNAL_PURCHASE / INVALID_PRICE
    return {
      status: "excluded",
      issues: ["QUOTE_REQUIRED"],
      warnings: uniqueWarnings,
      item: null,
      items: [],
      feedVersion: GOOGLE_SHOPPING_FEED_VERSION,
    };
  }

  const shipping = buildShipping(market);
  const additionalImageLinks = collectAdditionalImages(product, imageLink, market.siteOrigin);
  const variants = extractVariantCombos(product);

  const toFeedAmount = (amount: number) =>
    convertAmountToFeedCurrency(amount, sourceCurrency, market);

  const baseParams = {
    product,
    market,
    title,
    description,
    link,
    imageLink,
    additionalImageLinks,
    availability,
    currency,
    brand,
    identifiers: {
      ...identifiers,
      gtin: facts.gtin ?? identifiers.gtin,
      mpn: facts.mpn ?? identifiers.mpn,
    },
    googleCategory,
    productType,
    shipping,
  };

  let items: GoogleShoppingFeedItem[];

  if (variants.length > 0) {
    const parentId = (product.id || slug).trim();
    items = variants.map((v) =>
      buildFeedItem({
        ...baseParams,
        id: v.sku,
        priceValue: toFeedAmount(v.price),
        oldPrice:
          v.oldPrice != null && Number.isFinite(v.oldPrice) ? toFeedAmount(v.oldPrice) : v.oldPrice,
        itemGroupId: parentId,
        color: v.color,
        size: v.size,
      }),
    );
  } else {
    items = [
      buildFeedItem({
        ...baseParams,
        id: (product.id || slug).trim(),
        priceValue: facts.price,
        oldPrice:
          product.old_price != null && Number.isFinite(Number(product.old_price))
            ? toFeedAmount(Number(product.old_price))
            : product.old_price,
      }),
    ];
  }

  const status = uniqueWarnings.length > 0 ? "warning" : "ready";

  return {
    status,
    issues: [],
    warnings: uniqueWarnings,
    item: items[0] ?? null,
    items,
    feedVersion: GOOGLE_SHOPPING_FEED_VERSION,
  };
}

export function isExcludedFromGoogleShopping(
  product: Pick<Product, "excludeFromGoogleShopping">,
): boolean {
  return product.excludeFromGoogleShopping === true;
}
