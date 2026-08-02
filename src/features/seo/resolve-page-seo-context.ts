import { prisma } from "@/lib/prisma";
import type { SeoMeta } from "@prisma/client";
import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import {
  coalesceWiredPageSeo,
  getCmsPageSeoPageKey,
  resolveStaticPageSeoMaps,
} from "@/features/seo/cms-page-seo-context";
import {
  DEFAULT_ROBOTS,
  getStaticSeoPage,
  isStaticSeoPageKey,
  STATIC_SEO_PAGES,
  type StaticSeoPageKey,
} from "@/features/seo/constants";
import type {
  PageSeoContentFallbacks,
  PageSeoContext,
  PageSeoResolveInput,
} from "@/features/seo/page-seo-context.types";
import { isSeoWriteAllowed } from "@/features/seo/page-seo-context.types";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import {
  ensureStaticSeoMetaRecords,
  mergeWiredPageSeoForSlug,
} from "@/features/seo/seo-static.service";
import { isNoIndex } from "@/lib/seo";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation";
import { seoRepository } from "@/repositories/seo.repository";
import { translationService } from "@/features/translation/translation.service";

const SEO_FIELDS = ["metaTitle", "metaDescription", "ogTitle", "ogDescription"] as const;

const EMPTY_FALLBACKS: PageSeoContentFallbacks = {
  titleEn: "",
  titleAr: "",
  descEn: "",
  descAr: "",
};

function emptyContext(
  identity: PageSeoContext["identity"],
  writeTarget: PageSeoContext["writeTarget"],
  publicPath: string,
  origin: string,
  contentFallbacks: PageSeoContentFallbacks = EMPTY_FALLBACKS,
): PageSeoContext {
  return {
    identity,
    writeTarget,
    meta: null,
    translations: {},
    savedTranslations: {},
    contentFallbacks,
    origin,
    indexing: {
      robots: DEFAULT_ROBOTS,
      isNoIndex: false,
      publicPath,
    },
  };
}

async function loadCmsContentFallbacks(cmsPageId: string): Promise<PageSeoContentFallbacks> {
  const rows = await translationService.getForEntity("CmsPage", cmsPageId);
  const shape = legacyShapeFromTranslations(rows, ["title", "excerpt"]);
  return {
    titleEn: shape.titleEn ?? "",
    titleAr: shape.titleAr ?? "",
    descEn: shape.excerptEn ?? "",
    descAr: shape.excerptAr ?? "",
  };
}

async function loadPostContentFallbacks(postId: string): Promise<PageSeoContentFallbacks> {
  const rows = await translationService.getForEntity("Post", postId);
  const shape = legacyShapeFromTranslations(rows, ["title", "excerpt"]);
  return {
    titleEn: shape.titleEn ?? "",
    titleAr: shape.titleAr ?? "",
    descEn: shape.excerptEn ?? "",
    descAr: shape.excerptAr ?? "",
  };
}

function staticLabelFallbacks(pageKey: string): PageSeoContentFallbacks {
  const page = getStaticSeoPage(pageKey as StaticSeoPageKey);
  const label = page?.label ?? pageKey;
  return { titleEn: label, titleAr: label, descEn: "", descAr: "" };
}

async function loadContentItemContentFallbacks(contentItemId: string): Promise<PageSeoContentFallbacks> {
  const rows = await translationService.getForEntity("ContentItem", contentItemId);
  const shape = legacyShapeFromTranslations(rows, [
    "title",
    "description",
    "seoTitle",
    "seoDescription",
    "shortDescription",
  ]);
  return {
    titleEn: shape.seoTitleEn?.trim() || shape.titleEn || "",
    titleAr: shape.seoTitleAr?.trim() || shape.titleAr || "",
    descEn:
      shape.seoDescriptionEn?.trim() ||
      shape.shortDescriptionEn?.trim() ||
      shape.descriptionEn?.slice(0, 160) ||
      "",
    descAr:
      shape.seoDescriptionAr?.trim() ||
      shape.shortDescriptionAr?.trim() ||
      shape.descriptionAr?.slice(0, 160) ||
      "",
  };
}

function normalizeSeoEntityType(entityType?: string): string | undefined {
  if (!entityType) return undefined;
  if (entityType === "CONTENT_ITEM") return "ContentItem";
  return entityType;
}

function resolveContentItemPublicPath(
  item: {
    slug: string | null;
    attributes: unknown;
    contentType: { routePrefix: string | null; slug: string };
  },
): string {
  const slug = item.slug?.trim();
  const prefix = item.contentType.routePrefix?.trim();
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;
  const ctaHref = typeof attrs.ctaHref === "string" ? attrs.ctaHref.trim() : "";

  if (item.contentType.slug === "offerings" && ctaHref) {
    return ctaHref.startsWith("/") ? ctaHref : `/${ctaHref}`;
  }
  if (!prefix) return "";
  if (item.contentType.slug === "catalog-items" && slug) return `/packages/${slug}`;
  if (slug) return `/${prefix}/${slug}`;
  return `/${prefix}`;
}

