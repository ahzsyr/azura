/**
 * Pure sitemap URL classification helpers.
 * Kept free of Next.js/server imports so crawl-surface generators (sitemap,
 * llms.txt drafts) can share the exact same bucketing rules.
 */

export type SitemapType = "page" | "post" | "product" | "category" | "brand" | "video";

const SKIP_INDEXABLE_SEGMENT = /(?:^|\/)(compare|account|favorites|search)(?:\/|$)/i;

export function classifySitemapUrl(url: string): SitemapType {
  try {
    const path = new URL(url).pathname;
    // Exact /videos index stays a page; watch pages under /videos/ go to video sitemap.
    if (/\/videos\/.+/i.test(path)) return "video";
    if (path.includes("/products/")) return "product";
    if (path.includes("/blog/")) return "post";
    if (path.includes("/categories/") || path.includes("/collections/")) return "category";
    if (path.includes("/brands/")) return "brand";
    return "page";
  } catch {
    return "page";
  }
}

/** Public URLs that must never be advertised to crawlers or AI agents. */
export function isSitemapIndexableUrl(url: string): boolean {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    if (!path.startsWith("/")) path = `/${path}`;
  }
  return !SKIP_INDEXABLE_SEGMENT.test(path);
}
