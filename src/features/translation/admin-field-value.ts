import { getContentFieldSuffix } from "@/i18n/locale-config";
import type { LocalizedFieldValue } from "./components/localized-fields";

function readLegacySuffixedValue(
  legacyEntity: Record<string, unknown>,
  fieldKey: string,
  localeCode: string
): string {
  const suffix = getContentFieldSuffix(localeCode);
  const camelKey = `${fieldKey}${suffix}`;
  const camelVal = legacyEntity[camelKey];
  if (typeof camelVal === "string" && camelVal.trim()) return camelVal;

  const underscoreKey = `${fieldKey}_${localeCode.toLowerCase()}`;
  const underscoreVal = legacyEntity[underscoreKey];
  if (typeof underscoreVal === "string") return underscoreVal;

  return "";
}

/** Read a legacy suffixed key without falling back to English. */
export function readLegacyFieldForLocale(
  legacyEntity: Record<string, unknown> | undefined,
  fieldKey: string,
  localeCode: string
): string {
  if (!legacyEntity) return "";
  return readLegacySuffixedValue(legacyEntity, fieldKey, localeCode);
}

/**
 * Admin edit display: EntityTranslation / values map first, then legacy bootstrap
 * for the default locale only. Never falls back to default locale for other locales.
 */
export function resolveAdminFieldValue(
  values: Record<string, LocalizedFieldValue | string> | undefined,
  legacyEntity: Record<string, unknown> | undefined,
  fieldKey: string,
  localeCode: string,
  defaultLocaleCode: string
): string {
  const entry = values?.[localeCode];
  if (entry !== undefined) {
    const raw = typeof entry === "string" ? entry : entry.value;
    if (typeof raw === "string") return raw;
  }

  if (localeCode === defaultLocaleCode) {
    return readLegacyFieldForLocale(legacyEntity, fieldKey, localeCode);
  }

  return readLegacyFieldForLocale(legacyEntity, fieldKey, localeCode);
}

/** Default-locale value for live-site fallback hints (not for input prefill). */
export function resolveDefaultLocaleHint(
  values: Record<string, LocalizedFieldValue | string> | undefined,
  legacyEntity: Record<string, unknown> | undefined,
  fieldKey: string,
  defaultLocaleCode: string
): string {
  return resolveAdminFieldValue(values, legacyEntity, fieldKey, defaultLocaleCode, defaultLocaleCode);
}
