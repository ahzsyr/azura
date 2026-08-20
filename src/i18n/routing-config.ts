import "server-only";

import { createCached, CACHE_TAGS } from "@/services/cache";
import { localeService } from "@/features/i18n/locale.service";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";

export type LocaleRoutingConfig = {
  locales: string[];
  defaultLocale: string;
};

const loadRoutingConfigCached = createCached(
  () => localeService.getRoutingConfig(),
  ["locale-routing-config"],
  { tags: [CACHE_TAGS.locales], revalidate: 300 },
);

/** DB-backed locale routing for server components and APIs. */
export async function getLocaleRoutingConfig(): Promise<LocaleRoutingConfig> {
  const config = await loadRoutingConfigCached();
  const fallbackLocales = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);
  const fallbackDefaultLocale =
    FALLBACK_LOCALES.find((locale) => locale.isDefault)?.urlPrefix ?? FALLBACK_LOCALES[0]!.urlPrefix;
  return {
    locales: config.locales.length > 0 ? config.locales : fallbackLocales,
    defaultLocale: config.defaultLocale || fallbackDefaultLocale,
  };
}
