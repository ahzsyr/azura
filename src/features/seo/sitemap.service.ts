import type { MetadataRoute } from "next";
import { isBuildWithoutDb } from "@/lib/build-db";
import { prisma } from "@/lib/prisma";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { localeService } from "@/features/i18n/locale.service";
import { FALLBACK_LOCALES } from "@/i18n/locale-config";
import { contentPublicService } from "@/features/content/content-public.service";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { STATIC_SEO_PAGES } from "./constants";
import { seoRepository } from "@/repositories/seo.repository";
import { listPageSeoContexts } from "./resolve-page-seo-context";
import { resolveSiteOrigin } from "./resolve-site-origin";

const FALLBACK_PREFIXES = FALLBACK_LOCALES.map((locale) => locale.urlPrefix);

export async function generateSitemap(siteOrigin?: string): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (siteOrigin ?? (await resolveSiteOrigin("sitemap"))).replace(/\/$/, "");
  if (isBuildWithoutDb()) {
    const prefixes = [...FALLBACK_PREFIXES];
    return prefixes.flatMap((locale) =>
      STATIC_SEO_PAGES.map((page) => ({
        url: `${siteUrl}/${locale}${page.path}`,
        lastModified: new Date(),
      })),
    );
  }

  let contentItems: {
    id: string;
    slug: string | null;
    updatedAt: Date;
    routePrefix: string | null;
  }[] = [];
  let cmsPages: { slug: string; updatedAt: Date }[] = [];
  let posts: { slug: string; updatedAt: Date }[] = [];
  let noIndexPaths = new Set<string>();

  const staticPageKeys = STATIC_SEO_PAGES.map((p) => p.pageKey);
  let staticContexts: Awaited<ReturnType<typeof listPageSeoContexts>> = {};

  try {
    await contentPublicService.ensureReady();
    [contentItems, cmsPages, posts, noIndexPaths, staticContexts] = await Promise.all([
      prisma.contentItem.findMany({
        where: { deletedAt: null, status: "PUBLISHED", isVisible: true, slug: { not: null } },
        select: {
          id: true,
          slug: true,
          updatedAt: true,
          contentType: { select: { routePrefix: true } },
        },
      }).then((rows) =>
        rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          updatedAt: r.updatedAt,
          routePrefix: r.contentType.routePrefix,
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
      seoRepository.listNoIndexPaths(),
      listPageSeoContexts(staticPageKeys),
    ]);
  } catch {
    // DB may be unavailable at build time
  }

  const entries: MetadataRoute.Sitemap = [];

  let localePrefixes: string[] = [];
  let enabledLocales: Awaited<ReturnType<typeof localeService.listEnabled>> = [];
  try {
    localePrefixes = await getEnabledUrlPrefixes();
    enabledLocales = await localeService.listEnabled();
  } catch {
    localePrefixes = [...FALLBACK_PREFIXES];
  }
  if (localePrefixes.length === 0) localePrefixes = [...FALLBACK_PREFIXES];

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
    const segments = defaultPath.split("/");
    segments[segments.length - 1] = localized;
    return segments.join("/");
  }

  for (const localePrefix of localePrefixes) {
    const localeConfig = enabledLocales.find((l) => l.urlPrefix === localePrefix);
    const languageCode = localeConfig?.code ?? localePrefix;
    for (const page of STATIC_SEO_PAGES) {
      const ctx = staticContexts[page.pageKey];
      if (ctx?.indexing.isNoIndex) continue;
      if (noIndexPaths.has(page.path)) continue;
      entries.push({
        url: `${siteUrl}/${localePrefix}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.path === "" ? "weekly" : "monthly",
        priority: page.path === "" ? 1 : 0.8,
      });
    }

    for (const item of contentItems) {
      if (!item.slug || !item.routePrefix) continue;
      const defaultPath = `/${item.routePrefix}/${item.slug}`;
      const path = localizedPath("ContentItem", item.id, languageCode, defaultPath);
      if (noIndexPaths.has(defaultPath)) continue;
      entries.push({
        url: `${siteUrl}/${localePrefix}${path}`,
        lastModified: item.updatedAt,
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }

    for (const p of cmsPages) {
      const defaultPath = getCmsPagePublicPath(p.slug);
      const path = localizedPath("CmsPage", cmsIdBySlug.get(p.slug) ?? "", languageCode, defaultPath);
      if (noIndexPaths.has(defaultPath)) continue;
      entries.push({
        url: `${siteUrl}/${localePrefix}${path}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const post of posts) {
      const defaultPath = `/blog/${post.slug}`;
      const path = localizedPath("Post", postIdBySlug.get(post.slug) ?? "", languageCode, defaultPath);
      if (noIndexPaths.has(defaultPath)) continue;
      entries.push({
        url: `${siteUrl}/${localePrefix}${path}`,
        lastModified: post.updatedAt,
        changeFrequency: "weekly",
        priority: 0.75,
      });
    }
  }

  return entries;
}