function resolvePublicPath(pageKey?: string, slug?: string): string {
  if (pageKey) {
    const staticPage = getStaticSeoPage(pageKey as StaticSeoPageKey);
    if (staticPage) return staticPage.path || "/";
  }
  if (slug) return getCmsPagePublicPath(slug);
  return "";
}

function publicPathFromEntityPageKey(pageKey: string): string {
  const [prefix, ...rest] = pageKey.split(":");
  const slug = rest.join(":").trim();
  if (!slug) return "";
  if (prefix === "product") return `/products/${slug}`;
  if (prefix === "brand") return `/brands/${slug}`;
  if (prefix === "collection") return `/collections/${slug}`;
  if (prefix === "tag") return `/tags/${slug}`;
  if (prefix === "category") return `/categories/${slug}`;
  return "";
}

function buildIndexing(meta: SeoMeta | null, publicPath: string): PageSeoContext["indexing"] {
  const robots = meta?.robots?.trim() || DEFAULT_ROBOTS;
  return {
    robots,
    isNoIndex: isNoIndex(robots),
    publicPath,
  };
}

async function resolveWiredPageKeyContext(
  pageKey: string,
  origin: string,
  cmsPageIdHint?: string,
  allowWrites = false,
): Promise<PageSeoContext> {
  if (allowWrites) {
    await ensureStaticSeoMetaRecords();
  }

  const cmsPage = await prisma.cmsPage.findUnique({
    where: { slug: pageKey },
    include: { seoMeta: true },
  });

  let pageKeyMeta = await seoRepository.getByPageKey(pageKey);
  if (!pageKeyMeta && allowWrites) {
    pageKeyMeta = await seoRepository.upsertMetaByPageKey(pageKey, {
      canonicalUrl: null,
      robots: DEFAULT_ROBOTS,
      focusKeywords: null,
      ogImageUrl: null,
      twitterCard: "summary_large_image",
    });
  }

  const cmsMeta = cmsPage?.seoMeta ?? null;

  const [pageKeyTranslationRows, cmsSeoTranslationRows] = await Promise.all([
    pageKeyMeta
      ? translationService.getForEntity("SeoMeta", pageKeyMeta.id)
      : Promise.resolve([]),
    cmsMeta ? translationService.getForEntity("SeoMeta", cmsMeta.id) : Promise.resolve([]),
  ]);

  const pageKeyTranslations = legacyShapeFromTranslations(pageKeyTranslationRows, [...SEO_FIELDS]);
  const cmsSeoTranslations = legacyShapeFromTranslations(cmsSeoTranslationRows, [...SEO_FIELDS]);

  const coalesced = coalesceWiredPageSeo({
    pageKey,
    pageKeyMeta,
    cmsSeoMeta: cmsMeta,
    pageKeyTranslations,
    cmsTranslations: cmsSeoTranslations,
  });

  const contentFallbacks = cmsPage
    ? await loadCmsContentFallbacks(cmsPage.id)
    : staticLabelFallbacks(pageKey);

  const publicPath = resolvePublicPath(pageKey, pageKey);

  if (!pageKeyMeta) {
    return {
      identity: {
        pageKey,
        cmsPageId: cmsPageIdHint ?? cmsPage?.id,
        slug: pageKey,
      },
      writeTarget: { pageKey },
      meta: coalesced.meta,
      translations: coalesced.translations,
      savedTranslations: {},
      contentFallbacks,
      origin,
      indexing: buildIndexing(coalesced.meta, publicPath),
    };
  }

  let canonicalMetaAfterMerge: SeoMeta | null | undefined;
  let canonicalTranslationsAfterMerge: Record<string, string> | undefined;

  if (allowWrites && coalesced.cmsSeoMetaIdToRetire) {
    await mergeWiredPageSeoForSlug(pageKey);
    canonicalMetaAfterMerge = await seoRepository.getByPageKey(pageKey);
    const canonicalTranslationRows = canonicalMetaAfterMerge
      ? await translationService.getForEntity("SeoMeta", canonicalMetaAfterMerge.id)
      : [];
    canonicalTranslationsAfterMerge = legacyShapeFromTranslations(
      canonicalTranslationRows,
      [...SEO_FIELDS],
    );
    pageKeyMeta = canonicalMetaAfterMerge ?? pageKeyMeta;
  }

  const resolved = resolveStaticPageSeoMaps({
    pageKey,
    pageKeyMeta,
    cmsSeoMeta: allowWrites && coalesced.cmsSeoMetaIdToRetire ? null : cmsMeta,
    pageKeyTranslations,
    cmsSeoTranslations,
    canonicalMetaAfterMerge,
    canonicalTranslationsAfterMerge,
  });

  return {
    identity: {
      pageKey,
      cmsPageId: cmsPageIdHint ?? cmsPage?.id,
      slug: pageKey,
    },
    writeTarget: { pageKey },
    meta: resolved.meta,
    translations: resolved.translations,
    savedTranslations: resolved.savedTranslations,
    contentFallbacks,
    origin,
    indexing: buildIndexing(resolved.meta, publicPath),
  };
}

