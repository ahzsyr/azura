import { publicLocalePath } from "@/i18n/url-helpers";

/** Public account area path (unprefixed for default locale). */
export function accountPublicPath(locale: string, subpath = ""): string {
  const normalized = subpath.replace(/^\//, "");
  const path = normalized ? `/account/${normalized}` : "/account";
  return publicLocalePath(locale, path);
}
