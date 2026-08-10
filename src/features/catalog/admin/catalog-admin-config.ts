import { DEFAULT_ADMIN_LOCALE } from "@/i18n/locale-config";

/** Default admin locale fallback when dynamic locale loading is unavailable. */
export const defaultLocale = {
  code: DEFAULT_ADMIN_LOCALE.code,
  urlPrefix: DEFAULT_ADMIN_LOCALE.urlPrefix,
};

export const adminLocale = defaultLocale;

export function isConfiguredLocaleCode(code: string): boolean {
  return code.trim().length > 0;
}

export function resolveConfiguredLocaleCode(candidate: string, fallback: string): string {
  const normalized = candidate.trim().toLowerCase();
  return normalized || fallback;
}
