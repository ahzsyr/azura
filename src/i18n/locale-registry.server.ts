import "server-only";

import { cache } from "react";
import { localeService } from "@/features/i18n/locale.service";
import {
  FALLBACK_LOCALES,
  isValidUrlPrefixSync,
  resolveCodeToPrefix,
  resolvePrefixToCode,
  type PublicLocale,
} from "@/i18n/locale-config";

export type { PublicLocale };

export const getEnabledLocales = cache(async (): Promise<PublicLocale[]> => {
  const rows = await localeService.listEnabled();
  return rows.length > 0 ? rows : FALLBACK_LOCALES;
});

export async function getEnabledUrlPrefixes(): Promise<string[]> {
  const locales = await getEnabledLocales();
  return locales.map((l) => l.urlPrefix);
}

export async function getDefaultUrlPrefix(): Promise<string> {
  return localeService.getDefaultUrlPrefix();
}

export const isValidUrlPrefix = cache(async (urlPrefix: string): Promise<boolean> => {
  return localeService.isValidLocale(urlPrefix);
});

export async function prefixToCode(urlPrefix: string): Promise<string> {
  const locales = await getEnabledLocales();
  return resolvePrefixToCode(urlPrefix, locales);
}

export async function codeToPrefix(code: string): Promise<string> {
  const locales = await getEnabledLocales();
  return resolveCodeToPrefix(code, locales);
}

export const getLocaleByPrefix = cache(
  async (urlPrefix: string): Promise<PublicLocale | undefined> => {
    const locales = await getEnabledLocales();
    return locales.find((l) => l.urlPrefix === urlPrefix);
  },
);

export const getDirectionByPrefix = cache(
  async (urlPrefix: string): Promise<"ltr" | "rtl"> => {
    const locale = await getLocaleByPrefix(urlPrefix);
    if (locale) return locale.dir === "rtl" ? "rtl" : "ltr";
    return urlPrefix === "ar" || urlPrefix.startsWith("ar") ? "rtl" : "ltr";
  },
);

export { isValidUrlPrefixSync } from "@/i18n/locale-config";
