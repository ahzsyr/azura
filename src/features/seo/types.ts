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
