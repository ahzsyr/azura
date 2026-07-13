import { readLegacyFieldForLocale } from "@/features/translation/admin-field-value";
import type { CompanyInfo } from "@prisma/client";

/** Entity row enriched with dynamic suffixed translation keys (nameEn, name_fr, …). */
export type AdminLocalizedEntityView<T extends { id: string } = { id: string }> = T & {
  displayTitle: string;
  localizedLegacy: Record<string, string>;
};

/** Company info plus dynamic localized field keys (titleEn, title_fr, …). */
export type CompanyInfoView = CompanyInfo & {
  localizedLegacy?: Record<string, string>;
  displayTitle?: string;
};

/** Read a localized field for admin UI labels (default locale, typically en). */
export function readAdminDefaultLocaleField(
  row: Record<string, unknown>,
  field: string,
  fallback = ""
): string {
  const val = readLegacyFieldForLocale(row, field, "en");
  return val.trim() || fallback;
}

/** Read a localized field from a loader row (`localizedLegacy`, not typed spread keys). */
export function readAdminLocaleField(
  row: { localizedLegacy: Record<string, string> },
  field: string,
  localeCode: string
): string {
  return readLegacyFieldForLocale(row.localizedLegacy, field, localeCode);
}
