import type { Metadata } from "next";
import type { SeoMeta } from "@prisma/client";
import { buildMetadata, JsonLd } from "@/lib/seo";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import { seoRepository } from "@/repositories/seo.repository";
import { localeService } from "@/features/i18n/locale.service";
import { translationService } from "@/features/translation/translation.service";
import { resolveWithEnglishFallback } from "@/features/translation/translation-resolver";
import { resolvePrefixToCode } from "@/i18n/locale-config";
import { prisma } from "@/lib/prisma";
import type { SeoResolveInput, SeoStructuredConfig } from "./types";

function seoMetaToLegacyEntity(meta: SeoMeta): Record<string, unknown> {
  return {
    metaTitleEn: meta.titleEn,
    metaTitleAr: meta.titleAr,
    metaDescriptionEn: meta.descriptionEn,
    metaDescriptionAr: meta.descriptionAr,
    ogTitleEn: meta.ogTitleEn ?? "",
    ogTitleAr: meta.ogTitleAr ?? "",
  };
}

async function pickLocalized(
  meta: SeoMeta | null,
  localeUrlPrefix: SeoResolveInput["locale"],
  fallback: { title: string; description: string },
  ogImage?: string
) {
  const enabledLocales = await localeService.listEnabled();
  const defaultCode = enabledLocales.find((l) => l.isDefault)?.code ?? "en";
  const languageCode = resolvePrefixToCode(localeUrlPrefix, enabledLocales);

  const translations =
    meta != null ? await translationService.getForEntity("SeoMeta", meta.id) : [];

  const ctx = {
    translations,
    legacyEntity: meta ? seoMetaToLegacyEntity(meta) : undefined,
    enabledLocales,
    defaultCode,
  };

  const title = meta
    ? resolveWithEnglishFallback("metaTitle", languageCode, ctx)
    : fallback.title;
  const description = meta
    ? resolveWithEnglishFallback("metaDescription", languageCode, ctx)
    : fallback.description;
  const ogTitle = meta
    ? resolveWithEnglishFallback("ogTitle", languageCode, ctx) || undefined
    : undefined;

  return {
    title: title || fallback.title,
    description: description || fallback.description,
    ogTitle,
    ogImage: meta?.ogImageUrl ?? ogImage,
    canonicalUrl: meta?.canonicalUrl ?? null,
    robots: meta?.robots ?? null,
    focusKeywords: meta?.focusKeywords ?? null,
    twitterCard: (meta?.twitterCard as "summary" | "summary_large_image" | null) ?? null,
    jsonLd: meta?.jsonLd ?? null,
  };
}

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
  return Object.fromEntries(rows.map((row) => [row.languageCode.toLowerCase(), row.slug]));
}

export const seoService = {
  async resolveMetadata(params: SeoResolveInput): Promise<Metadata> {
    const [meta, enabledLocales, slugByLocaleFromDb, siteIdentity] = await Promise.all([
      seoRepository.resolveMeta({
        pageKey: params.pageKey,
        entityType: params.entityType,
        entityId: params.entityId,
        cmsPageId: params.entityType === "CMS_PAGE" ? params.entityId : undefined,
        postId: params.entityType === "POST" ? params.entityId : undefined,
        seoMeta: params.seoMeta,
      }),
      localeService.listEnabled(),
      params.slugByLocale
        ? Promise.resolve(undefined)
        : loadSlugByLocale(params.entityType, params.entityId),
      resolveSiteIdentityFromDb().catch(() => null),
    ]);
    const slugByLocale = params.slugByLocale ?? slugByLocaleFromDb;

    const picked = await pickLocalized(meta, params.locale, params.fallback, params.ogImage);
    const activeLocale = enabledLocales.find(
      (l) => l.urlPrefix === params.locale || l.code === params.locale
    );

    return buildMetadata({
      title: picked.title,
      description: picked.description,
      path: params.path,
      locale: params.locale,
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
  },

  async resolveJsonLd(
    params: SeoResolveInput
  ): Promise<Record<string, unknown> | Record<string, unknown>[] | null> {
    const meta = await seoRepository.resolveMeta({
      pageKey: params.pageKey,
      entityType: params.entityType,
      entityId: params.entityId,
      cmsPageId: params.entityType === "CMS_PAGE" ? params.entityId : undefined,
      postId: params.entityType === "POST" ? params.entityId : undefined,
      seoMeta: params.seoMeta,
    });
    if (!meta?.jsonLd) return null;
    const raw = meta.jsonLd;
    if (Array.isArray(raw)) return raw as Record<string, unknown>[];
    if (typeof raw === "object" && raw !== null) return raw as Record<string, unknown>;
    return null;
  },

  async getGlobalStructured(): Promise<SeoStructuredConfig> {
    return seoRepository.getStructuredConfig();
  },

  JsonLd,
};
