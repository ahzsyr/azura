import { getContentFieldSuffix } from "@/i18n/locale-config";
import type { LocalizedFieldValue } from "./components/localized-fields";
import { isExplicitLocaleFieldClear } from "@/features/translation/resolve-content-field";

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

export type ResolveAdminFieldValueOptions = {
  /**
   * When true (default), an empty unsuffixed default-locale key (`label: ""`)
   * wins over EntityTranslation — needed for menu JSON dual-write.
   * Builder blocks always ship empty-string defaults (`content: ""`); pass
   * false so the inspector can show EntityTranslation / `contentEn` values.
   */
  treatEmptyUnsuffixedAsClear?: boolean;
};

/**
 * Admin edit display: EntityTranslation / values map first, then legacy bootstrap
 * for the default locale only. Never falls back to default locale for other locales.
 *
 * Explicit dual-write clears (`fieldEn: ""`) win over stale EntityTranslation rows
 * so the inspector matches the live site after a field is emptied.
 */
export function resolveAdminFieldValue(
  values: Record<string, LocalizedFieldValue | string> | undefined,
  legacyEntity: Record<string, unknown> | undefined,
  fieldKey: string,
  localeCode: string,
  defaultLocaleCode: string,
  options?: ResolveAdminFieldValueOptions
): string {
  if (legacyEntity && isExplicitLocaleFieldClear(legacyEntity, fieldKey, localeCode)) {
    return "";
  }

  const treatEmptyUnsuffixedAsClear = options?.treatEmptyUnsuffixedAsClear !== false;

  // Default-locale dual-write (e.g. menu `label: ""`) must win over stale ET rows.
  if (
    treatEmptyUnsuffixedAsClear &&
    localeCode === defaultLocaleCode &&
    legacyEntity &&
    Object.prototype.hasOwnProperty.call(legacyEntity, fieldKey) &&
    legacyEntity[fieldKey] === ""
  ) {
    return "";
  }

  // Non-empty legacy default-locale field wins over stale EntityTranslation rows
  // during dual-write migration (menu JSON label vs published translation).
  if (localeCode === defaultLocaleCode && legacyEntity) {
    const base = legacyEntity[fieldKey];
    if (typeof base === "string" && base.trim()) return base;
  }

  const entry = values?.[localeCode];
  if (entry !== undefined) {
    const raw = typeof entry === "string" ? entry : entry.value;
    if (typeof raw === "string" && raw.trim()) return raw;
  }

  return readLegacyFieldForLocale(legacyEntity, fieldKey, localeCode);
}

/** Default-locale value for live-site fallback hints (not for input prefill). */
export function resolveDefaultLocaleHint(
  values: Record<string, LocalizedFieldValue | string> | undefined,
  legacyEntity: Record<string, unknown> | undefined,
  fieldKey: string,
  defaultLocaleCode: string,
  options?: ResolveAdminFieldValueOptions
): string {
  return resolveAdminFieldValue(
    values,
    legacyEntity,
    fieldKey,
    defaultLocaleCode,
    defaultLocaleCode,
    options
  );
}
