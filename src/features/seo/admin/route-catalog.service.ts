import "server-only";

import { prisma } from "@/lib/prisma";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import { localeService } from "@/features/i18n/locale.service";
import type { RouteCatalogEntry } from "@/features/seo/admin/route-catalog.types";

export type { RouteCatalogEntry, RouteCatalogSource } from "@/features/seo/admin/route-catalog.types";

function withLocalePrefix(localePrefix: string, path: string): string {
  const normalized = path === "/" || path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${localePrefix}${normalized}`;
}

/** Aggregate public site routes for Redirect Manager (locale-prefixed for UI). */
export async function listPublicRouteCatalog(): Promise<RouteCatalogEntry[]> {
  const enabledLocales = await localeService.listEnabled().catch(() => []);
  const defaultLocale =
    enabledLocales.find((l) => l.isDefault)?.urlPrefix ??
    enabledLocales[0]?.urlPrefix ??
    "en";

  const byPath = new Map<string, RouteCatalogEntry>();

  function add(entry: RouteCatalogEntry) {
    if (!byPath.has(entry.path)) byPath.set(entry.path, entry);
  }

  for (const page of STATIC_SEO_PAGES) {
    const path = withLocalePrefix(defaultLocale, page.path || "/");
    add({
      path: page.path === "" ? `/${defaultLocale}` : path,
      label: page.label,
      source: "wired",
    });
  }

  for (const [slug, wiredPath] of Object.entries(CMS_WIRED_MARKETING_SLUGS)) {
    const path = withLocalePrefix(defaultLocale, wiredPath || "/");
    add({
      path: wiredPath === "" || wiredPath === "/" ? `/${defaultLocale}` : path,
      label: slug,
      source: "wired",
    });
  }

  try {
    const [cmsPages, posts, faqSets, contentItems] = await Promise.all([
      prisma.cmsPage.findMany({
        select: { slug: true, status: true },
        orderBy: { slug: "asc" },
      }),
      prisma.post.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true },
        orderBy: { slug: "asc" },
        take: 200,
      }),
      prisma.faqSet.findMany({
        where: { isPublished: true },
        select: { slug: true },
        orderBy: { slug: "asc" },
        take: 100,
      }),
      prisma.contentItem.findMany({
        where: { deletedAt: null, status: "PUBLISHED", isVisible: true, slug: { not: null } },
        select: {
          slug: true,
          contentType: { select: { routePrefix: true } },
        },
        take: 300,
      }),
    ]);

    for (const page of cmsPages) {
      const publicPath = getCmsPagePublicPath(page.slug);
      const isWired = page.slug in CMS_WIRED_MARKETING_SLUGS;
      add({
        path: withLocalePrefix(defaultLocale, publicPath || "/"),
        label: page.slug,
        source: isWired ? "wired" : "cms",
      });
    }

    for (const post of posts) {
      add({
        path: withLocalePrefix(defaultLocale, `/blog/${post.slug}`),
        label: post.slug,
        source: "blog",
      });
    }

    for (const faq of faqSets) {
      add({
        path: withLocalePrefix(defaultLocale, `/faq/${faq.slug}`),
        label: faq.slug,
        source: "faq",
      });
    }

    for (const item of contentItems) {
      if (!item.slug || !item.contentType.routePrefix) continue;
      add({
        path: withLocalePrefix(defaultLocale, `/${item.contentType.routePrefix}/${item.slug}`),
        label: item.slug,
        source: "content",
      });
    }
  } catch {
    // DB unavailable — return static/wired only
  }

  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}
