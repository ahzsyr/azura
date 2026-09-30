import type {
  GoogleShoppingAvailability,
  GoogleShoppingFeedItem,
  GoogleShoppingMarket,
  GoogleShoppingPriceAdjustmentDirection,
} from "./google-shopping-feed.types";

export function isGoogleShoppingAvailability(
  value: unknown,
): value is GoogleShoppingAvailability {
  return (
    value === "in stock" ||
    value === "out of stock" ||
    value === "preorder" ||
    value === "backorder"
  );
}

export function availabilityRequiresDate(
  availability: GoogleShoppingAvailability,
): boolean {
  return availability === "backorder" || availability === "preorder";
}

/** Google accepts YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ; normalize date-only to UTC midnight. */
export function normalizeGoogleShoppingAvailabilityDate(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00Z`;
  }
  return trimmed;
}

export function isGoogleShoppingAvailabilityDate(value: string): boolean {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(trimmed);
}

export function parseGoogleShoppingPriceAmount(
  price: string,
): { amount: number; currency: string } | null {
  const match = price.trim().match(/^(-?\d+(?:\.\d+)?)\s+([A-Za-z]{3})$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  return { amount, currency: match[2].toUpperCase() };
}

function formatAdjustedPrice(amount: number, currency: string): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const code = (currency || "").trim().toUpperCase();
  return `${value.toFixed(2)} ${code}`;
}

/**
 * price_xml = price ± (percentage / 100) * price
 */
export function adjustGoogleShoppingPrice(
  price: string,
  percent: number,
  direction: GoogleShoppingPriceAdjustmentDirection,
): string {
  const parsed = parseGoogleShoppingPriceAmount(price);
  if (!parsed) return price;
  const pct = Number.isFinite(percent) ? Math.max(0, percent) : 0;
  if (pct === 0) return formatAdjustedPrice(parsed.amount, parsed.currency);
  const factor = direction === "decrease" ? 1 - pct / 100 : 1 + pct / 100;
  const next = Math.max(0.01, parsed.amount * factor);
  return formatAdjustedPrice(next, parsed.currency);
}

export function applyGoogleShoppingFeedOverrides(
  items: GoogleShoppingFeedItem[],
  market: Pick<
    GoogleShoppingMarket,
    | "priceAdjustmentPercent"
    | "priceAdjustmentDirection"
    | "availabilityOverride"
    | "availabilityDate"
  >,
): GoogleShoppingFeedItem[] {
  const percent = Number(market.priceAdjustmentPercent ?? 0);
  const direction: GoogleShoppingPriceAdjustmentDirection =
    market.priceAdjustmentDirection === "decrease" ? "decrease" : "increase";
  const shouldAdjustPrice = Number.isFinite(percent) && percent !== 0;
  const override = market.availabilityOverride;
  const dateRaw = market.availabilityDate?.trim() || undefined;
  const date = dateRaw ? normalizeGoogleShoppingAvailabilityDate(dateRaw) : undefined;

  return items.map((item) => {
    const next: GoogleShoppingFeedItem = { ...item };

    if (shouldAdjustPrice) {
      next.price = adjustGoogleShoppingPrice(item.price, percent, direction);
      if (item.salePrice) {
        next.salePrice = adjustGoogleShoppingPrice(item.salePrice, percent, direction);
      }
    }

    if (override) {
      next.availability = override;
    }

    if (availabilityRequiresDate(next.availability) && date) {
      next.availabilityDate = date;
    } else if (!availabilityRequiresDate(next.availability)) {
      delete next.availabilityDate;
    }

    return next;
  });
}
