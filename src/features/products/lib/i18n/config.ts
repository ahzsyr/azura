import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import type { LocaleConfig } from "./types";

/**
 * Sync build-time / client-safe fallback only.
 * Server code must use config.server.ts (LocaleConfig from DB).
 */
export const locales: LocaleConfig[] = FALLBACK_LOCALES.map((l) => ({
  code: l.code,
  urlPrefix: l.urlPrefix,
  label: l.label,
}));

export const defaultLocaleConfig = locales.find((l) => l.urlPrefix === "en") ?? locales[0];

export function getLocaleByCode(code: string): LocaleConfig | undefined {
  const c = code.trim().toLowerCase();
  return locales.find((l) => l.code === c || l.urlPrefix === c);
}

export function getLocaleByPrefix(prefix: string): LocaleConfig | undefined {
  const p = prefix.replace(/^\//, "").toLowerCase();
  return locales.find((l) => l.urlPrefix === p);
}

export const configuredLocaleCodes = locales.map((l) => l.code);

export {
  defaultLocale,
  adminLocale,
  isConfiguredLocaleCode,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
