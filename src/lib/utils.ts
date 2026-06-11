import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  FALLBACK_LOCALES,
  getContentFieldSuffix,
  resolvePrefixToCode,
  type PublicLocale,
} from "@/i18n/locale-config";
import { resolveLocaleCandidates } from "@/i18n/locale-resolution";
import { resolveTranslation, type TranslationContext } from "@/features/translation/translation-resolver";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string, currency = "USD", locale = "en") {
  const value = typeof price === "string" ? parseFloat(price) : price;
  const code = resolvePrefixToCode(locale, FALLBACK_LOCALES);
  const match = FALLBACK_LOCALES.find((l) => l.code === code);
  const numberLocale = code === "ar" ? "ar-SA" : "en-US";
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export type LocalizedFieldOptions = {
  enabledLocales?: PublicLocale[];
  defaultCode?: string;
  translations?: TranslationContext["translations"];
};

/**
 * Resolve a localized field from translation table, legacy columns, or fallback chain.
 */
export function getLocalizedField<T extends Record<string, unknown>>(
  item: T,
  field: string,
  localeUrlPrefix: string,
  options?: LocalizedFieldOptions
): string {
  const enabled = options?.enabledLocales ?? FALLBACK_LOCALES;
  const code = resolvePrefixToCode(localeUrlPrefix, enabled);
  return resolveTranslation(field, code, {
    legacyEntity: item,
    enabledLocales: enabled,
    defaultCode: options?.defaultCode,
    translations: options?.translations,
  });
}

/** @deprecated Use getLocalizedField with translation context instead */
export function getLocalizedFieldLegacy<T extends Record<string, unknown>>(
  item: T,
  field: string,
  localeUrlPrefix: string
): string {
  const code = resolvePrefixToCode(localeUrlPrefix, FALLBACK_LOCALES);
  const suffix = getContentFieldSuffix(code);
  const key = `${field}${suffix}`;
  const value = item[key];
  if (typeof value === "string" && value.length > 0) return value;
  for (const candidate of resolveLocaleCandidates(code, FALLBACK_LOCALES)) {
    const candidateSuffix = getContentFieldSuffix(candidate);
    const candidateKey = `${field}${candidateSuffix}`;
    const candidateValue = item[candidateKey];
    if (typeof candidateValue === "string" && candidateValue.length > 0) return candidateValue;
  }
  const fallback = item[`${field}En`];
  return typeof fallback === "string" ? fallback : "";
}

export function getWhatsAppUrl(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
