import { getBuiltinContentType } from "@/features/content/content-type.registry";

/** Client-safe public and admin paths for content types and collections. */

export function slugifyContentTypeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function cleanPublicSegment(value: string | null | undefined) {
  return value?.trim().replace(/^\/+|\/+$/g, "") ?? "";
}

/**
 * Prefixes that were copied onto the wrong built-in type.
 * They must not replace that type's canonical public route.
 */
const STALE_BUILTIN_PREFIXES = new Set(["hotels-transport"]);

/**
 * Public URL segment for a content type.
 * An explicit route prefix wins. Clearing it publishes at the type slug
 * (built-in types with no prefix keep their canonical route, e.g. offerings → services).
 */
export function contentPublicSegment(
  routePrefix: string | null | undefined,
  typeSlug?: string | null,
): string | null {
  const explicit = cleanPublicSegment(routePrefix);
  const slug = cleanPublicSegment(typeSlug);
  const builtin = slug ? cleanPublicSegment(getBuiltinContentType(slug)?.routePrefix) : "";
  const stale =
    Boolean(explicit && builtin && explicit !== builtin && STALE_BUILTIN_PREFIXES.has(explicit));

  if (explicit && !stale) return explicit;
  if (builtin) return builtin;
  return slug || null;
}

/** Prefer a type that owns the segment as its route prefix, then one whose slug is the segment. */
export function selectContentTypeForPublicSegment<
  T extends { slug: string; routePrefix: string | null },
>(segment: string, types: T[]): T | undefined {
  const normalized = cleanPublicSegment(segment);
  if (!normalized) return undefined;
  const byPrefix = types.find((type) => cleanPublicSegment(type.routePrefix) === normalized);
  if (byPrefix) return byPrefix;
  return types.find((type) => type.slug === normalized);
}

export function contentTypePublicPath(
  routePrefix: string | null | undefined,
  typeSlug?: string | null,
): string | null {
  const segment = contentPublicSegment(routePrefix, typeSlug);
  return segment ? `/${segment}` : null;
}

export function contentItemPublicPath(
  routePrefix: string | null | undefined,
  typeSlug: string | null | undefined,
  itemSlug: string | null | undefined,
): string | null {
  const listPath = contentTypePublicPath(routePrefix, typeSlug);
  if (!listPath) return null;
  const slug = itemSlug?.trim();
  return slug ? `${listPath}/${slug}` : listPath;
}

export function contentCollectionPublicPath(
  routePrefix: string | null | undefined,
  collectionSlug: string,
  typeSlug?: string | null,
): string | null {
  const listPath = contentTypePublicPath(routePrefix, typeSlug);
  if (!listPath) return null;
  return `${listPath}?collection=${encodeURIComponent(collectionSlug)}`;
}

export function contentTypeItemsHref(typeSlug: string, collectionSlug?: string | null): string {
  const base = `/admin/content/${typeSlug}`;
  if (!collectionSlug) return base;
  return `${base}?collection=${encodeURIComponent(collectionSlug)}`;
}

export function contentTypeSettingsHref(typeId: string): string {
  return `/admin/content/types/${typeId}`;
}

export function contentTypeNewItemHref(typeSlug: string): string {
  return `/admin/content/${typeSlug}/new`;
}
