/**
 * Legacy URL segments → canonical content type slug (backward compatibility).
 * New routes use ContentType.routePrefix from the registry.
 */
const LEGACY_SEGMENT_TO_SLUG: Record<string, string> = {
  products: "products",
  product: "products",
  packages: "catalog-items",
  package: "catalog-items",
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

export function comparePagePath(locale: string, routePrefix: string): string {
  const segment = routePrefix.trim() || routePrefix;
  return `/${locale}/compare/${segment}`;
}
