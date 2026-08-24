import { getContentFieldSuffix } from "@/i18n/locale-config";

/** HTML form name for a localized field (supports legacy En/Ar and modern `_code`). */
export function getLocalizedFormFieldName(fieldKey: string, localeCode: string): string {
  const suffix = getContentFieldSuffix(localeCode);
  if (suffix === "En" || suffix === "Ar") {
    return `${fieldKey}${suffix}`;
  }
  return `${fieldKey}_${localeCode}`;
}
