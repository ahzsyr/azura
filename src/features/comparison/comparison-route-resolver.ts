/**
 * Legacy URL segments → canonical content type slug (backward compatibility).
 * New routes use ContentType.routePrefix from the registry.
 */
const LEGACY_SEGMENT_TO_SLUG: Record<string, string> = {
  products: "products",
  product: "products",
  packages: "catalog-items",
  package: "catalog-items",
  hotels: "listings",
  services: "offerings",
  listings: "listings",
  listing: "listings",
  offerings: "offerings",
  offering: "offerings",
  "catalog-items": "catalog-items",
};

/** @deprecated Use routePrefix from registry; kept for old bookmarks */
export const COMPARE_ROUTE_ALIASES = LEGACY_SEGMENT_TO_SLUG;

export function resolveCompareContentTypeSlug(segment: string): string {
  const normalized = segment.trim().toLowerCase();
  return LEGACY_SEGMENT_TO_SLUG[normalized] ?? normalized;
}

/** Public compare page path — segment is canonical content type slug (legacy aliases work on inbound routes). */
export function comparePagePath(locale: string, contentTypeSlug: string): string {
  const segment = contentTypeSlug.trim() || contentTypeSlug;
  return `/${locale}/compare/${segment}`;
}

/** Compare hub with optional active type tab (query `type` = content type slug). */
export function compareHubPath(locale: string, contentTypeSlug?: string): string {
  const base = `/${locale}/compare`;
  if (!contentTypeSlug?.trim()) return base;
  return `${base}?type=${encodeURIComponent(contentTypeSlug.trim())}`;
}
