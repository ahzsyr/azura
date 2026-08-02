import { getContentFieldSuffix } from "@/i18n/locale-config";

/** Resolve a localized title from builder picker options (gallery, FAQ, etc.). */
export function resolveBuilderOptionTitle(
  option: Record<string, unknown> | null | undefined,
  localeCode: string,
  fallback = "Untitled"
): string {
  if (!option) return fallback;

  const suffix = getContentFieldSuffix(localeCode);
  const keys =
    suffix === "En" || suffix === "Ar"
      ? [`title${suffix}`, "titleEn", "title"]
      : [`title_${localeCode}`, `title${suffix}`, "titleEn", "title"];

  for (const key of keys) {
    const val = option[key];
    if (typeof val === "string" && val.trim()) return val;
  }

  return fallback;
}
