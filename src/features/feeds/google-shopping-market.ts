import type { Product } from "@/features/products/types";
import { convertAmount } from "@/features/products/lib/currency/convert";
import embeddedCurrencyConfig from "@/seeds/catalog/currency.config.json";
import { GOOGLE_SHOPPING_FEED_PATH } from "./google-shopping-feed.types";
import type {
  GoogleShoppingAvailability,
  GoogleShoppingMarket,
  GoogleShoppingPriceAdjustmentDirection,
  GoogleShoppingValidationMode,
} from "./google-shopping-feed.types";
import { isGoogleShoppingAvailability } from "./google-shopping-feed.overrides";

export const DEFAULT_GOOGLE_SHOPPING_MARKET: Omit<
  GoogleShoppingMarket,
  "siteOrigin" | "localePrefix" | "feedUrl"
> = {
  country: "AE",
  language: "en",
  defaultCurrency: "AED",
  destination: "shopping_ads",
  validationMode: "standard",
  shippingCountry: "AE",
  shippingService: "Standard",
  shippingPrice: 0,
};

function asString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function asValidationMode(value: unknown): GoogleShoppingValidationMode {
  if (value === "strict" || value === "permissive" || value === "standard") return value;
  return "standard";
}

function asPriceAdjustmentPercent(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function asPriceAdjustmentDirection(value: unknown): GoogleShoppingPriceAdjustmentDirection {
  return value === "decrease" ? "decrease" : "increase";
}

function asAvailabilityOverride(value: unknown): GoogleShoppingAvailability | undefined {
  return isGoogleShoppingAvailability(value) ? value : undefined;
}

function asAvailabilityDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function asShippingPrice(value: unknown): number | null | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** Absolute http(s) URL → origin, or null. */
export function originFromAbsoluteUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Store origin for product landing pages (g:link).
 * Priority: storeUrl → absolute feedUrl origin → request/site origin.
 * Must match the verified online store URL in Google Merchant Center Business info.
 */
export function resolveGoogleShoppingStoreOrigin(
  config: Record<string, string | number | boolean | null | undefined> | undefined,
  fallbackSiteOrigin: string,
): string {
  const cfg = config ?? {};
  const fromStore = originFromAbsoluteUrl(cfg.storeUrl);
  if (fromStore) return fromStore;
  const fromFeed = originFromAbsoluteUrl(cfg.feedUrl);
  if (fromFeed) return fromFeed;
  return fallbackSiteOrigin.replace(/\/$/, "");
}

/** Exact host match for product links vs configured store origin (www ≠ apex). */
export function productLinksMatchStoreOrigin(
  items: Array<{ link: string }>,
  storeOrigin: string,
): boolean {
  let expectedHost: string;
  try {
    expectedHost = new URL(storeOrigin).host;
  } catch {
    return false;
  }
  if (items.length === 0) return true;
  return items.every((item) => {
    try {
      return new URL(item.link).host === expectedHost;
    } catch {
      return false;
    }
  });
}

/**
 * True when store origin uses a `www.` host.
 * On BRT, www 308-redirects to apex — GMC + g:link must use the final (apex) host.
 */
export function storeOriginUsesWwwPrefix(storeOrigin: string): boolean {
  try {
    return new URL(storeOrigin).hostname.toLowerCase().startsWith("www.");
  } catch {
    return false;
  }
}

/** Apex twin origin for a www host (e.g. https://www.brt-me.com → https://brt-me.com). */
export function apexOriginSuggestion(storeOrigin: string): string | null {
  try {
    const parsed = new URL(storeOrigin);
    const host = parsed.hostname.toLowerCase();
    if (!host.startsWith("www.")) return null;
    parsed.hostname = host.slice(4);
    return parsed.origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Feed Health: store origin is usable as final landing host (not a www twin that redirects to apex).
 */
export function storeOriginIsFinalLandingHost(storeOrigin: string): boolean {
  return Boolean(storeOrigin) && !storeOriginUsesWwwPrefix(storeOrigin);
}

/**
 * Build a market object from Merchant Center service configuration + site context.
 * Production defaults: AE / en / AED / shopping_ads / standard validation.
 * `siteOrigin` is pinned to the verified store origin so g:link matches GMC Business info.
 */
export function resolveGoogleShoppingMarket(
  config: Record<string, string | number | boolean | null | undefined> | undefined,
  options: { siteOrigin: string; localePrefix: string },
): GoogleShoppingMarket {
  const fallbackOrigin = options.siteOrigin.replace(/\/$/, "");
  const localePrefix = options.localePrefix.replace(/^\/|\/$/g, "") || "en";
  const cfg = config ?? {};

  const siteOrigin = resolveGoogleShoppingStoreOrigin(cfg, fallbackOrigin);

  const defaultCurrency = asString(cfg.defaultCurrency, DEFAULT_GOOGLE_SHOPPING_MARKET.defaultCurrency);
  const shippingCountry = asString(
    cfg.shippingCountry,
    DEFAULT_GOOGLE_SHOPPING_MARKET.shippingCountry ?? "AE",
  );
  const shippingService = asString(
    cfg.shippingService,
    DEFAULT_GOOGLE_SHOPPING_MARKET.shippingService ?? "Standard",
  );
  const shippingPrice =
    asShippingPrice(cfg.shippingPrice) ?? DEFAULT_GOOGLE_SHOPPING_MARKET.shippingPrice ?? 0;

  const feedUrl =
    asString(cfg.feedUrl, "") || `${siteOrigin}${GOOGLE_SHOPPING_FEED_PATH}`;

  return {
    country: asString(cfg.country, DEFAULT_GOOGLE_SHOPPING_MARKET.country),
    language: asString(cfg.language, DEFAULT_GOOGLE_SHOPPING_MARKET.language),
    defaultCurrency,
    destination: asString(cfg.destination, DEFAULT_GOOGLE_SHOPPING_MARKET.destination),
    validationMode: asValidationMode(cfg.validationMode),
    feedUrl,
    shippingCountry,
    shippingService,
    shippingPrice,
    siteOrigin,
    localePrefix,
    priceAdjustmentPercent: asPriceAdjustmentPercent(cfg.feedPriceAdjustmentPercent),
    priceAdjustmentDirection: asPriceAdjustmentDirection(cfg.feedPriceAdjustmentDirection),
    availabilityOverride: asAvailabilityOverride(cfg.feedAvailability),
    availabilityDate: asAvailabilityDate(cfg.feedAvailabilityDate),
  };
}

/**
 * Source currency on the product record (for diagnostics). Does not mutate the product.
 */
export function resolveProductCurrency(
  product: Pick<Product, "price">,
  market: Pick<GoogleShoppingMarket, "defaultCurrency">,
): string {
  const explicit = product.price?.currency?.trim();
  if (explicit) return explicit.toUpperCase();
  return (market.defaultCurrency || "AED").trim().toUpperCase() || "AED";
}

/**
 * Currency used in the Shopping feed for price + shipping.
 * Always the market default so GMC does not see “Inconsistent currencies”.
 */
export function resolveGoogleShoppingFeedCurrency(
  market: Pick<GoogleShoppingMarket, "defaultCurrency">,
): string {
  return (market.defaultCurrency || "AED").trim().toUpperCase() || "AED";
}

/**
 * Convert a catalog amount into the feed currency using embedded FX rates.
 * If rates are missing for a code, keeps the numeric amount (still labeled as feed currency).
 */
export function convertAmountToFeedCurrency(
  amount: number,
  fromCurrency: string,
  market: Pick<GoogleShoppingMarket, "defaultCurrency">,
): number {
  const target = resolveGoogleShoppingFeedCurrency(market);
  const from = (fromCurrency || target).trim().toUpperCase() || target;
  if (!Number.isFinite(amount) || from === target) return amount;
  const base = String(embeddedCurrencyConfig.baseCurrency || "USD").toUpperCase();
  const rates: Record<string, number> = {};
  for (const [k, v] of Object.entries(embeddedCurrencyConfig.rates ?? {})) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) rates[k.toUpperCase()] = n;
  }
  if (!(rates[base] > 0)) rates[base] = 1;
  return convertAmount(amount, from, target, rates);
}

export function isFeedShippingConfigured(
  market: Pick<GoogleShoppingMarket, "shippingCountry" | "shippingService" | "shippingPrice">,
): boolean {
  const country = market.shippingCountry?.trim();
  const service = market.shippingService?.trim();
  if (!country || !service) return false;
  return market.shippingPrice != null && Number.isFinite(Number(market.shippingPrice));
}

export function formatFeedShippingPrice(
  market: Pick<GoogleShoppingMarket, "shippingPrice" | "defaultCurrency">,
): string {
  const amount = Number(market.shippingPrice ?? 0);
  const currency = (market.defaultCurrency || "AED").trim().toUpperCase() || "AED";
  return `${(Number.isFinite(amount) ? amount : 0).toFixed(2)} ${currency}`;
}
