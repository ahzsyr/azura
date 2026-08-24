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
 * Locale-agnostic path for a full sitemap URL, or null if it cannot be derived
 * (e.g. absolute URL outside this site / unknown locale prefix).
 */
export function pathFromSitemapUrl(
  url: string,
  siteOrigin: string,
  localePrefixes: string[],
): string | null {
  const origin = siteOrigin.replace(/\/$/, "");
  const normalizedUrl = normalizeAbsoluteSitemapUrl(url);
  if (!normalizedUrl.startsWith(`${origin}/`) && normalizedUrl !== origin) {
    return null;
  }
  const remainder = normalizedUrl.slice(origin.length); // starts with /
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
