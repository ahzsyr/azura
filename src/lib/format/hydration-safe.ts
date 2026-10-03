/**
 * Formatters that emit identical strings on Node SSR and in the browser.
 * Prevents React #418 (`args[]=text`) from locale/timezone ICU drift.
 */

/** Returns a valid Date, or null when the value cannot be parsed (avoids Invalid Date throws). */
export function toValidDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** Stable UTC ISO string for `<time dateTime>`, or null when invalid. */
export function toHydrationSafeIso(
  value: Date | string | number | null | undefined,
): string | null {
  const date = toValidDate(value);
  return date ? date.toISOString() : null;
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
  const date = toValidDate(value);
  if (!date) return "";
  return date.toLocaleDateString(hydrationSafeLocale(locale), {
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
  const date = toValidDate(value);
  if (!date) return "";
  return date.toLocaleString(hydrationSafeLocale(locale), {
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
