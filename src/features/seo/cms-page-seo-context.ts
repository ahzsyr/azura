import type { SeoMeta } from "@prisma/client";
import { CMS_WIRED_MARKETING_SLUGS } from "@/features/cms/cms-wired-slugs";

/** Wired routes that resolve public SEO via cmsPageId / entityType CMS_PAGE instead of pageKey. */
const CMS_PAGE_SEO_SLUGS = new Set(["why-choose-us"]);

const SEO_TRANSLATION_FIELDS = ["metaTitle", "metaDescription", "ogTitle", "ogDescription"] as const;

function isEmpty(value: string | null | undefined): boolean {
  return !value?.trim();
}

function pickString(
  primary: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  if (!isEmpty(primary)) return primary!.trim();
  if (!isEmpty(fallback)) return fallback!.trim();
  return null;
}

/**
 * Returns the static pageKey used for SeoMeta when editing a wired CMS page in admin,
 * or undefined when SEO is stored on cmsPageId.
 */
export function getCmsPageSeoPageKey(slug: string): string | undefined {
  if (!slug || CMS_PAGE_SEO_SLUGS.has(slug)) return undefined;
  if (slug in CMS_WIRED_MARKETING_SLUGS) return slug;
  return undefined;
}

export type CmsPageEditorSeoContext = {
  pageKey?: string;
  cmsPageId?: string;
  meta: SeoMeta | null;
  translations: Record<string, string>;
  cmsSeoMetaIdToRetire?: string;
};

/** Merge non-localized SeoMeta fields — pageKey row is canonical when present. */
export function coalesceMetaRecord(
  pageKeyMeta: SeoMeta | null | undefined,
  cmsSeoMeta: SeoMeta | null | undefined,
): SeoMeta | null {
  if (!pageKeyMeta && !cmsSeoMeta) return null;
  if (!pageKeyMeta) return cmsSeoMeta ?? null;
  if (!cmsSeoMeta || pageKeyMeta.id === cmsSeoMeta.id) return pageKeyMeta;

  return {
    ...pageKeyMeta,
    canonicalUrl: pickString(pageKeyMeta.canonicalUrl, cmsSeoMeta.canonicalUrl),
    robots: pickString(pageKeyMeta.robots, cmsSeoMeta.robots),
    focusKeywords: pickString(pageKeyMeta.focusKeywords, cmsSeoMeta.focusKeywords),
    ogImageUrl: pickString(pageKeyMeta.ogImageUrl, cmsSeoMeta.ogImageUrl),
    twitterCard: pickString(pageKeyMeta.twitterCard, cmsSeoMeta.twitterCard),
    jsonLd: pageKeyMeta.jsonLd ?? cmsSeoMeta.jsonLd,
  };
}

/** Merge localized SEO fields — pageKey translations win; cms fills gaps. */
export function coalesceTranslationRecords(
  pageKeyTranslations: Record<string, string> | undefined,
  cmsTranslations: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = { ...(pageKeyTranslations ?? {}) };
  const keys = new Set([
    ...Object.keys(pageKeyTranslations ?? {}),
    ...Object.keys(cmsTranslations ?? {}),
  ]);

  for (const key of keys) {
    if (isEmpty(out[key]) && !isEmpty(cmsTranslations?.[key])) {
      out[key] = cmsTranslations![key]!.trim();
    }
  }

  return out;
}

export function coalesceWiredPageSeo(input: {
  pageKey?: string;
  pageKeyMeta?: SeoMeta | null;
  cmsSeoMeta?: SeoMeta | null;
  pageKeyTranslations?: Record<string, string>;
  cmsTranslations?: Record<string, string>;
}): {
  meta: SeoMeta | null;
  translations: Record<string, string>;
  cmsSeoMetaIdToRetire?: string;
} {
  if (!input.pageKey) {
    return {
      meta: input.cmsSeoMeta ?? null,
      translations: input.cmsTranslations ?? {},
    };
  }

  const meta = coalesceMetaRecord(input.pageKeyMeta, input.cmsSeoMeta);
  const translations = coalesceTranslationRecords(
    input.pageKeyTranslations,
    input.cmsTranslations,
  );

  const cmsSeoMetaIdToRetire =
    input.pageKeyMeta &&
    input.cmsSeoMeta &&
    input.pageKeyMeta.id !== input.cmsSeoMeta.id
      ? input.cmsSeoMeta.id
      : undefined;

  return { meta, translations, cmsSeoMetaIdToRetire };
}

