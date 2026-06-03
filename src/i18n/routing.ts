import { defineRouting } from "next-intl/routing";
import { getDirectionSync } from "@/i18n/locale-config";

/** Build-time fallback; runtime middleware uses DB-enabled urlPrefixes */
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
});

/** URL segment / message code — not limited to static routing.locales at runtime */
export type Locale = string;

/** Full routing config for next-intl navigation APIs (createNavigation). */
export const sharedRoutingConfig = routing;

/** Alias for project-c header builder compatibility */
export const defaultLocale = { code: routing.defaultLocale };

export function getDirection(locale: string) {
  return getDirectionSync(locale);
}
