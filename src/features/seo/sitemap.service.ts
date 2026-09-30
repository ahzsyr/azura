import type { MetadataRoute } from "next";
import { isBuildWithoutDb } from "@/lib/build-db";
import { prisma } from "@/lib/prisma";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { localeService } from "@/features/i18n/locale.service";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { productsDataService } from "@/features/products/products-data.service";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import { loadBrandAndTagEntries } from "@/features/catalog/brand-tag-pages.service";
import { STATIC_SEO_PAGES } from "./constants";
import { seoRepository } from "@/repositories/seo.repository";
import { listPageSeoContexts } from "./resolve-page-seo-context";
import type { SeoSitemapConfig } from "./types";
import {
  isAbsoluteSitemapUrl,
  normalizeAbsoluteSitemapUrl,
  normalizeSitemapPath,
  pathFromSitemapUrl,
} from "./sitemap-path-utils";
import { escapeXml } from "@/lib/xml/escape-xml";
import { publicLocaleAbsoluteUrl } from "@/i18n/url-helpers";
import { isVideoPublishReady } from "@/features/videos/video-validation";

export { normalizeSitemapPath, pathFromSitemapUrl } from "./sitemap-path-utils";
export { escapeXml } from "@/lib/xml/escape-xml";

const FALLBACK_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);

function sitemapPublicUrl(
  siteUrl: string,
  localePrefix: string,
  path: string,
  defaultPrefix: string,
): string {
  const normalized = !path || path === "/" ? "/" : path.startsWith("/") ? path : `/${path}`;
  return publicLocaleAbsoluteUrl(siteUrl, localePrefix, normalized, defaultPrefix);
}

const STATIC_PATH_SET = new Set(STATIC_SEO_PAGES.map((page) => normalizeSitemapPath(page.path)));

function normalizeExtraPath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (isAbsoluteSitemapUrl(trimmed)) return normalizeAbsoluteSitemapUrl(trimmed);
  return normalizeSitemapPath(trimmed);
}

function fallbackStaticSitemap(siteUrl: string, localePrefixes: string[]): MetadataRoute.Sitemap {
  const now = new Date();
  const defaultPrefix =
    FALLBACK_LOCALES.find((l) => l.isDefault)?.urlPrefix ?? localePrefixes[0] ?? "en";
  return localePrefixes.flatMap((locale) =>
    STATIC_SEO_PAGES.map((page) => ({
      url: sitemapPublicUrl(siteUrl, locale, page.path || "/", defaultPrefix),
      lastModified: now,
      changeFrequency: page.path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: page.path === "" ? 1 : 0.8,
    })),
  );
}

/** Public alias for sitemap-index failure paths (static marketing URLs only). */
export function fallbackStaticSitemapEntries(
  siteUrl: string,
  localePrefixes: string[],
): MetadataRoute.Sitemap {
  return fallbackStaticSitemap(siteUrl, localePrefixes);
}

