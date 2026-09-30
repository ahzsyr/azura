import "server-only";

import { createCached } from "@/services/cache";
import { localeService } from "@/features/i18n/locale.service";
import { buildCanonicalUrl, buildHreflangAlternates, normalizeStoredCanonicalUrl } from "@/i18n/seo-helpers";
import { resolvePrefixToCode } from "@/i18n/locale-config";
import { getFallbackDefaultLocalePrefix } from "@/i18n/url-helpers";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import { getCompanyInfo } from "@/lib/data";
import { isArabicLocale } from "@/shared/layout/direction/direction-resolver";
import { composeDocumentTitle } from "@/lib/compose-document-title";
import { sanitizeMetadataAbsoluteUrl } from "@/lib/metadata/absolute-url";
import { resolvePageSeoContext } from "@/features/seo/resolve-page-seo-context";
import { resolveEffectiveSeoForLocale } from "@/features/seo/resolve-page-seo-for-locale";
import { parseMarketingPath } from "@/features/seo/platform/schema-pipeline/context/parse-marketing-path";
import { buildStructuredDataResult } from "@/features/seo/components/structured-data-graph";
import { productsDataService } from "@/features/products/products-data.service";
import { cmsService } from "@/features/cms/cms.service";
import { resolveProductPrimaryImageUrl } from "@/features/products/lib/product-primary-image";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { DEFAULT_ROBOTS } from "@/features/seo/constants";
import { CACHE_TAGS } from "@/services/cache";
import { seoRepository } from "@/repositories/seo.repository";
import type { SeoAppearanceConfig } from "@/features/seo/types";
import type {
  ResolvedSeoDocument,
  SeoDocumentResolveInput,
  SeoHttpStatus,
  SeoOpenGraphArticle,
} from "./seo-document";
import { resolveCanonical } from "./seo-canonical";
import { resolveRobots } from "./seo-robots";
import {
  buildSocialTitle,
  resolveOpenGraph,
  resolveTwitter,
} from "./seo-social";
import { resolveGlobalDefaultSocialImage, resolveSeoImage } from "./seo-image";
import {
  extractPathnameFromUrl,
  mapParsedPathToSeoInput,
  type SeoUrlContextInput,
} from "./seo-url-parser";
import {
  DEFAULT_SEO_TEMPLATES,
  resolveSeoTemplate,
  resolveTemplateTypeFromPageType,
  type SeoTemplateContext,
  type SeoTemplateType,
} from "./seo-templates";
import { isIndexableSeoDocument } from "./is-indexable-seo-document";

function extractSearchPhrase(url: string, pageType: string): string | undefined {
  if (pageType !== "search" && !url.includes("/search")) return undefined;
  try {
    const phrase = new URL(url).searchParams.get("q")?.trim();
    return phrase || undefined;
  } catch {
    return undefined;
  }
}

function resolveTemplateType(
  pageType: string,
  pageKey: string | undefined,
  status: SeoHttpStatus,
): SeoTemplateType {
  if (status === 404) return "404";
  return resolveTemplateTypeFromPageType(pageType, pageKey);
}

function buildTemplateContext(input: {
  title: string;
  description: string;
  siteName: string;
  tagline?: string;
  searchPhrase?: string;
  termTitle?: string;
  author?: string;
  category?: string;
  brand?: string;
  page?: string;
  date?: string;
}): SeoTemplateContext {
  return {
    title: input.title,
    postname: input.title,
    sitename: input.siteName,
    sep: "|",
    tagline: input.tagline,
    excerpt: input.description,
    searchPhrase: input.searchPhrase,
    termTitle: input.termTitle ?? input.title,
    author: input.author,
    category: input.category,
    brand: input.brand,
    page: input.page,
    date: input.date,
  };
}

