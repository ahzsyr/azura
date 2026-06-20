import { pickLocale } from "@/features/portal-blocks/lib/pick-locale";
import type { LocalizedValueMap } from "@/features/translation/types";

export function adminLabel(
  record: Record<string, unknown>,
  field = "title",
  locale = "en"
): string {
  const value = record[field];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return pickLocale(record, field, locale) || "(untitled)";
  }
  const legacy = record[`${field}En`];
  if (typeof legacy === "string" && legacy.trim()) return legacy;
  return "(untitled)";
}

export function localizedAdminLabel(
  map: LocalizedValueMap | undefined,
  locale = "en"
): string {
  if (!map) return "(untitled)";
  return pickLocale({ [locale]: map[locale], en: map.en, ...map }, locale, locale) || map.en || "(untitled)";
}