/** Format sitemap entries as standard sitemap.org XML. */
export function formatSitemapXml(entries: MetadataRoute.Sitemap): string {
  const body = entries
    .map((entry) => {
      const lines = [`    <loc>${escapeXml(entry.url)}</loc>`];
      if (entry.lastModified) {
        const date =
          entry.lastModified instanceof Date
            ? entry.lastModified
            : new Date(entry.lastModified);
        if (!Number.isNaN(date.getTime())) {
          lines.push(`    <lastmod>${date.toISOString()}</lastmod>`);
        }
      }
      if (entry.changeFrequency) {
        lines.push(`    <changefreq>${escapeXml(String(entry.changeFrequency))}</changefreq>`);
      }
      if (typeof entry.priority === "number") {
        lines.push(`    <priority>${entry.priority}</priority>`);
      }
      return `  <url>\n${lines.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export async function generateSitemap(siteOrigin?: string): Promise<MetadataRoute.Sitemap> {
  let siteUrl: string;
  try {
    const { resolveSitemapOriginSafe } = await import("./sitemap-origin");
    siteUrl = (siteOrigin ?? (await resolveSitemapOriginSafe())).replace(/\/$/, "");
  } catch {
    siteUrl = (siteOrigin ?? "https://brt-me.com").replace(/\/$/, "");
  }

  let localePrefixes: string[] = [];
  try {
    localePrefixes = await getEnabledUrlPrefixes();
  } catch {
    localePrefixes = [...FALLBACK_PREFIXES];
  }
  if (localePrefixes.length === 0) localePrefixes = [...FALLBACK_PREFIXES];

  if (isBuildWithoutDb()) {
    return fallbackStaticSitemap(siteUrl, localePrefixes);
  }

  try {
    return await buildSitemapEntries(siteUrl, localePrefixes);
  } catch (error) {
    console.error("[sitemap] generateSitemap failed, returning static fallback:", error);
    return fallbackStaticSitemap(siteUrl, localePrefixes);
  }
}

async function buildSitemapEntries(
  siteUrl: string,
  localePrefixes: string[],
): Promise<MetadataRoute.Sitemap> {
  let contentItems: {
    id: string;
    slug: string | null;
    updatedAt: Date;
    routePrefix: string | null;
    typeSlug: string;
  }[] = [];
  let cmsPages: { slug: string; updatedAt: Date }[] = [];
  let posts: { slug: string; updatedAt: Date }[] = [];
  let faqSets: { slug: string; updatedAt: Date }[] = [];
  let videos: { slug: string; updatedAt: Date }[] = [];
  let noIndexPaths = new Set<string>();
  let sitemapConfig: SeoSitemapConfig = {};

  const staticPageKeys = STATIC_SEO_PAGES.map((p) => p.pageKey);
  let staticContexts: Awaited<ReturnType<typeof listPageSeoContexts>> = {};

  try {
    // Read-only: do not call contentPublicService.ensureReady() on crawler GET paths.
    const settled = await Promise.allSettled([
      prisma.contentItem
        .findMany({
          where: { deletedAt: null, status: "PUBLISHED", isVisible: true, slug: { not: null } },
          select: {
            id: true,
            slug: true,
            updatedAt: true,
            contentType: { select: { routePrefix: true, slug: true } },
          },
        })
        .then((rows) =>
          rows.map((r) => ({
            id: r.id,
            slug: r.slug,
            updatedAt: r.updatedAt,
            routePrefix: r.contentType.routePrefix,
            typeSlug: r.contentType.slug,
          })),
        ),
      prisma.cmsPage.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.post.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.faqSet.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.video
        .findMany({
          where: { status: "PUBLISHED" },
          select: {
            slug: true,
            updatedAt: true,
            title: true,
            description: true,
            contentMedia: { select: { url: true, mimeType: true, mediaType: true } },
            thumbnailMedia: { select: { url: true, mimeType: true, mediaType: true } },
          },
        })
        .then((rows) =>
          rows
            .filter((row) => isVideoPublishReady(row))
            .map((row) => ({ slug: row.slug, updatedAt: row.updatedAt })),
        )
        .catch(() => [] as { slug: string; updatedAt: Date }[]),
      seoRepository.listNoIndexPaths(),
      listPageSeoContexts(staticPageKeys),
      seoRepository.getSitemapConfig().catch((): SeoSitemapConfig => ({})),
    ]);

    if (settled[0].status === "fulfilled") contentItems = settled[0].value;
    if (settled[1].status === "fulfilled") cmsPages = settled[1].value;
    if (settled[2].status === "fulfilled") posts = settled[2].value;
    if (settled[3].status === "fulfilled") faqSets = settled[3].value;
    if (settled[4].status === "fulfilled") videos = settled[4].value;
    if (settled[5].status === "fulfilled") noIndexPaths = settled[5].value;
    if (settled[6].status === "fulfilled") staticContexts = settled[6].value;
    if (settled[7].status === "fulfilled") sitemapConfig = settled[7].value;
  } catch {
    // DB may be unavailable — continue with whatever we have + catalog best-effort
  }

  const excludePathSet = new Set<string>();
  const excludeUrlSet = new Set<string>();
  for (const raw of sitemapConfig.excludePaths ?? []) {
    if (!raw.trim()) continue;
    if (isAbsoluteSitemapUrl(raw.trim())) {
      excludeUrlSet.add(normalizeAbsoluteSitemapUrl(raw.trim()));
    } else {
      excludePathSet.add(normalizeSitemapPath(raw));
    }
  }

  function isPathExcluded(path: string): boolean {
    return excludePathSet.has(normalizeSitemapPath(path)) || noIndexPaths.has(path);
  }

  function isEntryExcluded(url: string, path: string): boolean {
    if (isPathExcluded(path)) return true;
    return excludeUrlSet.has(normalizeAbsoluteSitemapUrl(url));
  }

  const entries: MetadataRoute.Sitemap = [];
  const seenUrls = new Set<string>();

  function pushEntry(entry: MetadataRoute.Sitemap[number], pathForExclude: string): void {
    if (seenUrls.has(entry.url)) return;
    if (isEntryExcluded(entry.url, pathForExclude)) return;
    seenUrls.add(entry.url);
    entries.push(entry);
  }

  let enabledLocales: Awaited<ReturnType<typeof localeService.listEnabled>> = [];
  try {
    enabledLocales = await localeService.listEnabled();
  } catch {
    enabledLocales = [];
  }
  const defaultPrefix =
    enabledLocales.find((l) => l.isDefault)?.urlPrefix ?? localePrefixes[0] ?? "en";

  const localizedSlugs = await prisma.localizedSlug
    .findMany({
      where: {
        entityType: { in: ["CmsPage", "Post", "ContentItem"] },
      },
      select: { entityType: true, entityId: true, localeCode: true, slug: true },
    })
    .catch(() => []);
  const slugLookup = new Map<string, string>();
  for (const row of localizedSlugs) {
    slugLookup.set(`${row.entityType}:${row.entityId}:${row.localeCode.toLowerCase()}`, row.slug);
  }

  const cmsIdBySlug = new Map(
    (
      await prisma.cmsPage
        .findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, slug: true },
        })
        .catch(() => [])
    ).map((p) => [p.slug, p.id]),
  );
  const postIdBySlug = new Map(
    (
      await prisma.post
        .findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, slug: true },
        })
        .catch(() => [])
    ).map((p) => [p.slug, p.id]),
  );

  function localizedPath(
    entityType: string,
    entityId: string,
    localeCode: string,
    defaultPath: string,
  ): string {
    const localized = slugLookup.get(`${entityType}:${entityId}:${localeCode.toLowerCase()}`);
    if (!localized) return defaultPath;
    // Home wired path "/" must not become "/{localizedSlug}"
    if (!defaultPath || defaultPath === "/") return defaultPath;
    const segments = defaultPath.split("/");
    segments[segments.length - 1] = localized;
    return segments.join("/");
  }

  const catalogLocale = localePrefixes[0] ?? FALLBACK_PREFIXES[0]!;
  let productSlugsByLocale = new Map<string, string[]>();
  let collectionSlugs: string[] = [];
  let brandSlugs: string[] = [];
  let tagSlugs: string[] = [];

  await Promise.all([
    (async () => {
      try {
        const pairs = await Promise.all(
          localePrefixes.map(async (prefix) => {
            try {
              const slugs = await productsDataService.getProductSlugs(prefix);
              return [prefix, slugs] as const;
            } catch (error) {
              console.error("[sitemap] product slugs unavailable for locale:", prefix, error);
              return [prefix, [] as string[]] as const;
            }
          }),
        );
        productSlugsByLocale = new Map(pairs);
      } catch (error) {
        console.error("[sitemap] product slugs unavailable:", error);
      }
    })(),
    (async () => {
      try {
        const collections = await collectionsDataService.listIndex({ localePrefix: catalogLocale });
        collectionSlugs = collections.map((c) => c.slug).filter(Boolean);
      } catch (error) {
        console.error("[sitemap] collection slugs unavailable:", error);
      }
    })(),
    (async () => {
      try {
        const records = await loadListingRecords(catalogLocale);
        const { brands, tags } = await loadBrandAndTagEntries(catalogLocale, records);
        brandSlugs = brands.map((b) => b.slug).filter(Boolean);
        tagSlugs = tags.map((t) => t.slug).filter(Boolean);
      } catch (error) {
        console.error("[sitemap] brand/tag slugs unavailable:", error);
      }
    })(),
  ]);

  const now = new Date();

  for (const localePrefix of localePrefixes) {
    const localeConfig = enabledLocales.find((l) => l.urlPrefix === localePrefix);
    const languageCode = localeConfig?.code ?? localePrefix;

    for (const page of STATIC_SEO_PAGES) {
      const ctx = staticContexts[page.pageKey];
      if (ctx?.indexing.isNoIndex) continue;
      pushEntry(
        {
          url: sitemapPublicUrl(siteUrl, localePrefix, page.path || "/", defaultPrefix),
          lastModified: now,
          changeFrequency: page.path === "" ? "weekly" : "monthly",
          priority: page.path === "" ? 1 : 0.8,
        },
        page.path,
      );
    }

    for (const item of contentItems) {
      try {
        const prefix = item.routePrefix?.trim() || item.typeSlug;
        if (!item.slug || !prefix) continue;
        const defaultPath = `/${prefix}/${item.slug}`;
        const path = localizedPath("ContentItem", item.id, languageCode, defaultPath);
        pushEntry(
          {
            url: sitemapPublicUrl(siteUrl, localePrefix, path, defaultPrefix),
            lastModified: item.updatedAt,
            changeFrequency: "weekly",
            priority: 0.9,
          },
          defaultPath,
        );
      } catch (error) {
        console.error("[sitemap] skip bad content item:", item.id, error);
      }
    }

    for (const p of cmsPages) {
      try {
        const defaultPath = getCmsPagePublicPath(p.slug);
        const normalizedDefault = normalizeSitemapPath(defaultPath === "/" ? "" : defaultPath);
        // Wired hubs already emitted via STATIC_SEO_PAGES
        if (
          p.slug in CMS_WIRED_MARKETING_SLUGS &&
          STATIC_PATH_SET.has(normalizedDefault)
        ) {
          continue;
        }
        const path = localizedPath("CmsPage", cmsIdBySlug.get(p.slug) ?? "", languageCode, defaultPath);
        const urlSuffix = path === "/" ? "" : path;
        pushEntry(
          {
            url: sitemapPublicUrl(siteUrl, localePrefix, urlSuffix || "/", defaultPrefix),
            lastModified: p.updatedAt,
            changeFrequency: "weekly",
            priority: 0.7,
          },
          normalizedDefault,
        );
      } catch (error) {
        console.error("[sitemap] skip bad cms page:", p.slug, error);
      }
    }

    for (const post of posts) {
      try {
        const defaultPath = `/blog/${post.slug}`;
        const path = localizedPath("Post", postIdBySlug.get(post.slug) ?? "", languageCode, defaultPath);
        pushEntry(
          {
            url: sitemapPublicUrl(siteUrl, localePrefix, path, defaultPrefix),
            lastModified: post.updatedAt,
            changeFrequency: "weekly",
            priority: 0.75,
          },
          defaultPath,
        );
      } catch (error) {
        console.error("[sitemap] skip bad post:", post.slug, error);
      }
    }

    for (const faqSet of faqSets) {
      try {
        const defaultPath = `/faq/${faqSet.slug}`;
        pushEntry(
          {
            url: sitemapPublicUrl(siteUrl, localePrefix, defaultPath, defaultPrefix),
            lastModified: faqSet.updatedAt,
            changeFrequency: "monthly",
            priority: 0.7,
          },
          defaultPath,
        );
      } catch (error) {
        console.error("[sitemap] skip bad faq set:", faqSet.slug, error);
      }
    }

    for (const video of videos) {
      try {
        const defaultPath = `/videos/${video.slug}`;
        pushEntry(
          {
            url: sitemapPublicUrl(siteUrl, localePrefix, defaultPath, defaultPrefix),
            lastModified: video.updatedAt,
            changeFrequency: "monthly",
            priority: 0.7,
          },
          defaultPath,
        );
      } catch (error) {
        console.error("[sitemap] skip bad video:", video.slug, error);
      }
    }

    const productSlugs = productSlugsByLocale.get(localePrefix) ?? [];
    for (const slug of productSlugs) {
      try {
        const defaultPath = `/products/${slug}`;
        pushEntry(
          {
            url: sitemapPublicUrl(siteUrl, localePrefix, defaultPath, defaultPrefix),
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.85,
          },
          defaultPath,
        );
      } catch (error) {
        console.error("[sitemap] skip bad product slug:", slug, error);
      }
    }

    for (const slug of collectionSlugs) {
      try {
        const defaultPath = `/categories/${slug}`;
        pushEntry(
          {
            url: sitemapPublicUrl(siteUrl, localePrefix, defaultPath, defaultPrefix),
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.8,
          },
          defaultPath,
        );
      } catch (error) {
        console.error("[sitemap] skip bad category slug:", slug, error);
      }
    }

    for (const slug of brandSlugs) {
      try {
        const defaultPath = `/brands/${slug}`;
        pushEntry(
          {
            url: sitemapPublicUrl(siteUrl, localePrefix, defaultPath, defaultPrefix),
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.75,
          },
          defaultPath,
        );
      } catch (error) {
        console.error("[sitemap] skip bad brand slug:", slug, error);
      }
    }

    for (const slug of tagSlugs) {
      try {
        const defaultPath = `/tags/${slug}`;
        pushEntry(
          {
            url: sitemapPublicUrl(siteUrl, localePrefix, defaultPath, defaultPrefix),
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.7,
          },
          defaultPath,
        );
      } catch (error) {
        console.error("[sitemap] skip bad tag slug:", slug, error);
      }
    }
  }

  for (const raw of sitemapConfig.extraPaths ?? []) {
    if (!raw.trim()) continue;
    const extra = normalizeExtraPath(raw);

    if (isAbsoluteSitemapUrl(extra)) {
      if (seenUrls.has(extra) || excludeUrlSet.has(extra)) continue;
      const derivedPath = pathFromSitemapUrl(extra, siteUrl, localePrefixes);
      if (derivedPath !== null && isPathExcluded(derivedPath)) continue;
      seenUrls.add(extra);
      entries.push({
        url: extra,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      });
      continue;
    }

    if (isPathExcluded(extra)) continue;

    for (const localePrefix of localePrefixes) {
      const url = sitemapPublicUrl(siteUrl, localePrefix, extra, defaultPrefix);
      if (seenUrls.has(url) || excludeUrlSet.has(normalizeAbsoluteSitemapUrl(url))) continue;
      seenUrls.add(url);
      entries.push({
        url,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
