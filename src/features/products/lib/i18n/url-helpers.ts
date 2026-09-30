import { rewriteLegacyCollectionRoute } from "@/i18n/url-helpers";
import { getLocaleByCode, defaultLocaleConfig } from "./config";

export function localePath(path: string, localeCode: string): string {
  const locale = getLocaleByCode(localeCode) ?? defaultLocaleConfig;
  const prefix = `/${locale.urlPrefix}`;
  const rewritten = rewriteLegacyCollectionRoute(path.startsWith("/") ? path : `/${path}`);
  const clean = rewritten === "/" ? "" : `/${rewritten.replace(/^\//, "").replace(/\/$/, "")}`;
  return `${prefix}${clean}` || prefix;
}
