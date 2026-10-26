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
 * Replace the final path segment with a localized slug.
 * Home ("", "/") is never rewritten — a localized slug must not invent a home path.
 */
export function applyLocalizedSlug(path: string, localizedSlug?: string | null): string {
  const slug = localizedSlug?.trim();
  if (!slug) return path;
  const withLeading = path.startsWith("/") ? path : path ? `/${path}` : "";
  if (!withLeading || withLeading === "/") return path;
  const lastSlash = withLeading.lastIndexOf("/");
  return `${withLeading.slice(0, lastSlash + 1)}${slug}`;
}

function pickSlugForLocale(
  slugByLocale: Record<string, string> | undefined,
  locale: { code: string; urlPrefix: string },
): string | undefined {
  return slugByLocale?.[locale.code] ?? slugByLocale?.[locale.urlPrefix];
}

/**
 * Build hreflang alternates for all enabled locales.
 * x-default mirrors the default locale's localized slug (not the neutral path).
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
    const localizedPath = applyLocalizedSlug(path, pickSlugForLocale(slugByLocale, locale));
    const publicPath = publicLocalePath(locale.urlPrefix, localizedPath, defaultPrefix);
    languages[locale.htmlLang] =
      publicPath === "/" ? `${origin}/` : `${origin}${publicPath}`;
  }

  if (defaultLocale) {
    const xDefaultPath = publicLocalePath(
      defaultPrefix,
      applyLocalizedSlug(path, pickSlugForLocale(slugByLocale, defaultLocale)),
      defaultPrefix,
    );
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
  const cleanPath = applyLocalizedSlug(path, localizedSlug);
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
