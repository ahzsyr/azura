import type { MetadataRoute } from "next";
import { escapeXml } from "@/lib/xml/escape-xml";
import { createCached, CACHE_TAGS } from "@/services/cache";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { generateSitemap, fallbackStaticSitemapEntries } from "./sitemap.service";
import { resolveSiteOrigin } from "./resolve-site-origin";
import { resolveSitemapOriginSafe } from "./sitemap-origin";
import { canonicalizeSitemapLoc } from "./sitemap-path-utils";

export const SITEMAP_CHUNK_SIZE = 1000;
export const SITEMAP_XSL_HREF = "/sitemap.xsl";
export const SITEMAP_CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

export const SITEMAP_XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "x-robots-tag": "noindex, follow",
  "Cache-Control": SITEMAP_CACHE_CONTROL,
} as const;

export type SitemapType = "page" | "post" | "product" | "category" | "brand" | "video";

export type SitemapUrlEntry = MetadataRoute.Sitemap[number];

export type VideoSitemapEntry = {
  url: string;
  lastModified?: Date | string;
  video: {
    title: string;
    description: string;
    thumbnailLoc: string;
    contentLoc: string;
    /** ISO 8601 duration or seconds string — only when known */
    duration?: string;
    /** ISO upload/publication date — only when known; never invent */
    publicationDate?: string;
  };
};

export type SitemapBuckets = Record<SitemapType, SitemapUrlEntry[]>;

export type SitemapChunk = {
  type: SitemapType;
  page: number;
  entries: SitemapUrlEntry[];
};

const SKIP_INDEXABLE_SEGMENT = /(?:^|\/)(compare|account|favorites|search)(?:\/|$)/i;

export function emptySitemapBuckets(): SitemapBuckets {
  return { page: [], post: [], product: [], category: [], brand: [], video: [] };
}

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

export function isSitemapIndexableUrl(url: string): boolean {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    if (!path.startsWith("/")) path = `/${path}`;
  }
  return !SKIP_INDEXABLE_SEGMENT.test(path);
}

/**
 * Bucket sitemap entries after rewriting locs onto the apex site origin
 * (strips www, http, and default-locale /en prefixes).
 */
export function bucketSitemapEntries(
  entries: SitemapUrlEntry[],
  siteOrigin?: string,
): SitemapBuckets {
  const buckets = emptySitemapBuckets();
  const origin = siteOrigin?.replace(/\/$/, "");
  for (const entry of entries) {
    if (!entry.url || !isSitemapIndexableUrl(entry.url)) continue;
    const loc = origin ? canonicalizeSitemapLoc(entry.url, origin) : entry.url;
    if (!loc || !isSitemapIndexableUrl(loc)) continue;
    buckets[classifySitemapUrl(loc)].push({ ...entry, url: loc });
  }
  return buckets;
}

function staticFallbackBuckets(siteUrl: string): SitemapBuckets {
  const prefixes = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);
  return bucketSitemapEntries(fallbackStaticSitemapEntries(siteUrl, prefixes), siteUrl);
}

/** Ensure index always lists at least page-sitemap.xml when buckets are empty. */
export function ensurePageSitemapBucket(
  siteUrl: string,
  buckets: SitemapBuckets,
): SitemapBuckets {
  if (buckets.page.length > 0) return buckets;
  const fallback = staticFallbackBuckets(siteUrl);
  return { ...buckets, page: fallback.page.length ? fallback.page : buckets.page };
}

async function loadTypedSitemapBuckets(siteUrl: string): Promise<SitemapBuckets> {
  try {
    const entries = await generateSitemap(siteUrl);
    return ensurePageSitemapBucket(siteUrl, bucketSitemapEntries(entries, siteUrl));
  } catch (error) {
    console.error("[sitemap] loadTypedSitemapBuckets failed, using static fallback:", error);
    return staticFallbackBuckets(siteUrl);
  }
}

export async function buildTypedSitemapBuckets(
  siteOrigin?: string,
): Promise<SitemapBuckets> {
  const siteUrl = (
    siteOrigin ?? (await resolveSitemapOriginSafe().catch(() => resolveSiteOrigin("sitemap")))
  ).replace(/\/$/, "");
  try {
    return await createCached(
      () => loadTypedSitemapBuckets(siteUrl),
      ["typed-sitemap-buckets", siteUrl],
      { tags: [CACHE_TAGS.sitemap], revalidate: 3600 },
    )();
  } catch (error) {
    console.error("[sitemap] buildTypedSitemapBuckets cache failed, using static fallback:", error);
    return staticFallbackBuckets(siteUrl);
  }
}

export function chunkEntries(entries: SitemapUrlEntry[]): SitemapUrlEntry[][] {
  const chunks: SitemapUrlEntry[][] = [];
  for (let i = 0; i < entries.length; i += SITEMAP_CHUNK_SIZE) {
    chunks.push(entries.slice(i, i + SITEMAP_CHUNK_SIZE));
  }
  return chunks.length ? chunks : [[]];
}

export function sitemapFileName(type: SitemapType, page: number): string {
  if (page <= 1) return `${type}-sitemap.xml`;
  return `${type}-sitemap${page}.xml`;
}

