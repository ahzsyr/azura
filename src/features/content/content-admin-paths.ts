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

/** Public URL segment: configured route prefix, otherwise the type slug. */
export function contentPublicSegment(
  routePrefix: string | null | undefined,
  typeSlug?: string | null,
): string | null {
  const prefix = routePrefix?.trim() || typeSlug?.trim() || "";
  return prefix || null;
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
