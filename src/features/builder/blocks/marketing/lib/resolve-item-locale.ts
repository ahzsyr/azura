import type { PublicLocale } from "@/i18n/locale-config";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { getLocalizedField } from "@/lib/utils";

export type ResolveItemFieldOptions = {
  enabledLocales?: PublicLocale[];
  defaultCode?: string;
};

/**
 * Resolve a top-level block field after `applyResolvedBlockCopyToProps` has merged
 * EntityTranslation values onto the base key. Prefer the merged base value so we do
 * not incorrectly fall back to legacy English suffixed props for non-default locales.
 */
export function resolveTopLevelField(
  props: Record<string, unknown>,
  field: string,
  locale: string,
  options?: ResolveItemFieldOptions,
): string {
  const merged = props[field];
  if (typeof merged === "string" && merged.trim()) return merged;
  return resolveItemField(props, field, locale, options);
}

/**
 * Shared nested-item localization resolver for repeatable block content.
 * Uses locale candidate fallback + legacy suffixed props (titleEn, title_fr, …).
 */
export function resolveItemField(
  item: Record<string, unknown>,
  base: string,
  locale: string,
  options?: ResolveItemFieldOptions,
): string {
  return getLocalizedField(item, base, locale, {
    enabledLocales: options?.enabledLocales ?? FALLBACK_LOCALES,
    defaultCode: options?.defaultCode,
    includeLegacySuffixFields: true,
  });
}

/** Alias for readability in content-block renderers. */
export const resolveNestedItemField = resolveItemField;
