import type { SchemaGraph } from "@/features/seo/platform/schema-pipeline/types";

export type SeoHttpStatus = 200 | 404 | 410 | 500;

export type SeoImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type SeoRobotsDirective = {
  index: "index" | "noindex";
  follow: "follow" | "nofollow";
  maxSnippet?: string;
  maxImagePreview?: string;
  maxVideoPreview?: string;
};

export type SeoOpenGraphType = "website" | "article" | "profile";

export type SeoOpenGraphArticle = {
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  publisher?: string;
};

export type SeoOpenGraph = {
  locale?: string;
  type?: SeoOpenGraphType;
  title?: string;
  description?: string;
  url?: string;
  siteName?: string;
  images?: SeoImage[];
  article?: SeoOpenGraphArticle;
};

export type SeoTwitter = {
  card?: "summary" | "summary_large_image";
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
};

export type SeoAlternates = {
  canonical?: string;
  languages?: Record<string, string>;
};

export type SeoDocumentIdentity = {
  pageKey?: string;
  cmsPageId?: string;
  postId?: string;
  packageId?: string;
  contentItemId?: string;
  entityType?: string;
  entityId?: string;
  slug?: string;
  pageType: string;
  localePrefix: string;
  languageCode: string;
  publicPath: string;
};

/**
 * Canonical SEO decision model — single source of truth for all SEO outputs.
 * Yoast field names must not appear here; use integrations/yoast serializers.
 */
export type ResolvedSeoDocument = {
  url: string;
  status: SeoHttpStatus;

  title?: string;
  /** Raw page title before site-name composition. */
  pageTitle?: string;
  description?: string;

  canonical?: string;
  robots?: SeoRobotsDirective | null;

  openGraph?: SeoOpenGraph;
  twitter?: SeoTwitter;
  alternates?: SeoAlternates;

  focusKeywords?: string[];
  htmlLang?: string;

  schema?: SchemaGraph;

  identity: SeoDocumentIdentity;
  indexable: boolean;
};

export type SeoDocumentResolveInput =
  | { url: string }
  | {
      locale: string;
      path?: string;
      pageKey?: string;
      cmsPageId?: string;
      postId?: string;
      packageId?: string;
      contentItemId?: string;
      entityType?: string;
      entityId?: string;
      slug?: string;
      status?: SeoHttpStatus;
      ogImage?: string;
      fallback?: { title?: string; description?: string };
    };