async function resolveCmsPageIdContext(
  cmsPageId: string,
  origin: string,
  allowWrites = false,
): Promise<PageSeoContext> {
  const cmsPage = await prisma.cmsPage.findUnique({
    where: { id: cmsPageId },
    include: { seoMeta: true },
  });
  if (!cmsPage) {
    return emptyContext({ cmsPageId }, { cmsPageId }, `/pages/unknown`, origin);
  }

  const wiredPageKey = getCmsPageSeoPageKey(cmsPage.slug);
  if (wiredPageKey) {
    return resolveWiredPageKeyContext(wiredPageKey, origin, cmsPageId, allowWrites);
  }

  const cmsMeta = cmsPage.seoMeta;
  const cmsSeoTranslationRows = cmsMeta
    ? await translationService.getForEntity("SeoMeta", cmsMeta.id)
    : [];
  const translations = legacyShapeFromTranslations(cmsSeoTranslationRows, [...SEO_FIELDS]);
  const contentFallbacks = await loadCmsContentFallbacks(cmsPageId);
  const publicPath = getCmsPagePublicPath(cmsPage.slug);

  return {
    identity: { cmsPageId, slug: cmsPage.slug },
    writeTarget: { cmsPageId },
    meta: cmsMeta,
    translations,
    savedTranslations: translations,
    contentFallbacks,
    origin,
    indexing: buildIndexing(cmsMeta, publicPath),
  };
}

async function resolvePostContext(postId: string, origin: string): Promise<PageSeoContext> {
  const meta = await seoRepository.getByPostId(postId);
  const translationRows = meta
    ? await translationService.getForEntity("SeoMeta", meta.id)
    : [];
  const translations = legacyShapeFromTranslations(translationRows, [...SEO_FIELDS]);
  const contentFallbacks = await loadPostContentFallbacks(postId);
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { slug: true },
  });
  const publicPath = post?.slug ? `/blog/${post.slug}` : "/blog";

  return {
    identity: { postId, slug: post?.slug ?? undefined },
    writeTarget: { postId },
    meta,
    translations,
    savedTranslations: translations,
    contentFallbacks,
    origin,
    indexing: buildIndexing(meta, publicPath),
  };
}

async function resolvePackageContext(packageId: string, origin: string): Promise<PageSeoContext> {
  const meta = await seoRepository.getByEntity("PACKAGE", packageId);
  const translationRows = meta
    ? await translationService.getForEntity("SeoMeta", meta.id)
    : [];
  const translations = legacyShapeFromTranslations(translationRows, [...SEO_FIELDS]);

  return {
    identity: { packageId, entityType: "PACKAGE", entityId: packageId },
    writeTarget: { packageId },
    meta,
    translations,
    savedTranslations: translations,
    contentFallbacks: EMPTY_FALLBACKS,
    origin,
    indexing: buildIndexing(meta, "/packages"),
  };
}

async function resolveContentItemContext(contentItemId: string, origin: string): Promise<PageSeoContext> {
  const item = await prisma.contentItem.findUnique({
    where: { id: contentItemId },
    include: { contentType: true },
  });
  if (!item) {
    return emptyContext(
      { contentItemId, entityType: "ContentItem", entityId: contentItemId },
      { contentItemId },
      "",
      origin,
    );
  }

  const entityType = "ContentItem";
  const meta = await seoRepository.getByEntity(entityType, contentItemId);
  const translationRows = meta
    ? await translationService.getForEntity("SeoMeta", meta.id)
    : [];
  const translations = legacyShapeFromTranslations(translationRows, [...SEO_FIELDS]);
  const contentFallbacks = await loadContentItemContentFallbacks(contentItemId);
  const publicPath = resolveContentItemPublicPath(item);

  return {
    identity: { contentItemId, entityType, entityId: contentItemId },
    writeTarget: { contentItemId },
    meta,
    translations,
    savedTranslations: translations,
    contentFallbacks,
    origin,
    indexing: buildIndexing(meta, publicPath),
  };
}

