import "server-only";

import { cache } from "react";
import { localeService } from "@/features/i18n/locale.service";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

export type RuntimeLocaleRouting = {
  locales: string[];
  defaultLocale: string;
};

function fallbackRouting(): RuntimeLocaleRouting {
  const locales = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);
  const defaultLocale =
    FALLBACK_LOCALES.find((locale) => locale.isDefault)?.urlPrefix ?? FALLBACK_LOCALES[0]!.urlPrefix;
  return { locales, defaultLocale };
}

export const getRuntimeLocaleRouting = cache(async (): Promise<RuntimeLocaleRouting> => {
  try {
    const config = await localeService.getRoutingConfig();
    if (config.locales.length > 0 && config.defaultLocale) {
      return config;
    }
  } catch {
    // fall through to static fallback
  }
  return fallbackRouting();
});

export async function getRuntimeLocalePrefixes(): Promise<string[]> {
  const routing = await getRuntimeLocaleRouting();
  return routing.locales;
}

export async function getRuntimeDefaultLocalePrefix(): Promise<string> {
  const routing = await getRuntimeLocaleRouting();
  return routing.defaultLocale;
}

