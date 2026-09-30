import type { LayoutDirection } from "./direction-types";

export type DirectionLocaleMeta = {
  code?: string;
  urlPrefix?: string;
  dir?: LayoutDirection;
};

const RTL_LANGUAGE_CODES = new Set(["ar", "fa", "he", "ur"]);
const ARABIC_LANGUAGE_CODES = new Set(["ar"]);

export function getLocaleLanguageCode(locale: string): string {
  return locale.trim().toLowerCase().split(/[-_]/)[0] ?? "";
}

function normalizeLocaleKey(locale: string): string {
  return locale.trim().toLowerCase();
}

export function resolveDirection(
  locale: string,
  locales: DirectionLocaleMeta[] = [],
): LayoutDirection {
  const normalized = normalizeLocaleKey(locale);
  const matchedLocale = locales.find((entry) => {
    const urlPrefix = entry.urlPrefix ? normalizeLocaleKey(entry.urlPrefix) : "";
    const code = entry.code ? normalizeLocaleKey(entry.code) : "";
    return urlPrefix === normalized || code === normalized;
  });

  if (matchedLocale?.dir) {
    return matchedLocale.dir;
  }

  return RTL_LANGUAGE_CODES.has(getLocaleLanguageCode(locale)) ? "rtl" : "ltr";
}

export function isArabicLocale(locale: string): boolean {
  return ARABIC_LANGUAGE_CODES.has(getLocaleLanguageCode(locale));
}

