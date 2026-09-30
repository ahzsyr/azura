import "server-only";

import { prisma } from "@/lib/prisma";
import { buildCanonicalUrl } from "@/i18n/seo-helpers";
import { localeService } from "@/features/i18n/locale.service";
import { getFallbackDefaultLocalePrefix } from "@/i18n/url-helpers";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { getStaticSeoPage, isStaticSeoPageKey } from "@/features/seo/constants";
import { getCmsPageSeoPageKey } from "@/features/seo/cms-page-seo-context";

export async function resolveSeoTriggerPaths(input: {
  entityType: string;
  entityId: string;
  locale: string;
  pageKey?: string;
}): Promise<string[]> {
  const enabledLocales = await localeService.listEnabled().catch(() => []);
  const siteOrigin = (await resolveSiteOrigin("background")).replace(/\/$/, "");
  const defaultPrefix =
    enabledLocales.find((l) => l.isDefault)?.urlPrefix ?? getFallbackDefaultLocalePrefix();

  const paths: string[] = [];

  if (input.pageKey && isStaticSeoPageKey(input.pageKey)) {
    const page = getStaticSeoPage(input.pageKey);
    if (!page) return paths;
    for (const locale of enabledLocales) {
      paths.push(
        buildCanonicalUrl(siteOrigin, locale.urlPrefix, page.path || "/", undefined, defaultPrefix),
      );
    }
    return paths;
  }

  const type = input.entityType.toUpperCase();
  if (type === "POST") {
    const post = await prisma.post.findUnique({ where: { id: input.entityId }, select: { slug: true } });
    if (post?.slug) {
      for (const locale of enabledLocales) {
        paths.push(
          buildCanonicalUrl(siteOrigin, locale.urlPrefix, `/blog/${post.slug}`, undefined, defaultPrefix),
        );
      }
    }
    return paths;
  }

  if (type === "CMSPAGE" || type === "CMS_PAGE") {
    const page = await prisma.cmsPage.findUnique({
      where: { id: input.entityId },
      select: { slug: true },
    });
    if (page?.slug) {
      const wiredKey = getCmsPageSeoPageKey(page.slug);
      const wiredPage =
        wiredKey && isStaticSeoPageKey(wiredKey) ? getStaticSeoPage(wiredKey) : undefined;
      const publicPath = wiredPage?.path ?? `/${page.slug}`;
      for (const locale of enabledLocales) {
        paths.push(
          buildCanonicalUrl(siteOrigin, locale.urlPrefix, publicPath, undefined, defaultPrefix),
        );
      }
    }
    return paths;
  }

  if (input.locale) {
    paths.push(
      buildCanonicalUrl(siteOrigin, input.locale, "/", undefined, defaultPrefix),
    );
  }

  return paths;
}
