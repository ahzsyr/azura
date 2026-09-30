import "server-only";

import { generateSitemap } from "@/features/seo/sitemap.service";
import { loadSitemapSnapshot, saveSitemapSnapshot } from "./persistence";

export type SitemapRebuildResult = {
  rebuilt: true;
  live: true;
  urlCount: number;
  urls: string[];
  added: string[];
  removed: string[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  generatedAt: string;
  previewHref: string;
  previousCount: number | null;
};

export async function rebuildSitemapWithDiff(siteOrigin?: string): Promise<SitemapRebuildResult> {
  const entries = await generateSitemap(siteOrigin);
  const urls = entries
    .map((entry) => entry.url)
    .filter((url): url is string => typeof url === "string" && url.length > 0)
    .sort();
  const previous = await loadSitemapSnapshot();
  const previousSet = new Set(previous?.urls ?? []);
  const currentSet = new Set(urls);

  const added = urls.filter((url) => !previousSet.has(url));
  const removed = (previous?.urls ?? []).filter((url) => !currentSet.has(url));
  const unchangedCount = urls.filter((url) => previousSet.has(url)).length;
  const generatedAt = new Date().toISOString();

  await saveSitemapSnapshot({ urls, count: urls.length, generatedAt });

  return {
    rebuilt: true,
    live: true,
    urlCount: urls.length,
    urls: urls.slice(0, 500),
    added: added.slice(0, 100),
    removed: removed.slice(0, 100),
    addedCount: added.length,
    removedCount: removed.length,
    unchangedCount,
    generatedAt,
    previewHref: "/admin/seo/sitemap",
    previousCount: previous?.count ?? null,
  };
}
