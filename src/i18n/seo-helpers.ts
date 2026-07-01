import type { PublicLocale } from "@/i18n/locale-config";

export type HreflangAlternate = {
  hrefLang: string;
  href: string;
};

/**
 * Build hreflang alternates for all enabled locales.
 */
export function buildHreflangAlternates(
  path: string,
  locales: PublicLocale[],
  siteUrl: string,
  slugByLocale?: Record<string, string>
): Record<string, string> {
  const languages: Record<string, string> = {};

  for (const locale of locales) {
    const localizedPath = slugByLocale?.[locale.code]
      ? path.replace(/[^/]+$/, slugByLocale[locale.code])
      : path;
    languages[locale.htmlLang] = `${siteUrl}/${locale.urlPrefix}${localizedPath}`;
  }

  const defaultLocale = locales.find((l) => l.isDefault);
  if (defaultLocale) {
    languages["x-default"] = `${siteUrl}/${defaultLocale.urlPrefix}${path}`;
  }

  return languages;
}

export function buildCanonicalUrl(
  siteUrl: string,
  localePrefix: string,
  path: string,
  localizedSlug?: string
): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (localizedSlug) {
    const segments = cleanPath.split("/");
    segments[segments.length - 1] = localizedSlug;
    return `${siteUrl}/${localePrefix}${segments.join("/")}`;
  }
  return `${siteUrl}/${localePrefix}${cleanPath}`;
}
