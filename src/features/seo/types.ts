import type { SeoMeta } from "@prisma/client";
import type { Locale } from "@/i18n/routing";

export type SeoResolveInput = {
  locale: Locale;
  path: string;
  pageKey?: string;
  entityType?: string;
  entityId?: string;
  seoMeta?: SeoMeta | null;
  fallback: { title: string; description: string };
  ogImage?: string;
  /** Per language code (`en`, `ar`, …) when slugs differ by locale. */
  slugByLocale?: Record<string, string>;
};

export type SeoGlobalConfig = {
  additionalDisallow?: string[];
  additionalAllow?: string[];
  host?: string;
};

export type SeoStructuredConfig = {
  organization?: Record<string, unknown>;
  website?: Record<string, unknown>;
};

export type SeoIntegrationProviderId = "google" | "bing" | "indexnow";

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
};

export type SeoIntegrationsConfig = {
  google?: SeoIntegrationProviderConfig;
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
