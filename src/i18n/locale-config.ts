/**
 * Client-safe locale helpers (no DB, no next/cache).
 * Server code should use locale-registry.server.ts for async DB lookups.
 */

export type PublicLocale = {
  code: string;
  urlPrefix: string;
  label: string;
  htmlLang: string;
  dir: "ltr" | "rtl";
  flag: string;
  isDefault: boolean;
};

/** Admin dashboard locale (includes formatting for price fields). */
export type AdminLocale = PublicLocale & {
  currency: string;
  numberLocale: string;
  dateLocale: string;
};

export const DEFAULT_ADMIN_LOCALE: AdminLocale = {
  code: "en",
  urlPrefix: "en",
  label: "English",
  htmlLang: "en",
  dir: "ltr",
  flag: "🇺🇸",
  isDefault: true,
  currency: "USD",
  numberLocale: "en-US",
  dateLocale: "en-US",
};

/** Built-in fallback when DB has no enabled locales */
export const FALLBACK_LOCALES: PublicLocale[] = [
  {
    code: "en",
    urlPrefix: "en",
    label: "English",
    htmlLang: "en",
    dir: "ltr",
    flag: "🇺🇸",
    isDefault: true,
  },
];

export const STATIC_DEFAULT_URL_PREFIX = "en";

/** Locale URL prefixes retired from public routing (e.g. Arabic not launched). */
export const RETIRED_URL_PREFIXES = new Set(["ar"]);

export function isRetiredUrlPrefix(urlPrefix: string): boolean {
  return RETIRED_URL_PREFIXES.has(urlPrefix.trim().toLowerCase());
}

export function filterActivePublicLocales<T extends PublicLocale>(locales: T[]): T[] {
  return locales.filter((locale) => !isRetiredUrlPrefix(locale.urlPrefix));
}

const CONTENT_SUFFIX_BY_CODE: Record<string, string> = {
  en: "En",
  ar: "Ar",
};

export function getContentFieldSuffix(code: string): string {
  const normalized = code.toLowerCase();
  if (CONTENT_SUFFIX_BY_CODE[normalized]) {
    return CONTENT_SUFFIX_BY_CODE[normalized];
  }
  if (/^[a-z]{2}$/i.test(normalized)) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }
  return normalized
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

export function resolvePrefixToCode(urlPrefix: string, locales: PublicLocale[]): string {
  const match = locales.find((l) => l.urlPrefix === urlPrefix);
  if (match) return match.code;
  const byCode = locales.find((l) => l.code === urlPrefix);
  if (byCode) return byCode.code;
  return urlPrefix;
}

export function resolveCodeToPrefix(code: string, locales: PublicLocale[]): string {
  const match = locales.find((l) => l.code === code);
  if (match) return match.urlPrefix;
  const byPrefix = locales.find((l) => l.urlPrefix === code);
  if (byPrefix) return byPrefix.urlPrefix;
  return code;
}

export function isValidUrlPrefixSync(urlPrefix: string, locales: PublicLocale[]): boolean {
  return locales.some((l) => l.urlPrefix === urlPrefix);
}

export function getDirectionSync(
  urlPrefix: string,
  locales: PublicLocale[] = FALLBACK_LOCALES
): "ltr" | "rtl" {
  const locale = locales.find((l) => l.urlPrefix === urlPrefix);
  if (locale) return locale.dir === "rtl" ? "rtl" : "ltr";
  return urlPrefix === "ar" || urlPrefix.startsWith("ar") ? "rtl" : "ltr";
}

export function getHtmlLangSync(
  urlPrefix: string,
  locales: PublicLocale[] = FALLBACK_LOCALES
): string {
  const locale = locales.find((l) => l.urlPrefix === urlPrefix);
  return locale?.htmlLang ?? resolvePrefixToCode(urlPrefix, locales);
}
