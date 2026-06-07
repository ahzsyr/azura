import type { PublicLocale } from "@/i18n/locale-config";
import { FALLBACK_LOCALES, resolvePrefixToCode } from "@/i18n/locale-config";
import { readLegacyFieldWithFallback } from "@/features/translation/legacy-adapter";

export type PickLocaleFieldOptions = {
  enabledLocales?: PublicLocale[];
  defaultCode?: string;
};

export function pickLocaleField(
  props: Record<string, unknown>,
  base: string,
  locale: string,
  options?: PickLocaleFieldOptions
): string {
  const enabled = options?.enabledLocales ?? FALLBACK_LOCALES;
  const defaultCode =
    options?.defaultCode ?? enabled.find((l) => l.isDefault)?.code ?? "en";
  const code = resolvePrefixToCode(locale, enabled);
  return readLegacyFieldWithFallback(props, base, code, enabled, defaultCode);
}

export function pickLocaleArrayField<T extends Record<string, unknown>>(
  item: T,
  base: string,
  locale: string,
  options?: PickLocaleFieldOptions
): string {
  return pickLocaleField(item as Record<string, unknown>, base, locale, options);
}