export function formatSitemapUrlsetXml(entries: SitemapUrlEntry[]): string {
  const body = entries
    .map((entry) => {
      const loc = typeof entry.url === "string" ? entry.url.trim() : "";
      if (!loc) return null;
      try {
        const lines = [`    <loc>${escapeXml(loc)}</loc>`];
        if (entry.lastModified) {
          const date =
            entry.lastModified instanceof Date
              ? entry.lastModified
              : new Date(entry.lastModified);
          if (!Number.isNaN(date.getTime())) {
            lines.push(`    <lastmod>${date.toISOString()}</lastmod>`);
          }
        }
        return `  <url>\n${lines.join("\n")}\n  </url>`;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="${SITEMAP_XSL_HREF}"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** Google video sitemap urlset with xmlns:video and video:video children. */
export function formatVideoSitemapXml(entries: VideoSitemapEntry[]): string {
  const urlNodes = entries
    .map((entry) => {
      const loc = typeof entry.url === "string" ? entry.url.trim() : "";
      if (!loc) return null;
      const v = entry.video;
      if (!v?.title?.trim() || !v?.thumbnailLoc?.trim() || !v?.contentLoc?.trim()) return null;
      try {
        const inner: string[] = [`    <loc>${escapeXml(loc)}</loc>`];
        if (entry.lastModified) {
          const date =
            entry.lastModified instanceof Date
              ? entry.lastModified
              : new Date(entry.lastModified);
          if (!Number.isNaN(date.getTime())) {
            inner.push(`    <lastmod>${date.toISOString()}</lastmod>`);
          }
        }
        inner.push(`    <video:video>`);
        inner.push(
          `      <video:thumbnail_loc>${escapeXml(v.thumbnailLoc.trim())}</video:thumbnail_loc>`,
        );
        inner.push(`      <video:title>${escapeXml(v.title.trim())}</video:title>`);
        inner.push(
          `      <video:description>${escapeXml((v.description || v.title).trim())}</video:description>`,
        );
        inner.push(`      <video:content_loc>${escapeXml(v.contentLoc.trim())}</video:content_loc>`);
        // Google video sitemap duration is seconds; ISO-8601 (PT…) is for VideoObject only.
        if (v.duration?.trim() && /^\d+$/.test(v.duration.trim())) {
          inner.push(`      <video:duration>${escapeXml(v.duration.trim())}</video:duration>`);
        }
        if (v.publicationDate?.trim()) {
          const date = new Date(v.publicationDate);
          if (!Number.isNaN(date.getTime())) {
            inner.push(`      <video:publication_date>${date.toISOString()}</video:publication_date>`);
          }
        }
        inner.push(`    </video:video>`);
        return `  <url>\n${inner.join("\n")}\n  </url>`;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="${SITEMAP_XSL_HREF}"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${urlNodes}\n</urlset>\n`;
}

/** Minimal valid empty urlset for child sitemap failure paths. */
export function emptySitemapUrlsetXml(): string {
  return formatSitemapUrlsetXml([]);
}

/** Minimal valid index that always references page-sitemap.xml. */
export function minimalSitemapIndexXml(siteOrigin: string): string {
  const siteUrl = siteOrigin.replace(/\/$/, "");
  const buckets = ensurePageSitemapBucket(siteUrl, emptySitemapBuckets());
  // ensurePageSitemapBucket fills page from static fallback; if still empty, force one loc
  if (!buckets.page.length) {
    buckets.page = [{ url: `${siteUrl}/`, lastModified: new Date() }];
  }
  return formatSitemapIndexXmlFromBuckets(siteUrl, buckets);
}

export function formatSitemapIndexXmlFromBuckets(
  siteOrigin: string,
  buckets: SitemapBuckets,
  lastmod = new Date().toISOString(),
): string {
  const siteUrl = siteOrigin.replace(/\/$/, "");
  const sitemapNodes: string[] = [];

  for (const type of Object.keys(buckets) as SitemapType[]) {
    const chunks = chunkEntries(buckets[type]);
    chunks.forEach((chunk, index) => {
      if (!chunk.length) return;
      const page = index + 1;
      const loc = `${siteUrl}/${sitemapFileName(type, page)}`;
      sitemapNodes.push(
        `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`,
      );
    });
  }

  const body = sitemapNodes.join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="${SITEMAP_XSL_HREF}"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export async function formatSitemapIndexXml(siteOrigin: string): Promise<string> {
  try {
    const buckets = await buildTypedSitemapBuckets(siteOrigin);
    const xml = formatSitemapIndexXmlFromBuckets(siteOrigin, buckets);
    if (xml.includes("<sitemap>")) return xml;
    return minimalSitemapIndexXml(siteOrigin);
  } catch (error) {
    console.error("[sitemap] formatSitemapIndexXml failed, using minimal index:", error);
    return minimalSitemapIndexXml(siteOrigin);
  }
}

export async function resolveTypedSitemapXml(
  siteOrigin: string,
  type: SitemapType,
  page: number,
): Promise<string> {
  try {
    if (type === "video") {
      const { loadVideoSitemapEntries } = await import("./video-sitemap.loader");
      const all = await loadVideoSitemapEntries(siteOrigin);
      const richChunks: typeof all[] = [];
      for (let i = 0; i < all.length; i += SITEMAP_CHUNK_SIZE) {
        richChunks.push(all.slice(i, i + SITEMAP_CHUNK_SIZE));
      }
      const entries = (richChunks.length ? richChunks : [[]])[page - 1] ?? [];
      return formatVideoSitemapXml(entries);
    }

    const buckets = await buildTypedSitemapBuckets(siteOrigin);
    const chunks = chunkEntries(buckets[type]);
    const entries = chunks[page - 1] ?? [];
    return formatSitemapUrlsetXml(entries);
  } catch (error) {
    console.error("[sitemap] resolveTypedSitemapXml failed, using empty urlset:", error);
    return emptySitemapUrlsetXml();
  }
}

export function parseSitemapRouteName(file: string): { type: SitemapType; page: number } | null {
  const match = file.match(/^(page|post|product|category|brand|video)-sitemap(\d*)\.xml$/);
  if (!match) return null;
  const type = match[1] as SitemapType;
  const page = match[2] ? Number.parseInt(match[2], 10) : 1;
  if (!Number.isFinite(page) || page < 1) return null;
  return { type, page };
}
