import { localeService } from "@/features/i18n/locale.service";
import type { PageSeoContext } from "@/features/seo/page-seo-context.types";
import { readLegacyFieldForLocale } from "@/features/translation/admin-field-value";
import { resolvePrefixToCode } from "@/i18n/locale-config";
import { resolveWithEnglishFallback } from "@/features/translation/translation-resolver";
import { translationService } from "@/features/translation/translation.service";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";

export type EffectiveSeoForLocale = {
  title: string;
  description: string;
  ogTitle?: string;
  ogImage?: string;
  canonicalUrl: string | null;
  robots: string | null;
  focusKeywords: string | null;
  twitterCard: "summary" | "summary_large_image" | null;
  jsonLd: unknown;
};

function contentFallbackForLocale(
  context: PageSeoContext,
  languageCode: string,
): { title: string; description: string } {
  const { contentFallbacks } = context;
  if (languageCode === "en") {
    return { title: contentFallbacks.titleEn, description: contentFallbacks.descEn };
  }
  if (isArabicLocale(languageCode)) {
    return { title: contentFallbacks.titleAr, description: contentFallbacks.descAr };
  }
  return { title: "", description: "" };
}

async function contentItemFallbackForLocale(
  contentItemId: string,
  languageCode: string,
  enabledLocales: Awaited<ReturnType<typeof localeService.listEnabled>>,
  defaultCode: string,
): Promise<{ title: string; description: string }> {
  const rows = await translationService.getForEntity("ContentItem", contentItemId);
  const ctx = { translations: rows, enabledLocales, defaultCode };
  const title =
    resolveWithEnglishFallback("seoTitle", languageCode, ctx) ||
    resolveWithEnglishFallback("title", languageCode, ctx);
  const description =
    resolveWithEnglishFallback("seoDescription", languageCode, ctx) ||
    resolveWithEnglishFallback("shortDescription", languageCode, ctx) ||
    resolveWithEnglishFallback("description", languageCode, ctx).slice(0, 160);
  return { title, description };
}

/**
 * Resolves effective public SEO fields for one locale from a PageSeoContext.
 * Replaces per-route pickLocalized / fallback assembly.
 */
export async function resolveEffectiveSeoForLocale(
  context: PageSeoContext,
  localeUrlPrefix: string,
  options?: { ogImage?: string },
): Promise<EffectiveSeoForLocale> {
  const enabledLocales = await localeService.listEnabled();
  const defaultCode = enabledLocales.find((l) => l.isDefault)?.code ?? "en";
  const languageCode = resolvePrefixToCode(localeUrlPrefix, enabledLocales);
  const contentFallback = context.identity.contentItemId
    ? await contentItemFallbackForLocale(
        context.identity.contentItemId,
        languageCode,
        enabledLocales,
        defaultCode,
      )
    : contentFallbackForLocale(context, languageCode);

  const meta = context.meta;
  if (!meta) {
    return {
      title: contentFallback.title,
      description: contentFallback.description,
      ogImage: options?.ogImage,
      canonicalUrl: null,
      robots: context.indexing.robots,
      focusKeywords: null,
      twitterCard: "summary_large_image",
      jsonLd: null,
    };
  }

  const translations = await translationService.getForEntity("SeoMeta", meta.id);
  const ctx = { translations, enabledLocales, defaultCode };

  const titleFromSeo = resolveWithEnglishFallback("metaTitle", languageCode, ctx);
  const descriptionFromSeo = resolveWithEnglishFallback("metaDescription", languageCode, ctx);
  const ogTitle = resolveWithEnglishFallback("ogTitle", languageCode, ctx) || undefined;

  const savedTitle = readLegacyFieldForLocale(context.savedTranslations, "metaTitle", languageCode);
  const savedDescription = readLegacyFieldForLocale(
    context.savedTranslations,
    "metaDescription",
    languageCode,
  );

  const title = savedTitle.trim() ? titleFromSeo || savedTitle : titleFromSeo || contentFallback.title;
  const description = savedDescription.trim()
    ? descriptionFromSeo || savedDescription
    : descriptionFromSeo || contentFallback.description;

  return {
    title: title || contentFallback.title,
    description: description || contentFallback.description,
    ogTitle,
    ogImage: meta.ogImageUrl ?? options?.ogImage,
    canonicalUrl: meta.canonicalUrl ?? null,
    robots: meta.robots ?? context.indexing.robots,
    focusKeywords: meta.focusKeywords ?? null,
    twitterCard: (meta.twitterCard as "summary" | "summary_large_image" | null) ?? "summary_large_image",
    jsonLd: meta.jsonLd ?? null,
  };
}
