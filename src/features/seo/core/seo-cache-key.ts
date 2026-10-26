import { createHash } from "node:crypto";
import type { SeoDocumentResolveInput } from "./seo-document";

/**
 * Stable cache key for a resolved SEO document.
 *
 * Identity inputs must all participate: two posts/pages that share a locale and
 * path but differ by entity id must never share a cached document. URL inputs
 * keep a readable key so path-based invalidation (`url:/about`) still works.
 */
export function buildSeoDocumentCacheKey(input: SeoDocumentResolveInput): string {
  if ("url" in input) {
    return `url:${input.url.trim()}`;
  }

  const identity = {
    locale: input.locale,
    path: input.path ?? "",
    pageKey: input.pageKey ?? "",
    cmsPageId: input.cmsPageId ?? "",
    postId: input.postId ?? "",
    packageId: input.packageId ?? "",
    contentItemId: input.contentItemId ?? "",
    entityType: input.entityType ?? "",
    entityId: input.entityId ?? "",
    slug: input.slug ?? "",
    status: input.status ?? 200,
    ogImage: input.ogImage ?? "",
    slugByLocale: input.slugByLocale ?? null,
    fallbackTitle: input.fallback?.title ?? "",
    fallbackDescription: input.fallback?.description ?? "",
  };
  const hash = createHash("sha1").update(JSON.stringify(identity)).digest("hex").slice(0, 20);
  return `identity:${input.locale}:${hash}`;
}
