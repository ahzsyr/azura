/**
 * Formatters that emit identical strings on Node SSR and in the browser.
 * Prevents React #418 (`args[]=text`) from locale/timezone ICU drift.
 */

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** BCP-47 tag safe for Number/DateFormat on both Node and Chromium. */
export function hydrationSafeLocale(locale?: string | null): "en-US" | "ar-AE" {
  const raw = (locale ?? "en").toLowerCase();
  return raw === "ar" || raw.startsWith("ar-") || raw === "arabic" ? "ar-AE" : "en-US";
}

export function formatHydrationSafeDate(
  value: Date | string | number,
  locale?: string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  return toDate(value).toLocaleDateString(hydrationSafeLocale(locale), {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
}

export function formatHydrationSafeDateTime(
  value: Date | string | number,
  locale?: string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  return toDate(value).toLocaleString(hydrationSafeLocale(locale), {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

export function formatHydrationSafeNumber(
  value: number,
  locale?: string | null,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(hydrationSafeLocale(locale), options).format(value);
}

export function formatHydrationSafeCurrency(
  amount: number,
  currency: string,
  locale?: string | null,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(hydrationSafeLocale(locale), {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
      ...options,
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toFixed(2)}`;
  }
}
