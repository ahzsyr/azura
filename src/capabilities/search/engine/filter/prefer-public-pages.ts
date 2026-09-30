import { isPackagesContentTypeSlug } from "@/capabilities/search/settings/search-sources";
import { normalizeSearchPublicPath } from "@/capabilities/search/lib/search-public-path";

export type PreferPublicHit = {
  entityType: string;
  urlPath: string;
  title?: string;
  contentTypeSlug?: string;
  metadata?: unknown;
};

export function normalizeSearchHitTitle(title?: string | null): string {
  return (title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function contentTypeSlugFromHit(hit: PreferPublicHit): string | undefined {
  if (typeof hit.contentTypeSlug === "string" && hit.contentTypeSlug.trim()) {
    return hit.contentTypeSlug.trim();
  }
  const meta = (hit.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.contentTypeSlug === "string" && meta.contentTypeSlug.trim()) {
    return meta.contentTypeSlug.trim();
  }
  const facets = meta.facets;
  if (facets && typeof facets === "object" && !Array.isArray(facets)) {
    const fromFacets = (facets as Record<string, unknown>).contentTypeSlug;
    if (typeof fromFacets === "string" && fromFacets.trim()) return fromFacets.trim();
  }
  return undefined;
}

/**
 * When a CMS page and a catalog/content item share the same public URL, keep the page.
 * When packages (catalog-items) share a path or title with another content type (e.g. offerings),
 * keep the non-packages hit for public results.
 * Exact-title CMS/content hits are promoted above products so phrase searches surface the page.
 */
export function preferPublicPagesOverCatalogItems<T extends PreferPublicHit>(
  hits: T[],
  includeAdmin?: boolean,
  phraseQuery?: string
): T[] {
  if (includeAdmin || hits.length < 2) return hits;

  const pagePaths = new Set(
    hits
      .filter((hit) => hit.entityType === "CMS_PAGE")
      .map((hit) => normalizeSearchPublicPath(hit.urlPath))
  );

  const preferredContentKeys = new Set<string>();
  for (const hit of hits) {
    if (hit.entityType !== "CONTENT_ITEM") continue;
    const slug = contentTypeSlugFromHit(hit);
    if (!slug || isPackagesContentTypeSlug(slug)) continue;
    preferredContentKeys.add(`path:${normalizeSearchPublicPath(hit.urlPath)}`);
    const titleKey = normalizeSearchHitTitle(hit.title);
    if (titleKey) preferredContentKeys.add(`title:${titleKey}`);
  }

  const filtered = hits.filter((hit) => {
    if (hit.entityType === "CONTENT_ITEM") {
      const path = normalizeSearchPublicPath(hit.urlPath);
      if (pagePaths.has(path)) return false;

      const slug = contentTypeSlugFromHit(hit);
      if (slug && isPackagesContentTypeSlug(slug)) {
        const titleKey = normalizeSearchHitTitle(hit.title);
        if (
          preferredContentKeys.has(`path:${path}`) ||
          (titleKey && preferredContentKeys.has(`title:${titleKey}`))
        ) {
          return false;
        }
      }
    }
    return true;
  });

  const queryTitle = normalizeSearchHitTitle(phraseQuery);
  if (!queryTitle || filtered.length < 2) return filtered;

  const exactPublic: T[] = [];
  const rest: T[] = [];
  for (const hit of filtered) {
    const isPublicContent =
      hit.entityType === "CMS_PAGE" ||
      hit.entityType === "CONTENT_ITEM" ||
      hit.entityType === "CONTENT_TYPE" ||
      hit.entityType === "CONTENT_COLLECTION";
    if (isPublicContent && normalizeSearchHitTitle(hit.title) === queryTitle) {
      exactPublic.push(hit);
    } else {
      rest.push(hit);
    }
  }
  if (exactPublic.length === 0) return filtered;
  return [...exactPublic, ...rest];
}
