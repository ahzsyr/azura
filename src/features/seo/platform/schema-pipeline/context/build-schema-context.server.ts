import "server-only";

import { headers } from "next/headers";
import { getCompanyInfo } from "@/lib/data";
import {
  loadSiteBrandContext,
  type SiteBrandContext,
} from "@/lib/load-site-brand-context";
import { localeService } from "@/features/i18n/locale.service";
import { seoRepository } from "@/repositories/seo.repository";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { buildCanonicalUrl } from "@/i18n/seo-helpers";
import { normalizeCanonicalForGoogle } from "@/features/seo/core/seo-canonical-google";
import { getFaqSetBySlug } from "@/lib/data";
import { getLocalizedField } from "@/lib/utils";
import { productsDataService } from "@/features/products/products-data.service";
import { cmsService } from "@/features/cms/cms.service";
import { STATIC_SEO_PAGES } from "@/features/seo/constants";
import type {
  BusinessPhotoAsset,
  PageContext,
  RuntimeContext,
  SchemaContext,
  SiteContext,
} from "../types";
import { parseMarketingPath, toLocaleCode } from "./parse-marketing-path";
import { collectFaqFromBlocks, dedupeFaqItems } from "./collect-faq-from-blocks";
import { resolveBreadcrumbs } from "../breadcrumbs/breadcrumb-provider";
import type { SchemaPageOverrides } from "./schema-page-overrides";
import type { PageBlocks } from "@/types/builder";
import { resolvePageSeoContext } from "@/features/seo/resolve-page-seo-context";
import { resolveEffectiveSeoForLocale } from "@/features/seo/resolve-page-seo-for-locale";
import type { ParsedMarketingPath } from "./parse-marketing-path";
import { ensureSearchRuntimeConfig } from "@/capabilities/search/settings/search-runtime";

async function resolvePageJsonLdForSchema(
  parsed: ParsedMarketingPath,
  localePrefix: string,
): Promise<{ pageJsonLd: unknown; seoMetaJsonLdInDatabase: boolean }> {
  const seoContext = await resolvePageSeoContext({
    pageKey: parsed.pageKey,
    slug: parsed.slug,
    originContext: "public",
    allowWrites: false,
  });

  const effective = await resolveEffectiveSeoForLocale(seoContext, localePrefix);
  const hasColumn = Boolean(seoContext.meta?.jsonLd);
  const hasTranslation = Boolean(
    seoContext.savedTranslations?.jsonLd?.trim?.() ||
      (typeof seoContext.savedTranslations?.jsonLd === "string" &&
        seoContext.savedTranslations.jsonLd.trim()),
  );

  return {
    pageJsonLd: effective.jsonLd,
    seoMetaJsonLdInDatabase: hasColumn || hasTranslation,
  };
}

async function resolveFaqSetItems(slug: string, locale: string) {
  const faqSet = await getFaqSetBySlug(slug);
  if (!faqSet?.items.length) return [];
  return faqSet.items.map((item) => ({
    question: getLocalizedField(item, "question", locale),
    answer: getLocalizedField(item, "answer", locale),
  }));
}

function mapBusinessPhotos(config: SiteContext["structuredConfig"]): BusinessPhotoAsset[] {
  return (config.businessPhotos ?? [])
    .filter((photo) => photo.url?.trim())
    .map((photo) => ({
      url: photo.url,
      width: photo.width,
      height: photo.height,
      caption: photo.caption,
      role: photo.role,
    }));
}

