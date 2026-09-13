import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import {
  getFallbackDefaultLocalePrefix,
  publicLocalePath,
} from "@/i18n/url-helpers";

/** Public marketing path for a CMS slug (wired routes use clean URLs). */
export function getCmsPagePublicPath(slug: string): string {
  return CMS_WIRED_MARKETING_SLUGS[slug] ?? `/pages/${slug}`;
}

/** Public path for a CMS slug in a locale (home → `/` for default locale). */
export function getCmsPageLocalizedPublicPath(
  localePrefix: string,
  slug: string,
  defaultPrefix: string = getFallbackDefaultLocalePrefix(),
): string {
  const publicPath = getCmsPagePublicPath(slug.replace(/^\/+/, ""));
  return publicLocalePath(localePrefix, publicPath, defaultPrefix);
}

/**
 * Rewrite legacy `/{locale}/pages/{wiredSlug}` (and `/{locale}/home`) to the canonical
 * public path so IndexNow/GSC submissions never ping redirecting URLs.
 */
export function normalizeWiredCmsPathname(
  pathname: string,
  defaultPrefix: string = getFallbackDefaultLocalePrefix(),
): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const pagesMatch = path.match(/^\/([^/]+)\/pages\/([^/]+)\/?$/);
  if (pagesMatch) {
    const locale = pagesMatch[1]!;
    const slug = pagesMatch[2]!;
    if (slug in CMS_WIRED_MARKETING_SLUGS) {
      return getCmsPageLocalizedPublicPath(locale, slug, defaultPrefix);
    }
  }
  const homeMatch = path.match(/^\/([^/]+)\/home\/?$/);
  if (homeMatch && CMS_WIRED_MARKETING_SLUGS.home === "/") {
    return getCmsPageLocalizedPublicPath(homeMatch[1]!, "home", defaultPrefix);
  }
  return path.replace(/\/$/, "") || "/";
}

/** Absolute URL variant of {@link normalizeWiredCmsPathname}. */
export function normalizeWiredCmsAbsoluteUrl(
  url: string,
  defaultPrefix: string = getFallbackDefaultLocalePrefix(),
): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = normalizeWiredCmsPathname(parsed.pathname, defaultPrefix);
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** Redirect target for legacy /pages/[slug] URLs, or null when slug stays under /pages. */
export function getWiredCmsPageRedirect(
  pathname: string,
  locales: string[],
  defaultPrefix: string = getFallbackDefaultLocalePrefix(),
): string | null {
  for (const locale of locales) {
    const prefix = `/${locale}/pages/`;
    if (!pathname.startsWith(prefix)) continue;
    const rest = pathname.slice(prefix.length);
    const slug = rest.split("/")[0];
    if (!slug || rest.includes("/")) continue;
    const wired = CMS_WIRED_MARKETING_SLUGS[slug];
    if (!wired) continue;
    return getCmsPageLocalizedPublicPath(locale, slug, defaultPrefix);
  }
  return null;
}