function extractTwitterHandle(socialLinks: unknown): string | undefined {
  if (!socialLinks || typeof socialLinks !== "object") return undefined;
  const links = socialLinks as Record<string, unknown>;
  for (const key of ["twitter", "x", "Twitter", "X"]) {
    const raw = links[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const match = raw.match(/(?:twitter\.com|x\.com)\/(@?[\w]+)/i) ?? raw.match(/^@?([\w]+)$/);
    if (match?.[1]) return match[1].startsWith("@") ? match[1] : `@${match[1]}`;
  }
  return undefined;
}

async function resolveHttpStatus(
  parsed: SeoUrlContextInput,
): Promise<SeoHttpStatus> {
  if (parsed.pageType === "product" && parsed.slug) {
    const loaded = await productsDataService.getProduct(parsed.localePrefix, parsed.slug);
    return loaded ? 200 : 404;
  }
  if (parsed.pageType === "blog" && parsed.slug) {
    const { loadPublicLocaleContext } = await import("@/features/i18n/public-locale-context");
    const { languageCode } = await loadPublicLocaleContext(parsed.localePrefix);
    const post = await cmsService.resolvePublishedPost(parsed.slug, languageCode);
    return post ? 200 : 404;
  }
  if (parsed.pageType === "cms" && parsed.slug) {
    const page = await cmsService.getPublishedPageBySlug(parsed.slug);
    return page ? 200 : 404;
  }
  return 200;
}

async function loadSlugByLocale(
  parsed: SeoUrlContextInput,
): Promise<Record<string, string> | undefined> {
  if (parsed.pageType === "product" && parsed.slug) {
    const enabledLocales = await localeService.listEnabled();
    return productsDataService.getProductSlugAlternates(parsed.slug, enabledLocales);
  }
  return undefined;
}

async function loadImageSources(
  parsed: SeoUrlContextInput,
  effectiveOgImage: string | undefined,
  siteUrl: string,
) {
  const globalDefault = resolveGlobalDefaultSocialImage(siteUrl);
  let featuredImage: string | undefined;
  let contentImage: string | undefined;

  if (parsed.pageType === "product" && parsed.slug) {
    const loaded = await productsDataService.getProduct(parsed.localePrefix, parsed.slug);
    if (loaded) {
      featuredImage = resolveProductPrimaryImageUrl(loaded.product);
      contentImage = featuredImage;
    }
  }

  if (parsed.pageType === "blog" && parsed.slug) {
    const { loadPublicLocaleContext } = await import("@/features/i18n/public-locale-context");
    const { languageCode } = await loadPublicLocaleContext(parsed.localePrefix);
    const post = await cmsService.resolvePublishedPost(parsed.slug, languageCode);
    featuredImage = post?.featuredImage?.url ?? undefined;
  }

  return resolveSeoImage(
    {
      pageSocialImage: effectiveOgImage,
      featuredImage,
      contentImage,
      globalDefaultImage: globalDefault,
    },
    siteUrl,
  );
}

function inferPageTypeFromIdentity(input: Extract<SeoDocumentResolveInput, { locale: string }>): string {
  if (input.pageKey === "search" || input.path === "/search") return "search";
  if (input.pageKey?.startsWith("product:") || input.path?.startsWith("/products/")) return "product";
  if (input.pageKey?.startsWith("brand:") || input.path?.startsWith("/brands/")) return "brand";
  if (input.pageKey?.startsWith("tag:") || input.path?.startsWith("/tags/")) return "tag";
  if (input.pageKey?.startsWith("category:") || input.path?.startsWith("/categories/")) return "collection";
  if (input.postId || input.path?.startsWith("/blog/")) return "blog";
  if (input.cmsPageId || input.path?.startsWith("/pages/")) return "cms";
  if (input.pageKey === "home" || input.path === "/" || input.path === "") return "static";
  return "static";
}

async function resolveDocumentUncached(
  input: SeoDocumentResolveInput,
): Promise<ResolvedSeoDocument> {
  const siteOrigin = (await resolveSiteOrigin("public")).replace(/\/$/, "");
  const [enabledLocales, siteIdentity, company, appearanceConfig] = await Promise.all([
    localeService.listEnabled(),
    resolveSiteIdentityFromDb(),
    getCompanyInfo().catch(() => null),
    seoRepository.getAppearanceConfig().catch(() => ({} as SeoAppearanceConfig)),
  ]);

  const defaultPrefix =
    enabledLocales.find((l) => l.isDefault)?.urlPrefix ?? getFallbackDefaultLocalePrefix();

  let parsed: SeoUrlContextInput;
  let absoluteUrl: string;
  let status: SeoHttpStatus = 200;

  if ("url" in input) {
    const pathname = extractPathnameFromUrl(input.url, siteOrigin);
    const prefixes = enabledLocales.map((l) => l.urlPrefix);
    const marketingPath = parseMarketingPath(pathname, prefixes, defaultPrefix);
    if (!marketingPath) {
      return {
        url: input.url,
        status: 404,
        identity: {
          pageType: "unknown",
          localePrefix: defaultPrefix,
          languageCode: "en",
          publicPath: pathname,
        },
        indexable: false,
        openGraph: {
          title: siteIdentity.brandName,
          siteName: siteIdentity.brandName,
        },
      };
    }
    parsed = mapParsedPathToSeoInput(marketingPath);
    absoluteUrl = input.url;
    status = await resolveHttpStatus(parsed);
  } else {
    const localePrefix = input.locale;
    const publicPath =
      !input.path || input.path === "" || input.path === "/"
        ? "/"
        : input.path.startsWith("/")
          ? input.path
          : `/${input.path}`;
    const pageType = inferPageTypeFromIdentity(input);
    parsed = {
      localePrefix,
      publicPath,
      pageType,
      pageKey: input.pageKey,
      slug: input.slug ?? input.pageKey?.split(":").slice(1).join(":"),
      cmsPageId: input.cmsPageId,
      postId: input.postId,
      packageId: input.packageId,
      contentItemId: input.contentItemId,
      entityType: input.entityType,
      entityId: input.entityId,
      originContext: "public",
      allowWrites: false,
    };
    status = input.status ?? 200;
    absoluteUrl = buildCanonicalUrl(siteOrigin, localePrefix, publicPath, undefined, defaultPrefix);
  }

  const seoContext = await resolvePageSeoContext({
    pageKey: parsed.pageKey,
    cmsPageId: parsed.cmsPageId,
    postId: parsed.postId,
    packageId: parsed.packageId,
    contentItemId: parsed.contentItemId,
    entityType: parsed.entityType,
    entityId: parsed.entityId,
    slug: parsed.slug,
    originContext: "public",
    allowWrites: false,
  });

  const effective = await resolveEffectiveSeoForLocale(seoContext, parsed.localePrefix, {
    ogImage: "ogImage" in input ? input.ogImage : undefined,
  });

  const searchPhrase = extractSearchPhrase(absoluteUrl, parsed.pageType);
  const templateContext = buildTemplateContext({
    title: effective.title || ("fallback" in input ? input.fallback?.title : undefined) || "",
    description:
      effective.description ||
      ("fallback" in input ? input.fallback?.description : undefined) ||
      "",
    siteName: siteIdentity.brandName,
    tagline: siteIdentity.tagline,
    searchPhrase,
    termTitle: effective.title || parsed.pageKey || "",
  });
  const templateType = resolveTemplateType(
    parsed.pageType,
    parsed.pageKey ?? seoContext.identity.pageKey,
    status,
  );
  const appearanceEntry = appearanceConfig[templateType];
  const titleTemplate =
    appearanceEntry?.titleTemplate?.trim() || DEFAULT_SEO_TEMPLATES[templateType];
  const descriptionTemplate = appearanceEntry?.descriptionTemplate?.trim();

  let title =
    effective.title ||
    ("fallback" in input ? input.fallback?.title : undefined) ||
    "";
  if (!title.trim()) {
    title = resolveSeoTemplate(titleTemplate, templateContext);
  }
  const description =
    effective.description ||
    ("fallback" in input ? input.fallback?.description : undefined) ||
    "";
  const resolvedDescription =
    description.trim() ||
    (descriptionTemplate ? resolveSeoTemplate(descriptionTemplate, templateContext) : "");
  const slugByLocale = await loadSlugByLocale(parsed);

  const defaultCanonical = sanitizeMetadataAbsoluteUrl(
    buildCanonicalUrl(
      siteOrigin,
      parsed.localePrefix,
      seoContext.indexing.publicPath || parsed.publicPath,
      slugByLocale?.[parsed.localePrefix],
      defaultPrefix,
    ),
    siteOrigin,
  )!;

  const storedCanonical = normalizeStoredCanonicalUrl(
    effective.canonicalUrl,
    siteOrigin,
    defaultPrefix,
  );

  const templateRobots =
    parsed.pageType === "search" || parsed.pageKey === "search"
      ? "noindex, follow"
      : parsed.publicPath.startsWith("/compare")
        ? "noindex, nofollow"
        : null;

  const robots = resolveRobots({
    visibility: DEFAULT_ROBOTS,
    pageControls: effective.robots ?? seoContext.indexing.robots,
    templateControls: templateRobots,
    status,
  });

  const canonical = resolveCanonical({
    status,
    robots,
    storedCanonical,
    defaultCanonical,
    localePrefixes: enabledLocales.map((locale) => locale.urlPrefix),
  });

  const languageCode = resolvePrefixToCode(parsed.localePrefix, enabledLocales);
  const activeLocale = enabledLocales.find((l) => l.urlPrefix === parsed.localePrefix);
  const htmlLang = activeLocale?.htmlLang;
  const ogLocale =
    htmlLang?.replace("-", "_") ?? (isArabicLocale(parsed.localePrefix) ? "ar_SA" : "en_US");

  const displayTitle = composeDocumentTitle(
    title || "",
    siteIdentity.brandName,
  );
  const socialTitle = buildSocialTitle(
    title || "",
    effective.ogTitle,
    siteIdentity.brandName,
  );

  const primaryImage = await loadImageSources(parsed, effective.ogImage, siteOrigin);
  const images = primaryImage ? [primaryImage] : [];

  let articleMeta: SeoOpenGraphArticle | undefined;
  // twitter:creator deferred — PostAuthor has no X/Twitter handle field (name + avatar only).
  const twitterCreator: string | undefined = undefined;
  if (parsed.pageType === "blog" && parsed.slug && status === 200) {
    const { loadPublicLocaleContext } = await import("@/features/i18n/public-locale-context");
    const { languageCode: lang } = await loadPublicLocaleContext(parsed.localePrefix);
    const post = await cmsService.resolvePublishedPost(parsed.slug, lang);
    if (post) {
      articleMeta = {
        publishedTime: post.publishedAt?.toISOString() ?? post.createdAt.toISOString(),
        modifiedTime: post.updatedAt.toISOString(),
        authors: post.author?.name ? [post.author.name] : undefined,
      };
    }
  }
  if (parsed.pageType === "cms" && parsed.slug && status === 200) {
    const page = await cmsService.getPublishedPageBySlug(parsed.slug);
    if (page) {
      articleMeta = {
        publishedTime: page.publishedAt?.toISOString() ?? page.createdAt.toISOString(),
        modifiedTime: page.updatedAt.toISOString(),
        authors: page.author?.name ? [page.author.name] : undefined,
      };
    }
  }

  const openGraph = resolveOpenGraph({
    status,
    pageType: parsed.pageType,
    pageKey: parsed.pageKey ?? seoContext.identity.pageKey,
    title,
    description: resolvedDescription,
    socialTitle,
    canonical,
    siteName: siteIdentity.brandName,
    ogLocale,
    images,
    article: articleMeta,
  });

  const twitterSite = extractTwitterHandle(company?.socialLinks);
  const twitter = resolveTwitter({
    card: effective.twitterCard ?? "summary_large_image",
    site: twitterSite,
    creator: twitterCreator,
    ogTitle: socialTitle,
    ogDescription: effective.description || undefined,
    ogImage: images[0]?.url,
    seoTitle: displayTitle,
    seoDescription: resolvedDescription,
  });

  const languages = Object.fromEntries(
    Object.entries(
      buildHreflangAlternates(
        seoContext.indexing.publicPath || parsed.publicPath,
        enabledLocales,
        siteOrigin,
        slugByLocale,
      ),
    )
      .map(([lang, href]) => [lang, sanitizeMetadataAbsoluteUrl(href, siteOrigin) ?? href])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );

  const publicPathForSchema =
    !parsed.publicPath || parsed.publicPath === "" || parsed.publicPath === "/"
      ? "/"
      : parsed.publicPath;
  // as-needed: default locale uses unprefixed public path so schema never invents /en for English home
  const pathname =
    parsed.localePrefix === defaultPrefix
      ? publicPathForSchema
      : `/${parsed.localePrefix}${publicPathForSchema === "/" ? "" : publicPathForSchema}`;

  let schemaResult: Awaited<ReturnType<typeof buildStructuredDataResult>> = null;
  try {
    schemaResult = await buildStructuredDataResult({
      pathname,
      canonicalUrl: canonical,
      title,
      description: resolvedDescription,
    });
  } catch (error) {
    console.error("[seo-resolver] structured data build failed:", error);
  }

  const doc: ResolvedSeoDocument = {
    url: absoluteUrl,
    status,
    title: displayTitle,
    pageTitle: title || undefined,
    description: resolvedDescription || undefined,
    canonical,
    robots,
    openGraph,
    twitter,
    alternates: {
      canonical,
      languages,
    },
    focusKeywords: effective.focusKeywords
      ?.split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    htmlLang,
    schema: schemaResult?.graph,
    identity: {
      pageKey: parsed.pageKey ?? seoContext.identity.pageKey,
      cmsPageId: seoContext.identity.cmsPageId,
      postId: seoContext.identity.postId,
      packageId: seoContext.identity.packageId,
      contentItemId: seoContext.identity.contentItemId,
      entityType: seoContext.identity.entityType,
      entityId: seoContext.identity.entityId,
      slug: parsed.slug ?? seoContext.identity.slug,
      pageType: parsed.pageType,
      localePrefix: parsed.localePrefix,
      languageCode,
      publicPath: seoContext.indexing.publicPath || parsed.publicPath,
    },
    indexable: !seoContext.indexing.isNoIndex && status === 200,
  };

  doc.indexable = isIndexableSeoDocument(doc);

  return doc;
}

export async function resolveSeoDocument(
  input: SeoDocumentResolveInput,
): Promise<ResolvedSeoDocument> {
  const cacheKey =
    "url" in input
      ? `url:${input.url}`
      : `identity:${input.locale}:${input.path ?? ""}:${input.pageKey ?? ""}:${input.slug ?? ""}`;

  return createCached(
    () => resolveDocumentUncached(input),
    ["seo-document", cacheKey],
    { tags: [CACHE_TAGS.seoDocument(cacheKey), "seo-document"] },
  )();
}

export { isIndexableSeoDocument } from "./is-indexable-seo-document";
