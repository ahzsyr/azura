import { getEnabledLocales } from "@/i18n/locale-registry.server";

export type IndexerLocale = {
  urlPrefix: string;
  code: string;
};

export async function getIndexerLocales(): Promise<IndexerLocale[]> {
  const locales = await getEnabledLocales();
  return locales.map((l) => ({ urlPrefix: l.urlPrefix, code: l.code }));
}

export async function forEachIndexerLocale(
  fn: (locale: IndexerLocale) => Promise<void>
): Promise<void> {
  const locales = await getIndexerLocales();
  for (const locale of locales) {
    await fn(locale);
  }
}
