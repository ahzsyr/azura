import {
  contentCollectionPublicPath,
  contentItemPublicPath,
  contentTypePublicPath,
} from "@/features/content/content-admin-paths";
import { BUILTIN_CONTENT_TYPES } from "@/features/content/content-type.registry";

/** Locale-prefixed public path, falling back to `/{locale}/{segment}`. */
export function localizedPublicPath(localePrefix: string, path: string | null, fallbackSegment = "content"): string {
  const cleaned = path?.trim() || `/${fallbackSegment}`;
  const withSlash = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return `/${localePrefix}${withSlash === "/" ? "" : withSlash}`;
}

export function contentItemSearchPath(
  localePrefix: string,
  routePrefix: string | null | undefined,
  typeSlug: string | null | undefined,
  itemSlug: string | null | undefined
): string {
  return localizedPublicPath(
    localePrefix,
    contentItemPublicPath(routePrefix, typeSlug, itemSlug),
    typeSlug ?? "content"
  );
}

export function contentTypeSearchPath(
  localePrefix: string,
  routePrefix: string | null | undefined,
  typeSlug: string | null | undefined
): string {
  return localizedPublicPath(
    localePrefix,
    contentTypePublicPath(routePrefix, typeSlug),
    typeSlug ?? "content"
  );
}

export function contentCollectionSearchPath(
  localePrefix: string,
  routePrefix: string | null | undefined,
  collectionSlug: string,
  typeSlug: string | null | undefined
): string {
  return localizedPublicPath(
    localePrefix,
    contentCollectionPublicPath(routePrefix, collectionSlug, typeSlug),
    typeSlug ?? "content"
  );
}

/** Strip a leading locale prefix so `/en/services/x` and `/services/x` compare equal. */
export function normalizeSearchPublicPath(urlPath: string): string {
  const path = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  const stripped = path.replace(/^\/[a-z]{2}(?:-[a-zA-Z]+)?(?=\/|$)/, "");
  return (stripped || "/").replace(/\/+$/, "") || "/";
}

export function isAdminSearchUrlPath(urlPath?: string): boolean {
  if (!urlPath) return false;
  const path = normalizeSearchPublicPath(urlPath);
  return path === "/admin" || path.startsWith("/admin/");
}

/** Platform routes that are not content-type public prefixes. */
const NON_CONTENT_TYPE_PATH_SEGMENTS = new Set([
  "admin",
  "search",
  "account",
  "cart",
  "checkout",
  "favorites",
  "compare",
  "blog",
  "faq",
  "faqs",
  "testimonials",
  "gallery",
  "about",
  "contact",
  "products",
  "categories",
  "collections",
  "pages",
  "api",
]);

const ROUTE_PREFIX_TO_TYPE_SLUG = new Map(
  BUILTIN_CONTENT_TYPES.map((def) => [def.routePrefix, def.slug] as const)
);

/**
 * Infer a content type slug from a public URL path segment.
 * `/en/solutions/indoor-coverage` → `solutions`; `/en/services/x` → `offerings`.
 */
export function inferContentTypeSlugFromPublicPath(urlPath?: string | null): string | undefined {
  if (!urlPath?.trim()) return undefined;
  const path = normalizeSearchPublicPath(urlPath);
  const segment = path.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!segment || NON_CONTENT_TYPE_PATH_SEGMENTS.has(segment)) return undefined;
  return ROUTE_PREFIX_TO_TYPE_SLUG.get(segment) ?? segment;
}

/**
 * Resolve content type slug for filtering, mapping, and facet counts.
 * Prefer indexed metadata, then facets, then public URL inference for content entities.
 */
export function resolveSearchContentTypeSlug(input: {
  entityType?: string | null;
  metadata?: unknown;
  urlPath?: string | null;
  contentTypeSlug?: string | null;
}): string | undefined {
  if (typeof input.contentTypeSlug === "string" && input.contentTypeSlug.trim()) {
    return input.contentTypeSlug.trim();
  }
  const meta = (input.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.contentTypeSlug === "string" && meta.contentTypeSlug.trim()) {
    return meta.contentTypeSlug.trim();
  }
  const facets = meta.facets;
  if (facets && typeof facets === "object" && !Array.isArray(facets)) {
    const fromFacets = (facets as Record<string, unknown>).contentTypeSlug;
    if (typeof fromFacets === "string" && fromFacets.trim()) return fromFacets.trim();
  }
  const entityType = input.entityType ?? "";
  if (
    entityType === "CONTENT_ITEM" ||
    entityType === "CONTENT_TYPE" ||
    entityType === "CONTENT_COLLECTION" ||
    !entityType
  ) {
    return inferContentTypeSlugFromPublicPath(input.urlPath);
  }
  return undefined;
}
