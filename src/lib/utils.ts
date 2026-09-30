import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  FALLBACK_LOCALES,
  resolvePrefixToCode,
  type PublicLocale,
} from "@/i18n/locale-config";
import {
  type TranslationContext,
} from "@/features/translation/translation-resolver";
import { resolveContentField } from "@/features/translation/resolve-content-field";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string, currency = "USD", locale = "en") {
  const value = typeof price === "string" ? parseFloat(price) : price;
  const code = resolvePrefixToCode(locale, FALLBACK_LOCALES);
  const match = FALLBACK_LOCALES.find((l) => l.code === code);
  const numberLocale = "en-US";
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
  includeLegacySuffixFields?: boolean;
};

/** Resolve a localized field from EntityTranslation, locale maps, or canonical base field. */
export function getLocalizedField(
  item: Record<string, unknown>,
  field: string,
  localeUrlPrefix: string,
  options?: LocalizedFieldOptions
): string {
  return resolveContentField(item, field, localeUrlPrefix, {
    enabledLocales: options?.enabledLocales ?? FALLBACK_LOCALES,
    defaultCode: options?.defaultCode,
    translations: options?.translations,
    includeLegacySuffixFields: options?.includeLegacySuffixFields,
  });
}

export function getWhatsAppUrl(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
