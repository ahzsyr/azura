import type { Locale } from "@/i18n/routing";

export type SeoResolveInput = {
  locale: Locale;
  path?: string;
  pageKey?: string;
  cmsPageId?: string;
  postId?: string;
  packageId?: string;
  entityType?: string;
  entityId?: string;
  slug?: string;
  /** @deprecated Use PageSeoContext content fallbacks via resolver. */
  fallback?: { title: string; description: string };
  ogImage?: string;
  /** Per language code (`en`, `ar`, …) when slugs differ by locale. */
  slugByLocale?: Record<string, string>;
};

export type SeoGlobalConfig = {
  additionalDisallow?: string[];
  additionalAllow?: string[];
  host?: string;
};

/** Manual sitemap overrides stored in JsonStore `seo-sitemap`. */
export type SeoSitemapConfig = {
  /**
   * Paths or absolute URLs excluded from the sitemap.
   * - Path (e.g. `/favorites`) → removes that page for every locale
   * - Absolute `http(s)://` URL → removes that exact URL only
   */
  excludePaths?: string[];
  /**
   * Paths or absolute URLs always included.
   * - Path starting with `/` → one entry per enabled locale
   * - Absolute `http(s)://` URL → single entry as-is
   */
  extraPaths?: string[];
};

/** Serializable sitemap row for admin preview. */
export type SeoSitemapPreviewEntry = {
  url: string;
  lastModified?: string;
  changeFrequency?: string;
  priority?: number;
};

export type SeoStructuredConfig = {
  organization?: Record<string, unknown>;
  website?: Record<string, unknown>;
  entityType?: string;
  builderVersions?: Record<string, number>;
  builderFlags?: Record<string, boolean>;
  businessPhotos?: Array<{
    url: string;
    width?: number;
    height?: number;
    caption?: string;
    role: "office" | "warehouse" | "storefront" | "product";
  }>;
};

export type SeoTrackingMode = "gtag" | "gtm";

/** Public-site Google tag / Tag Manager install (JsonStore `seo-tracking`). */
export type SeoTrackingConfig = {
  enabled?: boolean;
  mode?: SeoTrackingMode;
  /** When true, GA4 gtag.js is installed on the public site (independent of GTM). */
  gtagEnabled?: boolean;
  /** When true, GTM container is installed on the public site (independent of GA4). */
  gtmEnabled?: boolean;
  /** GA4 measurement ID, e.g. G-FT9BLK7W1T */
  measurementId?: string;
  /** GTM container ID, e.g. GTM-XXXXXXX */
  gtmContainerId?: string;
  /** Pasted gtag.js head install snippet from Google Analytics. */
  gtagHeadSnippet?: string;
  /** Pasted GTM head install snippet from Google Tag Manager. */
  gtmHeadSnippet?: string;
  /** Pasted GTM body (noscript) install snippet from Google Tag Manager. */
  gtmBodySnippet?: string;
};

export type SeoIntegrationProviderId = "google" | "google_indexing" | "bing" | "indexnow";

export type SeoIntegrationProviderConfig = {
  enabled?: boolean;
  analyticsEnabled?: boolean;
  siteUrl?: string;
  apiKey?: string;
  bearerToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  tokenExpiresAt?: string;
  serviceAccountJson?: string;
  endpoint?: string;
  keyLocation?: string;
  ga4PropertyId?: string;
};

export type SeoIntegrationsConfig = {
  google?: SeoIntegrationProviderConfig;
  google_indexing?: SeoIntegrationProviderConfig;
  bing?: SeoIntegrationProviderConfig;
  indexnow?: SeoIntegrationProviderConfig;
};

export type PublicSeoIntegrationProviderConfig = Omit<
  SeoIntegrationProviderConfig,
  "apiKey" | "bearerToken" | "refreshToken" | "clientSecret" | "serviceAccountJson"
> & {
  hasApiKey?: boolean;
  hasBearerToken?: boolean;
  hasRefreshToken?: boolean;
  hasClientSecret?: boolean;
  hasServiceAccountJson?: boolean;
};

export type PublicSeoIntegrationsConfig = {
  google?: PublicSeoIntegrationProviderConfig;
  google_indexing?: PublicSeoIntegrationProviderConfig;
  bing?: PublicSeoIntegrationProviderConfig;
  indexnow?: PublicSeoIntegrationProviderConfig;
};

export type SeoSubmissionKind = "URL" | "SITEMAP";
export type SeoSubmissionReason =
  | "publish"
  | "unpublish"
  | "delete"
  | "slug"
  | "localized-slug"
  | "metadata"
  | "redirect"
  | "bulk"
  | "sitemap"
  | "structured-data"
  | "manual";

export type SeoProviderHealth = {
  provider: SeoIntegrationProviderId;
  enabled: boolean;
  configured: boolean;
  ok: boolean;
  message: string;
};
