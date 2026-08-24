import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";

/** Public marketing path for a CMS slug (wired routes use clean URLs). */
export function getCmsPagePublicPath(slug: string): string {
  return CMS_WIRED_MARKETING_SLUGS[slug] ?? `/pages/${slug}`;
}

/** Locale-prefixed canonical public path for a CMS slug (home → `/{locale}`). */
export function getCmsPageLocalizedPublicPath(localePrefix: string, slug: string): string {
  const publicPath = getCmsPagePublicPath(slug.replace(/^\/+/, ""));
  if (!publicPath || publicPath === "/") return `/${localePrefix}`;
  return `/${localePrefix}${publicPath}`;
}

/**
 * Rewrite legacy `/{locale}/pages/{wiredSlug}` (and `/{locale}/home`) to the canonical
 * public path so IndexNow/GSC submissions never ping redirecting URLs.
 */
export function normalizeWiredCmsPathname(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const pagesMatch = path.match(/^\/([^/]+)\/pages\/([^/]+)\/?$/);
  if (pagesMatch) {
    const locale = pagesMatch[1]!;
    const slug = pagesMatch[2]!;
    if (slug in CMS_WIRED_MARKETING_SLUGS) {
      return getCmsPageLocalizedPublicPath(locale, slug);
    }
  }
  const homeMatch = path.match(/^\/([^/]+)\/home\/?$/);
  if (homeMatch && CMS_WIRED_MARKETING_SLUGS.home === "/") {
    return `/${homeMatch[1]}`;
  }
  return path.replace(/\/$/, "") || "/";
}

/** Absolute URL variant of {@link normalizeWiredCmsPathname}. */
export function normalizeWiredCmsAbsoluteUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = normalizeWiredCmsPathname(parsed.pathname);
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** Redirect target for legacy /pages/[slug] URLs, or null when slug stays under /pages. */
export function getWiredCmsPageRedirect(pathname: string, locales: string[]): string | null {
  for (const locale of locales) {
    const prefix = `/${locale}/pages/`;
    if (!pathname.startsWith(prefix)) continue;
    const rest = pathname.slice(prefix.length);
    const slug = rest.split("/")[0];
    if (!slug || rest.includes("/")) continue;
    const wired = CMS_WIRED_MARKETING_SLUGS[slug];
    if (!wired) continue;
    return wired === "/" ? `/${locale}` : `/${locale}${wired}`;
  }
  return null;
}
