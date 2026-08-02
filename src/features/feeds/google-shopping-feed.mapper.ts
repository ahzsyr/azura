import { escapeXml } from "@/lib/xml/escape-xml";
import { getPublicBrandName } from "@/config/site";
import { buildCanonicalUrl } from "@/i18n/seo-helpers";
import { resolveSeoOgImageUrl } from "@/features/seo/seo-image-url";
import { resolveProductPrimaryImageUrl } from "@/features/products/lib/product-primary-image";
import {
  detailedDescriptionPlainText,
  normalizeDetailedDescriptionInput,
} from "@/features/products/lib/product-detailed-description";
import type {
  Product,
  ProductAvailability,
  ProductConditionOption,
  ProductStockStatus,
} from "@/features/products/types";

export type GoogleShoppingAvailability = "in stock" | "out of stock" | "preorder";
export type GoogleShoppingCondition = "new" | "used" | "refurbished";

export type GoogleShoppingFeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  availability: GoogleShoppingAvailability;
  price: string;
  condition: GoogleShoppingCondition;
  brand: string;
};

export type GoogleShoppingFeedProductInput = Product & {
  slug: string;
  excludeFromGoogleShopping?: boolean;
};

/** Public path for the managed Google Shopping feed. */
export const GOOGLE_SHOPPING_FEED_PATH = "/feeds/google-shopping.xml";

export function isExcludedFromGoogleShopping(
  product: Pick<Product, "excludeFromGoogleShopping">,
): boolean {
  return product.excludeFromGoogleShopping === true;
}

export function mapGoogleShoppingAvailability(
  availability?: ProductAvailability,
  stockStatus?: ProductStockStatus,
): GoogleShoppingAvailability {
  if (availability === "OutOfStock" || stockStatus === "out_of_stock") return "out of stock";
  if (availability === "PreOrder" || stockStatus === "preorder") return "preorder";
  if (availability === "InStock" || stockStatus === "in_stock") return "in stock";
  if (availability === "RequestQuote") return "out of stock";
  return "in stock";
}

export function mapGoogleShoppingCondition(
  options?: ProductConditionOption[],
): GoogleShoppingCondition {
  const first = options?.find(Boolean);
  if (first === "used" || first === "refurbished" || first === "new") return first;
  return "new";
}

export function formatGoogleShoppingPrice(value: number, currency: string): string {
  const amount = Number.isFinite(value) ? value : 0;
  const formatted = amount.toFixed(2);
  const code = (currency || "USD").trim().toUpperCase() || "USD";
  return `${formatted} ${code}`;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveGoogleShoppingDescription(product: Product): string {
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

export function resolveGoogleShoppingTitle(product: Product): string {
  return (
    product.productTitle?.trim() ||
    product.name?.trim() ||
    product.title?.trim() ||
    product.id
  );
}

/**
 * Map a product into a Google Shopping item. Returns null when required fields are missing
 * or the product is excluded from the feed.
 */
export function mapProductToGoogleShoppingItem(
  product: GoogleShoppingFeedProductInput,
  options: { siteOrigin: string; localePrefix: string },
): GoogleShoppingFeedItem | null {
  if (isExcludedFromGoogleShopping(product)) return null;

  const title = resolveGoogleShoppingTitle(product);
  const description = resolveGoogleShoppingDescription(product);
  if (!title || !description) return null;

  const imageRaw = resolveProductPrimaryImageUrl(product);
  const imageLink = resolveSeoOgImageUrl(imageRaw, options.siteOrigin);
  if (!imageLink) return null;

  const priceValue = Number(product.price?.value);
  if (!Number.isFinite(priceValue)) return null;

  const slug = product.slug?.trim() || product.id;
  const link = buildCanonicalUrl(
    options.siteOrigin.replace(/\/$/, ""),
    options.localePrefix,
    `/products/${slug}`,
  );

  return {
    id: (product.id || slug).trim(),
    title,
    description,
    link,
    imageLink,
    availability: mapGoogleShoppingAvailability(product.availability, product.stock_status),
    price: formatGoogleShoppingPrice(priceValue, product.price?.currency ?? "USD"),
    condition: mapGoogleShoppingCondition(product.condition_options),
    brand: product.brand?.trim() || getPublicBrandName() || "Unknown",
  };
}

export function formatGoogleShoppingFeedXml(
  items: GoogleShoppingFeedItem[],
  options: { siteOrigin: string; title?: string; description?: string },
): string {
  const siteOrigin = options.siteOrigin.replace(/\/$/, "");
  const title = options.title ?? `${getPublicBrandName()} Google Shopping Feed`;
  const description =
    options.description ?? "Product feed for Google Merchant Center";
  const feedLink = `${siteOrigin}${GOOGLE_SHOPPING_FEED_PATH}`;

  const itemXml = items
    .map((item) => {
      return [
        "    <item>",
        `      <g:id>${escapeXml(item.id)}</g:id>`,
        `      <g:title>${escapeXml(item.title)}</g:title>`,
        `      <g:description>${escapeXml(item.description)}</g:description>`,
        `      <g:link>${escapeXml(item.link)}</g:link>`,
        `      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>`,
        `      <g:availability>${escapeXml(item.availability)}</g:availability>`,
        `      <g:price>${escapeXml(item.price)}</g:price>`,
        `      <g:condition>${escapeXml(item.condition)}</g:condition>`,
        `      <g:brand>${escapeXml(item.brand)}</g:brand>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    `  <channel>`,
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(feedLink)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    itemXml,
    `  </channel>`,
    `</rss>`,
    ``,
  ].join("\n");
}
