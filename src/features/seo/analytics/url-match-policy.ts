import { wwwApexTwinOrigins } from "@/features/seo/integrations/indexnow-payload";
import { forceApexOrigin } from "@/lib/preferred-host";

/**
 * Normalize absolute URLs for GSC ↔ target joins using the site's URL policy:
 * host aliases (www/apex), trailing slashes, lowercase host.
 */
export function normalizeUrlForSiteMatch(rawUrl: string, preferredOrigin: string): string | null {
  const preferred = (forceApexOrigin(preferredOrigin) ?? preferredOrigin).replace(/\/$/, "");
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    try {
      parsed = new URL(rawUrl, preferred);
    } catch {
      return null;
    }
  }

  const twins = wwwApexTwinOrigins(preferred);
  const pageOrigin = `${parsed.protocol}//${parsed.hostname}`.replace(/\/$/, "");
  if (twins.length && !twins.includes(pageOrigin) && pageOrigin !== preferred) {
    // Host not in site twin set — out of property for this siteKey
    return null;
  }

  const apexPreferred = preferred;
  let pathname = parsed.pathname || "/";
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
  // Drop common tracking query params from match key; keep path-only identity
  return `${apexPreferred}${pathname === "" ? "/" : pathname}`.toLowerCase();
}

export function urlsMatchUnderSitePolicy(
  a: string,
  b: string,
  preferredOrigin: string,
): boolean {
  const na = normalizeUrlForSiteMatch(a, preferredOrigin);
  const nb = normalizeUrlForSiteMatch(b, preferredOrigin);
  return Boolean(na && nb && na === nb);
}
