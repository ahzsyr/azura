/**
 * Preferred public host helpers (www vs apex consolidation).
 * Edge-safe — no Node/DB imports (usable from middleware / next.config).
 *
 * Production SEO policy for this site: apex (non-www) is canonical.
 * Prefer NEXT_PUBLIC_SITE_URL=https://brt-me.com and force apex when aligning SEO URLs.
 */

export type PreferredHostRedirect = {
  fromHost: string;
  toOrigin: string;
};

function registrableHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

/** Strip www. from a public origin (https preferred). Leaves localhost unchanged. */
export function forceApexOrigin(raw: string | undefined | null): string | null {
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
      return url.origin;
    }
    const apexHost = registrableHost(hostname);
    const protocol =
      hostname === "localhost" || hostname.endsWith(".local") ? url.protocol : "https:";
    return `${protocol}//${apexHost}`;
  } catch {
    return null;
  }
}

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
 * Parse preferred site URL and force apex (non-www) form for SEO emission.
 * Returns null for invalid/local hosts.
 */
export function parsePreferredApexSiteUrl(raw: string | undefined | null): {
  origin: string;
  hostname: string;
} | null {
  const apex = forceApexOrigin(raw);
  if (!apex) return null;
  try {
    const hostname = new URL(apex).hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    ) {
      return null;
    }
    return { origin: apex, hostname };
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

/**
 * Rewrite a URL onto the apex form of `preferredOrigin` when it is only a www/apex
 * (or http/https) twin. Leaves unrelated hosts unchanged.
 * SEO policy: preferred origin is always forced to apex (non-www) + https.
 */
export function alignUrlToPreferredOrigin(url: string, preferredOrigin: string | undefined | null): string {
  const preferred = parsePreferredApexSiteUrl(preferredOrigin);
  if (!preferred) {
    // No preferred origin: still normalize this URL's own www/http twin to apex https
    try {
      const parsed = new URL(url);
      const apex = forceApexOrigin(parsed.origin);
      if (!apex) return url;
      if (registrableHost(parsed.hostname) !== registrableHost(new URL(apex).hostname)) {
        return url;
      }
      parsed.protocol = new URL(apex).protocol;
      parsed.host = new URL(apex).host;
      return parsed.toString().replace(/\/$/, "");
    } catch {
      return url;
    }
  }
  try {
    const parsed = new URL(url);
    if (registrableHost(parsed.hostname) !== registrableHost(preferred.hostname)) {
      return url;
    }
    parsed.protocol = new URL(preferred.origin).protocol;
    parsed.host = new URL(preferred.origin).host;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/**
 * Assert-friendly: does this absolute URL violate SEO apex invariants?
 * Returns true when the URL looks like a public SEO emission that should be apex HTTPS without /en.
 */
export function violatesSeoApexUrlInvariants(
  url: string,
  options?: { defaultLocalePrefix?: string },
): string | null {
  const defaultPrefix = options?.defaultLocalePrefix ?? "en";
  if (/^http:\/\//i.test(url)) return "http_scheme";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase().startsWith("www.")) return "www_host";
    const prefix = `/${defaultPrefix}`;
    if (parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`)) {
      return "default_locale_prefix";
    }
  } catch {
    return "invalid_url";
  }
  return null;
}
