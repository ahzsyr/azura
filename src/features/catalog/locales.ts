import "server-only";

import { cache } from "react";
import { localeService } from "@/features/i18n/locale.service";
import { resolvePrefixToCode } from "@/i18n/locale-config";

export const getCatalogUrlPrefixes = cache(async (): Promise<string[]> => {
  const enabled = await localeService.listEnabled();
  return enabled.map((l) => l.urlPrefix);
});

export async function getCatalogLocaleCodes(): Promise<string[]> {
  const enabled = await localeService.listEnabled();
  return enabled.map((l) => l.code);
}

export async function prefixToCatalogLocaleCode(urlPrefix: string): Promise<string> {
  const enabled = await localeService.listEnabled();
  return resolvePrefixToCode(urlPrefix, enabled);
}

export const resolveUrlPrefixToLocaleCode = prefixToCatalogLocaleCode;

async function defaultCatalogLocaleCode(): Promise<string> {
  const enabled = await localeService.listEnabled();
  const def = enabled.find((l) => l.isDefault) ?? enabled[0];
  return def?.code.toLowerCase() ?? "en-us";
}

/** Enabled catalog locale code marked as default (falls back to en-us). */
export async function getDefaultCatalogLocaleCode(): Promise<string> {
  return defaultCatalogLocaleCode();
}

/** Normalize a locale code or url prefix to an enabled catalog locale code. */
export async function normalizeCatalogLocaleCode(raw: string): Promise<string> {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return defaultCatalogLocaleCode();

  const enabled = await localeService.listEnabled();
  const byCode = enabled.find((l) => l.code.toLowerCase() === trimmed);
  if (byCode) return byCode.code.toLowerCase();

  const byPrefix = enabled.find((l) => l.urlPrefix.toLowerCase() === trimmed);
  if (byPrefix) return byPrefix.code.toLowerCase();

  return defaultCatalogLocaleCode();
}
