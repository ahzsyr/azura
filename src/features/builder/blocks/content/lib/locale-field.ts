import type { PublicLocale } from "@/i18n/locale-config";
import {
  resolveItemField,
  type ResolveItemFieldOptions,
} from "@/features/builder/blocks/marketing/lib/resolve-item-locale";

/** @deprecated Prefer ResolveItemFieldOptions — kept for existing call sites. */
export type PickLocaleFieldOptions = ResolveItemFieldOptions;

/** Resolve a localized nested field using the shared item resolver (suffix + fallback chain). */
export function pickLocaleField(
  props: Record<string, unknown>,
  base: string,
  locale: string,
  options?: PickLocaleFieldOptions,
): string {
  return resolveItemField(props, base, locale, options);
}

/** Resolve a localized field on a repeatable block item (same resolver as marketing grids). */
export function pickLocaleArrayField<T extends Record<string, unknown>>(
  item: T,
  base: string,
  locale: string,
  options?: PickLocaleFieldOptions,
): string {
  return resolveItemField(item, base, locale, options);
}
