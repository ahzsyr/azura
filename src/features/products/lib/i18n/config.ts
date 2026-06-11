export {
  defaultLocale,
  adminLocale,
  isConfiguredLocaleCode,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";

import type { LocaleConfig } from "./types";

export const locales: LocaleConfig[] = [
  { code: "en-us", urlPrefix: "en", label: "English" },
  { code: "ar-ae", urlPrefix: "ar", label: "Arabic" },
];

export const defaultLocaleConfig = locales[0];

export function getLocaleByCode(code: string): LocaleConfig | undefined {
  const c = code.trim().toLowerCase();
  return locales.find((l) => l.code === c || l.urlPrefix === c);
}

export function getLocaleByPrefix(prefix: string): LocaleConfig | undefined {
  const p = prefix.replace(/^\//, "").toLowerCase();
  return locales.find((l) => l.urlPrefix === p);
}

export const configuredLocaleCodes = locales.map((l) => l.code);