export async function buildSchemaContext(
  overrides?: SchemaPageOverrides,
): Promise<SchemaContext | null> {
  // Avoid headers() when pathname is already provided — resolveSeoDocument is
  // wrapped in unstable_cache and must not call request-time APIs.
  let pathname = overrides?.pathname;
  if (!pathname) {
    try {
      const headerStore = await headers();
      pathname = headerStore.get("x-pathname") ?? "/";
    } catch {
      pathname = "/";
    }
  }
  const enabledLocales = await localeService.listEnabled().catch(() => []);
  const prefixes = enabledLocales.map((locale) => locale.urlPrefix);
  const defaultPrefix =
    enabledLocales.find((l) => l.isDefault)?.urlPrefix ?? prefixes[0] ?? "en";
  const parsed = parseMarketingPath(pathname, prefixes, defaultPrefix);
  if (!parsed) return null;

  const locale = toLocaleCode(parsed.localePrefix);
  const [company, brand, structuredConfig, siteOrigin, searchRuntime] = await Promise.all([
    getCompanyInfo().catch(() => null),
    loadSiteBrandContext().catch(
      (): SiteBrandContext => ({
        brandName: "",
        brandShort: "",
        tagline: "",
        logoUrl: "",
      }),
    ),
    seoRepository.getStructuredConfig().catch(() => ({})),
    resolveSiteOrigin("public").catch(() => "https://brt-me.com"),
    ensureSearchRuntimeConfig(parsed.localePrefix).catch(() => null),
  ]);

  if (!company) {
    // Organization schema requires company profile; skip graph rather than crash.
    console.warn("[buildSchemaContext] company profile unavailable; skipping schema context");
    return null;
  }

  const builtCanonical =
    overrides?.canonicalUrl ??
    buildCanonicalUrl(
      siteOrigin.replace(/\/$/, ""),
      parsed.localePrefix,
      parsed.path,
      undefined,
      defaultPrefix,
    );
  const canonicalUrl = normalizeCanonicalForGoogle(builtCanonical, {
    localePrefixes: prefixes,
  });

  const runtime: RuntimeContext = {
    locale,
    localePrefix: parsed.localePrefix,
    canonicalUrl,
    siteOrigin: siteOrigin.replace(/\/$/, ""),
    publicSearchEnabled: Boolean(
      searchRuntime?.general.enabled && searchRuntime.general.globalSearchEnabled,
    ),
    environment:
      process.env.NODE_ENV === "test"
        ? "test"
        : process.env.VERCEL_ENV === "preview"
          ? "preview"
          : "production",
  };

  const site: SiteContext = {
    company,
    brand,
    logoUrl: brand.logoUrl,
    locales: enabledLocales,
    structuredConfig,
    businessPhotos: mapBusinessPhotos(structuredConfig),
  };

  let pageType = overrides?.pageType ?? parsed.pageType;
  let title = overrides?.title ?? "";
  let description = overrides?.description ?? "";
  let faqItems = overrides?.faqItems ?? [];
  let breadcrumbItems = overrides?.breadcrumbItems ?? [];
  let product = overrides?.product;
  let article = overrides?.article;
  let reviews = overrides?.reviews;
  const video = overrides?.video;

  if (parsed.pageType === "faq" && parsed.slug) {
    const faqSet = await getFaqSetBySlug(parsed.slug);
    if (faqSet) {
      title = getLocalizedField(faqSet, "title", locale);
      description =
        getLocalizedField(faqSet, "excerpt", locale) ||
        getLocalizedField(faqSet, "description", locale);
      faqItems = dedupeFaqItems(
        faqSet.items.map((item) => ({
          question: getLocalizedField(item, "question", locale),
          answer: getLocalizedField(item, "answer", locale),
        })),
      );
    }
  }

  if (parsed.pageType === "product" && parsed.slug && !product) {
    const loaded = await productsDataService.getProduct(locale, parsed.slug);
    if (loaded) {
      product = loaded.product;
      const p = loaded.product;
      title = p.title_extended || p.productTitle || p.name || parsed.slug;
      description = p.description || p.short_description || "";
      pageType = "product";
    }
  }

  if (parsed.pageType === "blog" && parsed.slug && !article) {
    const { languageCode } = await import("@/features/i18n/public-locale-context").then((m) =>
      m.loadPublicLocaleContext(locale),
    );
    const post = await cmsService.resolvePublishedPost(parsed.slug, languageCode);
    if (post) {
      title = getLocalizedField(post, "title", locale) || parsed.slug;
      description = getLocalizedField(post, "excerpt", locale) || "";
      article = {
        headline: title,
        datePublished: post.publishedAt?.toISOString() ?? post.createdAt.toISOString(),
        dateModified: post.updatedAt.toISOString(),
        authorName: post.author?.name ?? undefined,
        imageUrl: post.featuredImage?.url ?? undefined,
      };
    }
  }

  if (parsed.pageType === "static" && parsed.pageKey) {
    const staticPage = STATIC_SEO_PAGES.find((page) => page.pageKey === parsed.pageKey);
    title = title || staticPage?.label || parsed.pageKey;
  }

  if (parsed.pageType === "cms" && parsed.slug && !faqItems.length) {
    const page = await cmsService.resolveMarketingPage(parsed.slug);
    if (page) {
      title = getLocalizedField(page, "title", locale) || parsed.slug;
      description = getLocalizedField(page, "excerpt", locale) || "";
      const blocks = page.blocks as PageBlocks | null;
      faqItems = dedupeFaqItems(
        await collectFaqFromBlocks(blocks ?? undefined, (slug) => resolveFaqSetItems(slug, locale)),
      );
    }
  }

  const jsonLdResolution =
    overrides?.pageJsonLd !== undefined
      ? {
          pageJsonLd: overrides.pageJsonLd,
          seoMetaJsonLdInDatabase: overrides.seoMetaJsonLdInDatabase ?? false,
        }
      : await resolvePageJsonLdForSchema(parsed, parsed.localePrefix).catch(() => ({
          pageJsonLd: undefined,
          seoMetaJsonLdInDatabase: false,
        }));

  const page: PageContext = {
    pageType,
    path: parsed.path,
    pageKey: parsed.pageKey,
    title,
    description,
    faqItems,
    breadcrumbItems,
    product,
    article,
    reviews,
    video,
    pageJsonLd: jsonLdResolution.pageJsonLd,
    seoMetaJsonLdInDatabase: jsonLdResolution.seoMetaJsonLdInDatabase,
  };

  const ctx: SchemaContext = { site, page, runtime };
  if (!page.breadcrumbItems.length) {
    try {
      page.breadcrumbItems = resolveBreadcrumbs(ctx);
    } catch (error) {
      console.error("[buildSchemaContext] breadcrumbs failed:", error);
      page.breadcrumbItems = [];
    }
  }

  return ctx;
}