const WIRED_PAGE_KEY_MERGE_SLUGS = Object.keys(CMS_WIRED_MARKETING_SLUGS).filter(
  (slug) => slug !== "why-choose-us",
);

/** Resolves meta + translation maps for one static page after coalesce (and optional post-merge reload). */
export function resolveStaticPageSeoMaps(input: {
  pageKey: string;
  pageKeyMeta: SeoMeta;
  cmsSeoMeta: SeoMeta | null;
  pageKeyTranslations: Record<string, string>;
  cmsSeoTranslations: Record<string, string>;
  canonicalMetaAfterMerge?: SeoMeta | null;
  canonicalTranslationsAfterMerge?: Record<string, string>;
}): {
  meta: SeoMeta;
  translations: Record<string, string>;
  savedTranslations: Record<string, string>;
  needsMerge: boolean;
} {
  const coalesced = coalesceWiredPageSeo({
    pageKey: input.pageKey,
    pageKeyMeta: input.pageKeyMeta,
    cmsSeoMeta: input.cmsSeoMeta,
    pageKeyTranslations: input.pageKeyTranslations,
    cmsTranslations: input.cmsSeoTranslations,
  });

  const needsMerge = Boolean(
    coalesced.cmsSeoMetaIdToRetire && WIRED_PAGE_KEY_MERGE_SLUGS.includes(input.pageKey),
  );

  if (needsMerge && input.canonicalMetaAfterMerge !== undefined) {
    const saved = input.canonicalTranslationsAfterMerge ?? {};
    return {
      meta: (input.canonicalMetaAfterMerge ?? input.pageKeyMeta) as SeoMeta,
      translations: saved,
      savedTranslations: saved,
      needsMerge: true,
    };
  }

  return {
    meta: (coalesced.meta ?? input.pageKeyMeta) as SeoMeta,
    translations: coalesced.translations,
    savedTranslations: input.pageKeyTranslations,
    needsMerge,
  };
}

/**
 * Picks the SeoMeta row the page editor should display.
 * Wired pages coalesce pageKey and cmsPageId records.
 */
export function resolveCmsPageEditorSeoMeta(
  pageKeyMeta: SeoMeta | null | undefined,
  cmsSeoMeta: SeoMeta | null | undefined,
  pageKey?: string,
): SeoMeta | null {
  if (pageKey) return coalesceMetaRecord(pageKeyMeta, cmsSeoMeta);
  return cmsSeoMeta ?? null;
}

/**
 * @deprecated Use resolvePageSeoContext() — kept for unit tests of coalesce helpers.
 */
export function buildCmsPageEditorSeoContext(input: {
  slug: string;
  cmsPageId: string;
  cmsSeoMeta?: SeoMeta | null;
  pageKeyMeta?: SeoMeta | null;
  pageKeyTranslations?: Record<string, string>;
  cmsTranslations?: Record<string, string>;
}): CmsPageEditorSeoContext {
  const pageKey = getCmsPageSeoPageKey(input.slug);
  const coalesced = coalesceWiredPageSeo({
    pageKey,
    pageKeyMeta: input.pageKeyMeta,
    cmsSeoMeta: input.cmsSeoMeta,
    pageKeyTranslations: input.pageKeyTranslations,
    cmsTranslations: input.cmsTranslations,
  });

  return {
    pageKey,
    cmsPageId: pageKey ? undefined : input.cmsPageId,
    meta: coalesced.meta,
    translations: coalesced.translations,
    cmsSeoMetaIdToRetire: coalesced.cmsSeoMetaIdToRetire,
  };
}

/** Whether a localized SEO field is persisted in EntityTranslation (not a CMS fallback). */
export function isSavedSeoTranslation(
  translations: Record<string, string> | undefined,
  field: (typeof SEO_TRANSLATION_FIELDS)[number],
  localeCode: string,
): boolean {
  const suffix =
    localeCode === "en" ? "En" : localeCode === "ar" ? "Ar" : `_${localeCode}`;
  const key = `${field}${suffix}`;
  return Boolean(translations?.[key]?.trim());
}

export { SEO_TRANSLATION_FIELDS };
