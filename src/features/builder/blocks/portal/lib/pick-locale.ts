import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";
import type { LocalizedFieldOptions } from "@/lib/utils";

export function pickLocale(
  record: Record<string, unknown>,
  base: string,
  locale: Locale,
  options?: LocalizedFieldOptions
): string {
  return getLocalizedField(record, base, locale, options);
}
