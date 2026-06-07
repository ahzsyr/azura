import type { PublicLocale } from "@/i18n/locale-config";
import { FALLBACK_LOCALES, resolvePrefixToCode } from "@/i18n/locale-config";
import { readLegacyFieldWithFallback } from "@/features/translation/legacy-adapter";

export type ResolveItemFieldOptions = {
  enabledLocales?: PublicLocale[];
  defaultCode?: string;
};

export function resolveItemField(
  item: Record<string, unknown>,
  base: string,
  locale: string,
  options?: ResolveItemFieldOptions
): string {
  const enabled = options?.enabledLocales ?? FALLBACK_LOCALES;
  const defaultCode =
    options?.defaultCode ?? enabled.find((l) => l.isDefault)?.code ?? "en";
  const code = resolvePrefixToCode(locale, enabled);
  return readLegacyFieldWithFallback(item, base, code, enabled, defaultCode);
}
