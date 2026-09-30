import type { PublicLocale } from "@/i18n/locale-config";
import {
  getFallbackDefaultLocalePrefix,
  publicLocaleAbsoluteUrl,
  publicLocalePath,
  stripDefaultLocalePublicPrefix,
} from "@/i18n/url-helpers";
import { alignUrlToPreferredOrigin, forceApexOrigin } from "@/lib/preferred-host";

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
  slugByLocale?: Record<string, string>,
): Record<string, string> {
  const languages: Record<string, string> = {};
  const defaultLocale = locales.find((l) => l.isDefault);
  const defaultPrefix = defaultLocale?.urlPrefix ?? getFallbackDefaultLocalePrefix();
  const origin = (forceApexOrigin(siteUrl) ?? siteUrl).replace(/\/$/, "");

  for (const locale of locales) {
    const localizedPath = slugByLocale?.[locale.code]
      ? path.replace(/[^/]+$/, slugByLocale[locale.code]!)
      : path;
    const publicPath = publicLocalePath(locale.urlPrefix, localizedPath, defaultPrefix);
    languages[locale.htmlLang] =
      publicPath === "/" ? `${origin}/` : `${origin}${publicPath}`;
  }

  if (defaultLocale) {
    const xDefaultPath = publicLocalePath(defaultPrefix, path, defaultPrefix);
    languages["x-default"] =
      xDefaultPath === "/" ? `${origin}/` : `${origin}${xDefaultPath}`;
  }

  return languages;
}

export function buildCanonicalUrl(
  siteUrl: string,
  localePrefix: string,
  path: string,
  localizedSlug?: string,
  defaultPrefix?: string,
): string {
  const defaultLoc = defaultPrefix ?? getFallbackDefaultLocalePrefix();
  const origin = forceApexOrigin(siteUrl) ?? siteUrl;
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (localizedSlug) {
    const segments = cleanPath.split("/");
    segments[segments.length - 1] = localizedSlug;
    cleanPath = segments.join("/");
  }
  return publicLocaleAbsoluteUrl(origin, localePrefix, cleanPath, defaultLoc);
}

/**
 * Normalize stored canonical URLs that still include the default locale prefix
 * and/or www twin host. Titles/descriptions are untouched; same-site paths are rewritten to apex.
 */
export function normalizeStoredCanonicalUrl(
  canonicalUrl: string | null | undefined,
  siteOrigin: string,
  defaultPrefix: string = getFallbackDefaultLocalePrefix(),
): string | null {
  const trimmed = canonicalUrl?.trim();
  if (!trimmed) return null;

  const origin = (forceApexOrigin(siteOrigin) ?? siteOrigin).replace(/\/$/, "");
  try {
    const absolute = trimmed.startsWith("http")
      ? trimmed
      : `${origin}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
    const aligned = alignUrlToPreferredOrigin(absolute, origin);
    const parsed = new URL(aligned.startsWith("http") ? aligned : `${origin}${aligned}`);
    const siteHost = new URL(`${origin}/`).hostname.replace(/^www\./, "");
    const urlHost = parsed.hostname.replace(/^www\./, "");
    if (urlHost !== siteHost) {
      return trimmed;
    }
    const publicPath = stripDefaultLocalePublicPrefix(parsed.pathname, defaultPrefix);
    return publicPath === "/" ? `${origin}/` : `${origin}${publicPath}`;
  } catch {
    return trimmed;
  }
}
