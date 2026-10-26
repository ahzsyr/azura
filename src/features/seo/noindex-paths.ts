import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import {
  getStaticSeoPage,
  isStaticSeoPageKey,
} from "@/features/seo/constants";
import { normalizeSitemapPath } from "@/features/seo/sitemap-path-utils";

export type NoIndexSeoMetaRow = {
  pageKey: string | null;
  entityType: string | null;
  entityId: string | null;
  robots?: string | null;
  cmsPage?: { slug: string | null } | null;
  post?: { slug: string | null } | null;
};

export type NoIndexContentItemRow = {
  id: string;
  slug: string | null;
  contentType: { routePrefix: string | null; slug: string };
};

/** Public path for an entity-scoped pageKey (`product:slug`, `brand:slug`, …). */
export function publicPathFromEntityPageKey(pageKey: string): string | null {
  const [prefix, ...rest] = pageKey.split(":");
  const slug = rest.join(":").trim();
  if (!prefix || !slug) return null;
  switch (prefix) {
    case "product":
      return `/products/${slug}`;
    case "brand":
      return `/brands/${slug}`;
    case "category":
    case "collection":
      return `/categories/${slug}`;
    case "tag":
      return `/tags/${slug}`;
    case "service":
      return `/services/${slug}`;
    default:
      return null;
  }
}

/** Public path for a ContentItem using the same prefix rules as the sitemap. */
export function publicPathFromContentItem(item: NoIndexContentItemRow): string | null {
  const slug = item.slug?.trim();
  const prefix = item.contentType.routePrefix?.trim() || item.contentType.slug?.trim();
  if (!slug || !prefix) return null;
  return `/${prefix}/${slug}`;
}

/**
 * Map noindex SeoMeta rows to locale-neutral public paths.
 *
 * This is the single source of truth used by sitemap exclusion and llms.txt
 * draft filtering. It must cover every page-key shape the platform writes:
 * static marketing keys, `product:`, `brand:`, `category:`, `tag:`, CMS pages,
 * posts, and content items.
 */
export function resolveNoIndexPaths(
  metas: NoIndexSeoMetaRow[],
  contentItems: NoIndexContentItemRow[] = [],
): Set<string> {
  const itemById = new Map(contentItems.map((item) => [item.id, item]));
  const paths = new Set<string>();

  const add = (path: string | null | undefined) => {
    if (path == null) return;
    paths.add(normalizeSitemapPath(path));
  };

  for (const meta of metas) {
    if (!/noindex/i.test(meta.robots ?? "")) continue;

    const pageKey = meta.pageKey?.trim();
    if (pageKey) {
      if (isStaticSeoPageKey(pageKey)) {
        add(getStaticSeoPage(pageKey)?.path ?? "");
      } else {
        add(publicPathFromEntityPageKey(pageKey));
      }
    }

    if (meta.cmsPage?.slug) add(getCmsPagePublicPath(meta.cmsPage.slug));
    if (meta.post?.slug) add(`/blog/${meta.post.slug}`);

    if (meta.entityType === "CONTENT_ITEM" && meta.entityId) {
      const item = itemById.get(meta.entityId);
      if (item) add(publicPathFromContentItem(item));
    }
  }

  return paths;
}
