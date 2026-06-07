import type { Locale } from "@/i18n/routing";
import { pickLocaleField } from "@/features/content-blocks/lib/locale-field";

export function pickLocale(
  record: Record<string, unknown>,
  base: string,
  locale: Locale
): string {
  return pickLocaleField(record, base, locale);
}