async function resolveEntityContext(
  entityType: string,
  entityId: string,
  pageKey: string | undefined,
  origin: string,
): Promise<PageSeoContext> {
  const normalizedType = normalizeSeoEntityType(entityType) ?? entityType;

  if (normalizedType === "ContentItem" && entityId) {
    return resolveContentItemContext(entityId, origin);
  }

  if (pageKey) {
    const meta = await seoRepository.getByPageKey(pageKey);
    const translationRows = meta
      ? await translationService.getForEntity("SeoMeta", meta.id)
      : [];
    const translations = legacyShapeFromTranslations(translationRows, [...SEO_FIELDS]);
    const publicPath = publicPathFromEntityPageKey(pageKey);
    return {
      identity: { pageKey, entityType: normalizedType, entityId },
      writeTarget: { pageKey },
      meta,
      translations,
      savedTranslations: translations,
      contentFallbacks: EMPTY_FALLBACKS,
      origin,
      indexing: buildIndexing(meta, publicPath),
    };
  }

  const meta = await seoRepository.getByEntity(normalizedType, entityId);
  const translationRows = meta
    ? await translationService.getForEntity("SeoMeta", meta.id)
    : [];
  const translations = legacyShapeFromTranslations(translationRows, [...SEO_FIELDS]);

  return {
    identity: { entityType: normalizedType, entityId },
    writeTarget: {},
    meta,
    translations,
    savedTranslations: translations,
    contentFallbacks: EMPTY_FALLBACKS,
    origin,
    indexing: buildIndexing(meta, ""),
  };
}

/**
 * Single SEO read pipeline — all consumers must use this (or listPageSeoContexts for batch).
 */
export async function resolvePageSeoContext(
  input: PageSeoResolveInput,
): Promise<PageSeoContext> {
  const originContext = input.originContext ?? "admin-preview";
  const allowWrites = isSeoWriteAllowed(input);
  const origin = await resolveSiteOrigin(originContext);

  if (input.pageKey && isStaticSeoPageKey(input.pageKey)) {
    return await resolveWiredPageKeyContext(input.pageKey, origin, undefined, allowWrites);
  }

  if (input.pageKey) {
    return await resolveEntityContext(input.entityType ?? "", input.entityId ?? "", input.pageKey, origin);
  }

  if (input.cmsPageId) {
    return await resolveCmsPageIdContext(input.cmsPageId, origin, allowWrites);
  }

  if (input.postId) {
    return await resolvePostContext(input.postId, origin);
  }

  if (input.packageId) {
    return await resolvePackageContext(input.packageId, origin);
  }

  if (input.contentItemId) {
    return await resolveContentItemContext(input.contentItemId, origin);
  }

  if (input.entityType && input.entityId) {
    return await resolveEntityContext(
      normalizeSeoEntityType(input.entityType) ?? input.entityType,
      input.entityId,
      undefined,
      origin,
    );
  }

  if (input.slug) {
    const cmsPage = await prisma.cmsPage.findFirst({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (cmsPage) {
      return await resolveCmsPageIdContext(cmsPage.id, origin);
    }
    const wiredKey = getCmsPageSeoPageKey(input.slug);
    if (wiredKey) {
      return await resolveWiredPageKeyContext(wiredKey, origin, undefined, allowWrites);
    }
  }

  return emptyContext({}, {}, "", origin);
}

/** Batch static page contexts — parallel resolvePageSeoContext, no separate coalesce path. */
export async function listPageSeoContexts(
  pageKeys: StaticSeoPageKey[],
  options?: { allowWrites?: boolean },
): Promise<Record<string, PageSeoContext>> {
  if (options?.allowWrites) {
    await ensureStaticSeoMetaRecords();
  }
  const entries = await Promise.all(
    pageKeys.map(async (pageKey) => {
      const context = await resolvePageSeoContext({
        pageKey,
        allowWrites: options?.allowWrites,
        originContext: options?.allowWrites ? "admin-preview" : "public",
      });
      return [pageKey, context] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** Localized URLs for wired static pages (publish triggers). */
export async function localizedStaticUrlsFromContext(pageKey: StaticSeoPageKey): Promise<string[]> {
  const context = await resolvePageSeoContext({
    pageKey,
    originContext: "public",
  });
  const { localeService } = await import("@/features/i18n/locale.service");
  const locales = await localeService.listEnabled().catch(() => []);
  const prefixes = locales.length ? locales.map((l) => l.urlPrefix) : ["en"];
  const base = context.origin.replace(/\/$/, "");
  const path = context.indexing.publicPath;
  return prefixes.map((prefix) => `${base}/${prefix}${path}`);
}
