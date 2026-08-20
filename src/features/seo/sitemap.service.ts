import type { MetadataRoute } from "next";
import { isBuildWithoutDb } from "@/lib/build-db";
import { prisma } from "@/lib/prisma";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { localeService } from "@/features/i18n/locale.service";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { contentPublicService } from "@/features/content/content-public.service";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import { collectionsDataService } from "@/features/collections/collections-data.service";
import { productsDataService } from "@/features/products/products-data.service";
import { loadListingRecords } from "@/features/products/index/product-index-loader";
import { loadBrandAndTagEntries } from "@/features/catalog/brand-tag-pages.service";
import { STATIC_SEO_PAGES } from "./constants";
import { seoRepository } from "@/repositories/seo.repository";
import { listPageSeoContexts } from "./resolve-page-seo-context";
import { resolveSiteOrigin } from "./resolve-site-origin";
import type { SeoSitemapConfig } from "./types";
import {
  isAbsoluteSitemapUrl,
  normalizeAbsoluteSitemapUrl,
  normalizeSitemapPath,
  pathFromSitemapUrl,
} from "./sitemap-path-utils";
import { escapeXml } from "@/lib/xml/escape-xml";

export { normalizeSitemapPath, pathFromSitemapUrl } from "./sitemap-path-utils";
export { escapeXml } from "@/lib/xml/escape-xml";

const FALLBACK_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);

const STATIC_PATH_SET = new Set(STATIC_SEO_PAGES.map((page) => normalizeSitemapPath(page.path)));

function normalizeExtraPath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (isAbsoluteSitemapUrl(trimmed)) return normalizeAbsoluteSitemapUrl(trimmed);
  return normalizeSitemapPath(trimmed);
}

function fallbackStaticSitemap(siteUrl: string, localePrefixes: string[]): MetadataRoute.Sitemap {
  const now = new Date();
  return localePrefixes.flatMap((locale) =>
    STATIC_SEO_PAGES.map((page) => ({
      url: `${siteUrl}/${locale}${page.path}`,
      lastModified: now,
      changeFrequency: page.path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: page.path === "" ? 1 : 0.8,
    })),
  );
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
  const siteUrl = (siteOrigin ?? (await resolveSiteOrigin("sitemap"))).replace(/\/$/, "");

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
  let noIndexPaths = new Set<string>();
  let sitemapConfig: SeoSitemapConfig = {};

  const staticPageKeys = STATIC_SEO_PAGES.map((p) => p.pageKey);
  let staticContexts: Awaited<ReturnType<typeof listPageSeoContexts>> = {};

  try {
    await contentPublicService.ensureReady();
    [contentItems, cmsPages, posts, faqSets, noIndexPaths, staticContexts, sitemapConfig] =
      await Promise.all([
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
        seoRepository.listNoIndexPaths(),
        listPageSeoContexts(staticPageKeys),
        seoRepository.getSitemapConfig().catch((): SeoSitemapConfig => ({})),
      ]);
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
            const slugs = await productsDataService.getProductSlugs(prefix);
            return [prefix, slugs] as const;
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
          url: `${siteUrl}/${localePrefix}${page.path}`,
          lastModified: now,
          changeFrequency: page.path === "" ? "weekly" : "monthly",
          priority: page.path === "" ? 1 : 0.8,
        },
        page.path,
      );
    }

    for (const item of contentItems) {
      const prefix = item.routePrefix?.trim() || item.typeSlug;
      if (!item.slug || !prefix) continue;
      const defaultPath = `/${prefix}/${item.slug}`;
      const path = localizedPath("ContentItem", item.id, languageCode, defaultPath);
      pushEntry(
        {
          url: `${siteUrl}/${localePrefix}${path}`,
          lastModified: item.updatedAt,
          changeFrequency: "weekly",
          priority: 0.9,
        },
        defaultPath,
      );
    }

    for (const p of cmsPages) {
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
          url: `${siteUrl}/${localePrefix}${urlSuffix}`,
          lastModified: p.updatedAt,
          changeFrequency: "weekly",
          priority: 0.7,
        },
        normalizedDefault,
      );
    }

    for (const post of posts) {
      const defaultPath = `/blog/${post.slug}`;
      const path = localizedPath("Post", postIdBySlug.get(post.slug) ?? "", languageCode, defaultPath);
      pushEntry(
        {
          url: `${siteUrl}/${localePrefix}${path}`,
          lastModified: post.updatedAt,
          changeFrequency: "weekly",
          priority: 0.75,
        },
        defaultPath,
      );
    }

    for (const faqSet of faqSets) {
      const defaultPath = `/faq/${faqSet.slug}`;
      pushEntry(
        {
          url: `${siteUrl}/${localePrefix}${defaultPath}`,
          lastModified: faqSet.updatedAt,
          changeFrequency: "monthly",
          priority: 0.7,
        },
        defaultPath,
      );
    }

    const productSlugs = productSlugsByLocale.get(localePrefix) ?? [];
    for (const slug of productSlugs) {
      const defaultPath = `/products/${slug}`;
      pushEntry(
        {
          url: `${siteUrl}/${localePrefix}${defaultPath}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.85,
        },
        defaultPath,
      );
    }

    for (const slug of collectionSlugs) {
      const defaultPath = `/categories/${slug}`;
      pushEntry(
        {
          url: `${siteUrl}/${localePrefix}${defaultPath}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.8,
        },
        defaultPath,
      );
    }

    for (const slug of brandSlugs) {
      const defaultPath = `/brands/${slug}`;
      pushEntry(
        {
          url: `${siteUrl}/${localePrefix}${defaultPath}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.75,
        },
        defaultPath,
      );
    }

    for (const slug of tagSlugs) {
      const defaultPath = `/tags/${slug}`;
      pushEntry(
        {
          url: `${siteUrl}/${localePrefix}${defaultPath}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.7,
        },
        defaultPath,
      );
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
      const url = `${siteUrl}/${localePrefix}${extra}`;
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
