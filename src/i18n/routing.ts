import { defineRouting } from "next-intl/routing";
import { FALLBACK_LOCALES, getDirectionSync } from "@/i18n/locale-config";

/** Build-time fallback; runtime uses DB-enabled urlPrefixes via routing-config. */
export const routing = defineRouting({
  locales: FALLBACK_LOCALES.map((locale) => locale.urlPrefix),
  defaultLocale: FALLBACK_LOCALES.find((locale) => locale.isDefault)?.urlPrefix ?? FALLBACK_LOCALES[0]!.urlPrefix,
  localePrefix: "always",
});

/** URL segment / message code — not limited to static routing.locales at runtime */
export type Locale = string;

/** Full routing config for next-intl navigation APIs (createNavigation). */
export const sharedRoutingConfig = routing;

/** Alias for header builder compatibility */
export const defaultLocale = { code: routing.defaultLocale };

export function getDirection(locale: string) {
  return getDirectionSync(locale);
}
