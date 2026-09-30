import type { Product, ProductAvailability, ProductStockStatus } from "@/features/products/types";
import type { GoogleShoppingAvailability, GoogleShoppingMarket } from "@/features/feeds/google-shopping-feed.types";
import {
  convertAmountToFeedCurrency,
  resolveGoogleShoppingFeedCurrency,
  resolveProductCurrency,
} from "@/features/feeds/google-shopping-market";

export type ProductOfferFacts = {
  emitOffer: boolean;
  price?: number;
  priceCurrency?: string;
  schemaAvailability?: string;
  shoppingAvailability: GoogleShoppingAvailability | null;
  sku?: string;
  gtin?: string;
  mpn?: string;
};

export function looksLikeGtin(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 8 || digits.length === 12 || digits.length === 13 || digits.length === 14;
}

export function resolveProductIdentifiers(
  product: Pick<Product, "ean" | "mpn" | "manufacturer_part_number">,
): { sku?: string; gtin?: string; mpn?: string } {
  const mpn = (product.mpn || product.manufacturer_part_number || "").trim() || undefined;
  const gtinRaw = (product.ean || "").trim();
  const gtin =
    gtinRaw && looksLikeGtin(gtinRaw) ? gtinRaw.replace(/\D/g, "") || gtinRaw : gtinRaw || undefined;
  return {
    sku: mpn,
    gtin: gtin && looksLikeGtin(gtin) ? gtin : undefined,
    mpn,
  };
}

export function mapGoogleShoppingAvailability(
  availability?: ProductAvailability | string,
  stockStatus?: ProductStockStatus | string,
): GoogleShoppingAvailability | null {
  if (availability === "RequestQuote" || availability === "ExternalPurchase") return null;
  if (availability === "OutOfStock" || stockStatus === "out_of_stock") return "out of stock";
  if (availability === "PreOrder" || stockStatus === "preorder") return "preorder";
  if (availability === "Backorder" || stockStatus === "backorder") return "backorder";
  if (availability === "InStock" || stockStatus === "in_stock") return "in stock";
  return "in stock";
}

function schemaAvailabilityFromShopping(
  shopping: GoogleShoppingAvailability | null,
): string | undefined {
  if (shopping === "in stock") return "https://schema.org/InStock";
  if (shopping === "out of stock") return "https://schema.org/OutOfStock";
  if (shopping === "preorder") return "https://schema.org/PreOrder";
  if (shopping === "backorder") return "https://schema.org/BackOrder";
  return undefined;
}

/**
 * Single source of truth for purchasable offer fields shared by JSON-LD Product
 * schema and the Google Shopping XML feed.
 *
 * - No market: JSON-LD uses product list price/currency.
 * - With market: feed uses converted amount + market feed currency.
 */
export function resolveProductOfferFacts(
  product: Product,
  market?: GoogleShoppingMarket,
): ProductOfferFacts {
  const identifiers = resolveProductIdentifiers(product);
  const shoppingAvailability = mapGoogleShoppingAvailability(
    product.availability,
    product.stock_status,
  );
  const rawPrice = product.price?.value;
  const hasPrice = typeof rawPrice === "number" && Number.isFinite(rawPrice) && rawPrice > 0;
  const emitOffer = Boolean(shoppingAvailability) && hasPrice;

  if (!emitOffer) {
    return {
      emitOffer: false,
      schemaAvailability: schemaAvailabilityFromShopping(shoppingAvailability),
      shoppingAvailability,
      sku: identifiers.sku,
      gtin: identifiers.gtin,
      mpn: identifiers.mpn,
    };
  }

  if (market) {
    const sourceCurrency = resolveProductCurrency(product, market);
    const priceCurrency = resolveGoogleShoppingFeedCurrency(market);
    const price = convertAmountToFeedCurrency(rawPrice, sourceCurrency, market);
    return {
      emitOffer: true,
      price,
      priceCurrency,
      schemaAvailability: schemaAvailabilityFromShopping(shoppingAvailability),
      shoppingAvailability,
      sku: identifiers.sku,
      gtin: identifiers.gtin,
      mpn: identifiers.mpn,
    };
  }

  return {
    emitOffer: true,
    price: rawPrice,
    priceCurrency: product.price?.currency?.trim() || undefined,
    schemaAvailability: schemaAvailabilityFromShopping(shoppingAvailability),
    shoppingAvailability,
    sku: identifiers.sku,
    gtin: identifiers.gtin,
    mpn: identifiers.mpn,
  };
}
