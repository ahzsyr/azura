import { getLocaleByCode, defaultLocaleConfig } from "./config";

export function localePath(path: string, localeCode: string): string {
  const locale = getLocaleByCode(localeCode) ?? defaultLocaleConfig;
  const prefix = `/${locale.urlPrefix}`;
  const clean = path === "/" ? "" : `/${path.replace(/^\//, "").replace(/\/$/, "")}`;
  return `${prefix}${clean}` || prefix;
}
