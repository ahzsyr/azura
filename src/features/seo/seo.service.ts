import type { Metadata } from "next";
import { buildMetadata, JsonLd } from "@/lib/seo";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import { seoRepository } from "@/repositories/seo.repository";
import { localeService } from "@/features/i18n/locale.service";
import { resolvePageSeoContext } from "@/features/seo/resolve-page-seo-context";
import { resolveEffectiveSeoForLocale } from "@/features/seo/resolve-page-seo-for-locale";
import { prisma } from "@/lib/prisma";
import type { SeoResolveInput, SeoStructuredConfig } from "./types";

const SEO_ENTITY_TO_SLUG_TYPE: Record<string, string> = {
  CMS_PAGE: "CmsPage",
  POST: "Post",
  CONTENT_ITEM: "ContentItem",
};

async function loadSlugByLocale(entityType?: string, entityId?: string) {
  const slugEntityType = entityType ? SEO_ENTITY_TO_SLUG_TYPE[entityType] : undefined;
  if (!slugEntityType || !entityId) return undefined;

  const rows = await prisma.localizedSlug.findMany({
    where: { entityType: slugEntityType, entityId },
  });
  if (rows.length === 0) return undefined;
  return Object.fromEntries(rows.map((row) => [row.localeCode.toLowerCase(), row.slug]));
}

function resolvePath(input: SeoResolveInput, contextPath: string): string {
  return input.path ?? contextPath;
}

export const seoService = {
  async resolveMetadata(params: SeoResolveInput): Promise<Metadata> {
    try {
      const [context, enabledLocales, slugByLocaleFromDb, siteIdentity] = await Promise.all([
        resolvePageSeoContext({
          pageKey: params.pageKey,
          cmsPageId: params.cmsPageId ?? (params.entityType === "CMS_PAGE" ? params.entityId : undefined),
          postId: params.postId ?? (params.entityType === "POST" ? params.entityId : undefined),
          packageId: params.packageId,
          contentItemId:
            params.entityType === "CONTENT_ITEM" ? params.entityId : undefined,
          entityType: params.entityType,
          entityId: params.entityId,
          slug: params.slug,
          originContext: "public",
        }),
        localeService.listEnabled(),
        params.slugByLocale ? Promise.resolve(undefined) : loadSlugByLocale(params.entityType, params.entityId),
        resolveSiteIdentityFromDb().catch(() => null),
      ]);

      const slugByLocale = params.slugByLocale ?? slugByLocaleFromDb;
      const picked = await resolveEffectiveSeoForLocale(context, params.locale, {
        ogImage: params.ogImage,
      });

      const path = resolvePath(params, context.indexing.publicPath);
      const activeLocale = enabledLocales.find(
        (l) => l.urlPrefix === params.locale || l.code === params.locale,
      );

      return buildMetadata({
        title: picked.title || params.fallback?.title || "",
        description: picked.description || params.fallback?.description || "",
        path,
        locale: params.locale,
        origin: context.origin,
        ogImage: picked.ogImage,
        ogTitle: picked.ogTitle,
        canonicalUrl: picked.canonicalUrl,
        robots: picked.robots,
        focusKeywords: picked.focusKeywords,
        twitterCard: picked.twitterCard,
        enabledLocales,
        slugByLocale,
        htmlLang: activeLocale?.htmlLang,
        siteName: siteIdentity?.brandName,
      });
    } catch (error) {
      console.error("[seoService.resolveMetadata] failed:", error);
      return {
        title: params.fallback?.title || "",
        description: params.fallback?.description || "",
      };
    }
  },

  async resolveJsonLd(
    params: SeoResolveInput,
  ): Promise<Record<string, unknown> | Record<string, unknown>[] | null> {
    const context = await resolvePageSeoContext({
      pageKey: params.pageKey,
      cmsPageId: params.cmsPageId ?? (params.entityType === "CMS_PAGE" ? params.entityId : undefined),
      postId: params.postId ?? (params.entityType === "POST" ? params.entityId : undefined),
      packageId: params.packageId,
      entityType: params.entityType,
      entityId: params.entityId,
      slug: params.slug,
      originContext: "public",
    });
    if (!context.meta?.jsonLd) return null;
    const raw = context.meta.jsonLd;
    if (Array.isArray(raw)) return raw as Record<string, unknown>[];
    if (typeof raw === "object" && raw !== null) return raw as Record<string, unknown>;
    return null;
  },

  async getGlobalStructured(): Promise<SeoStructuredConfig> {
    return seoRepository.getStructuredConfig();
  },

  async getTrackingConfig() {
    return seoRepository.getTrackingConfig();
  },

  JsonLd,
};
