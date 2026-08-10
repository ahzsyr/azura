import "server-only";

import { cache } from "react";
import { localeService } from "@/features/i18n/locale.service";
import type { LocaleConfig } from "./types";

const loadLocalesCached = cache(async (): Promise<LocaleConfig[]> => {
  const rows = await localeService.listEnabled();
  return rows.map((l) => ({
    code: l.code,
    urlPrefix: l.urlPrefix,
    label: l.label,
  }));
});

export async function getConfiguredLocales(): Promise<LocaleConfig[]> {
  return loadLocalesCached();
}

export async function getConfiguredLocaleCodes(): Promise<string[]> {
  const locales = await getConfiguredLocales();
  return locales.map((l) => l.code);
}

export async function getLocaleByCodeAsync(code: string): Promise<LocaleConfig | undefined> {
  const locales = await getConfiguredLocales();
  const c = code.trim().toLowerCase();
  return locales.find((l) => l.code === c || l.urlPrefix === c);
}

export async function getLocaleByPrefixAsync(prefix: string): Promise<LocaleConfig | undefined> {
  const locales = await getConfiguredLocales();
  const p = prefix.replace(/^\//, "").toLowerCase();
  return locales.find((l) => l.urlPrefix === p);
}

export async function isConfiguredLocaleCodeAsync(code: string): Promise<boolean> {
  const localesList = await getConfiguredLocales();
  const c = code.trim().toLowerCase();
  return localesList.some((l) => l.code === c || l.urlPrefix === c);
}
