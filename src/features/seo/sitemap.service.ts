import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getEnabledUrlPrefixes } from "@/i18n/locale-registry.server";
import { localeService } from "@/features/i18n/locale.service";
import { routing } from "@/i18n/routing";
import { contentPublicService } from "@/features/content/content-public.service";
import { STATIC_SEO_PAGES } from "./constants";
import { seoRepository } from "@/repositories/seo.repository";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateSitemap(): Promise<MetadataRoute.Sitemap> {
  let contentItems: {
    id: string;
    slug: string | null;
    updatedAt: Date;
    routePrefix: string | null;
  }[] = [];
  let cmsPages: { slug: string; updatedAt: Date }[] = [];
  let posts: { slug: string; updatedAt: Date }[] = [];
  let noIndexPaths = new Set<string>();

  try {
    await contentPublicService.ensureReady();
    [contentItems, cmsPages, posts, noIndexPaths] = await Promise.all([
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
        }))
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
    localePrefixes = [...routing.locales];
  }
  if (localePrefixes.length === 0) localePrefixes = [...routing.locales];

  const localizedSlugs = await prisma.localizedSlug
    .findMany({
      where: {
        entityType: { in: ["CmsPage", "Post", "ContentItem"] },
      },
      select: { entityType: true, entityId: true, languageCode: true, slug: true },
    })
    .catch(() => []);
  const slugLookup = new Map<string, string>();
  for (const row of localizedSlugs) {
    slugLookup.set(`${row.entityType}:${row.entityId}:${row.languageCode.toLowerCase()}`, row.slug);
  }

  const cmsIdBySlug = new Map(
    (
      await prisma.cmsPage
        .findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, slug: true },
        })
        .catch(() => [])
    ).map((p) => [p.slug, p.id])
  );
  const postIdBySlug = new Map(
    (
      await prisma.post
        .findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, slug: true },
        })
        .catch(() => [])
    ).map((p) => [p.slug, p.id])
  );

  function localizedPath(
    entityType: string,
    entityId: string,
    localeCode: string,
    defaultPath: string
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
      const defaultPath = `/pages/${p.slug}`;
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
