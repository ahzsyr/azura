import {
  alignUrlToPreferredOrigin,
  forceApexOrigin,
  violatesSeoApexUrlInvariants,
} from "@/lib/preferred-host";
import { getFallbackDefaultLocalePrefix } from "@/i18n/url-helpers";

/** Normalize a locale-agnostic path for exclude matching (`/` and empty → home). */
export function normalizeSitemapPath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function isAbsoluteSitemapUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function normalizeAbsoluteSitemapUrl(value: string): string {
  return value.replace(/\/$/, "") || value;
}

/**
 * Rewrite a sitemap loc onto the apex preferred origin and strip default-locale `/en` prefixes.
 * Returns null when the URL is not on this site or fails apex invariants after normalization.
 */
export function canonicalizeSitemapLoc(
  url: string,
  siteOrigin: string,
  defaultPrefix: string = getFallbackDefaultLocalePrefix(),
): string | null {
  const origin = (forceApexOrigin(siteOrigin) ?? siteOrigin).replace(/\/$/, "");
  try {
    const absolute = url.startsWith("http")
      ? url
      : `${origin}${url.startsWith("/") ? url : `/${url}`}`;
    const aligned = alignUrlToPreferredOrigin(absolute, origin);
    const parsed = new URL(aligned);
    const siteHost = new URL(`${origin}/`).hostname.replace(/^www\./, "");
    if (parsed.hostname.replace(/^www\./, "") !== siteHost) return null;

    let pathname = parsed.pathname;
    const prefix = `/${defaultPrefix}`;
    if (pathname === prefix) pathname = "/";
    else if (pathname.startsWith(`${prefix}/`)) pathname = pathname.slice(prefix.length);

    const loc = pathname === "/" ? `${origin}/` : `${origin}${pathname}`;
    if (violatesSeoApexUrlInvariants(loc, { defaultLocalePrefix: defaultPrefix })) {
      return null;
    }
    return loc;
  } catch {
    return null;
  }
}

/**
 * Locale-agnostic path for a full sitemap URL, or null if it cannot be derived
 * (e.g. absolute URL outside this site / unknown locale prefix).
 */
export function pathFromSitemapUrl(
  url: string,
  siteOrigin: string,
  localePrefixes: string[],
): string | null {
  const origin = (forceApexOrigin(siteOrigin) ?? siteOrigin).replace(/\/$/, "");
  const canonical = canonicalizeSitemapLoc(url, origin) ?? normalizeAbsoluteSitemapUrl(url);
  if (!canonical.startsWith(`${origin}/`) && canonical !== origin) {
    return null;
  }
  const remainder = canonical.slice(origin.length); // starts with /
  const withoutSlash = remainder.replace(/^\//, "");
  const firstSeg = withoutSlash.split("/")[0] ?? "";
  if (localePrefixes.includes(firstSeg)) {
    const rest = withoutSlash.slice(firstSeg.length);
    return normalizeSitemapPath(rest || "/");
  }
  return normalizeSitemapPath(remainder || "/");
}

export function formatPathForDisplay(path: string): string {
  return path === "" ? "/" : path;
}
