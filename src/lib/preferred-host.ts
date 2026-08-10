/**
 * Preferred public host helpers (www vs apex consolidation).
 * Edge-safe — no Node/DB imports (usable from middleware / next.config).
 */

export type PreferredHostRedirect = {
  fromHost: string;
  toOrigin: string;
};

/** Parse a configured site URL into origin + hostname, or null if invalid/local. */
export function parsePreferredSiteUrl(raw: string | undefined | null): {
  origin: string;
  hostname: string;
} | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized.replace(/\/$/, "") || normalized);
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    ) {
      return null;
    }
    return { origin: url.origin, hostname };
  } catch {
    return null;
  }
}

/**
 * If `requestHost` is the www/apex alternate of the preferred host, return a
 * permanent redirect target origin. Otherwise null (no host redirect needed).
 */
export function resolveWwwApexRedirect(
  preferredSiteUrl: string | undefined | null,
  requestHost: string | undefined | null,
): PreferredHostRedirect | null {
  const preferred = parsePreferredSiteUrl(preferredSiteUrl);
  if (!preferred) return null;

  const host = (requestHost ?? "").split(":")[0]?.trim().toLowerCase();
  if (!host || host === preferred.hostname) return null;

  const preferredIsWww = preferred.hostname.startsWith("www.");
  const apex = preferredIsWww ? preferred.hostname.slice(4) : preferred.hostname;
  const wwwHost = preferredIsWww ? preferred.hostname : `www.${preferred.hostname}`;
  const alternateHost = preferredIsWww ? apex : wwwHost;

  if (host !== alternateHost) return null;
  return { fromHost: host, toOrigin: preferred.origin };
}

/** Absolute redirect URL preserving path + query on the preferred origin. */
export function buildPreferredHostRedirectUrl(
  toOrigin: string,
  pathname: string,
  search: string,
): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${toOrigin.replace(/\/$/, "")}${path}${search}`;
}
