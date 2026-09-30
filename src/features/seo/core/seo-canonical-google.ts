const TRACKING_PARAMS = new Set([
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "mc_eid",
  "_ga",
  "_gl",
]);

const PAGINATION_PARAMS = new Set(["page", "p"]);

/** Public listing indexes that may use ?page= / ?p= without duplicating the first page. */
export const PAGINATED_LISTING_ROOTS = new Set([
  "blog",
  "products",
  "categories",
  "collections",
  "tags",
  "brands",
  "packages",
  "gallery",
  "faqs",
]);

export type CanonicalGoogleOptions = {
  /** Extra query keys to keep (in addition to listing pagination rules). */
  allowlist?: string[];
  localePrefixes?: string[];
};

function isTrackingParam(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.startsWith("utm_")) return true;
  return TRACKING_PARAMS.has(lower);
}

export function isPaginatedListingPath(
  pathname: string,
  localePrefixes: string[] = ["en", "ar"],
): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  const prefixes = new Set(localePrefixes.map((p) => p.toLowerCase()));
  const rest = prefixes.has(segments[0]!.toLowerCase()) ? segments.slice(1) : segments;
  return rest.length === 1 && PAGINATED_LISTING_ROOTS.has(rest[0]!.toLowerCase());
}

function shouldKeepParam(key: string, listing: boolean, allowlist: Set<string>): boolean {
  const lower = key.toLowerCase();
  if (isTrackingParam(lower)) return false;
  if (allowlist.has(lower)) return true;
  if (listing && PAGINATION_PARAMS.has(lower)) return true;
  return false;
}

/**
 * Absolute canonical URL for Google: no tracking params, hash stripped,
 * pagination kept only on listing indexes (or explicit allowlist).
 */
export function normalizeCanonicalForGoogle(
  url: string,
  options: CanonicalGoogleOptions = {},
): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const localePrefixes = options.localePrefixes?.length ? options.localePrefixes : ["en", "ar"];
  const listing = isPaginatedListingPath(parsed.pathname, localePrefixes);
  const allowlist = new Set((options.allowlist ?? []).map((k) => k.toLowerCase()));

  const kept = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    if (shouldKeepParam(key, listing, allowlist)) {
      kept.append(key, value);
    }
  }

  const host = parsed.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (parsed.protocol === "http:" && !isLocal) {
    parsed.protocol = "https:";
  }

  parsed.search = kept.toString() ? `?${kept.toString()}` : "";
  parsed.hash = "";

  return parsed.toString();
}
