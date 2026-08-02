import type { PublicLocale } from "@/i18n/locale-config";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { getLocalizedField } from "@/lib/utils";

export type ResolveItemFieldOptions = {
  enabledLocales?: PublicLocale[];
  defaultCode?: string;
};

/**
 * Resolve a top-level block field after `applyResolvedBlockCopyToProps` has merged
 * EntityTranslation values onto the base key.
 *
 * If the base key is present (including empty string), treat it as authoritative so
 * intentionally cleared fields do not resurrect via legacy `titleEn` / fallback chains.
 */
export function resolveTopLevelField(
  props: Record<string, unknown>,
  field: string,
  locale: string,
  options?: ResolveItemFieldOptions,
): string {
  if (Object.prototype.hasOwnProperty.call(props, field)) {
    const merged = props[field];
    if (typeof merged === "string") return merged;
  }
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
