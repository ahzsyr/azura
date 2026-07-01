import type { SeoMeta } from "@prisma/client";

export type PageSeoIdentity = {
  pageKey?: string;
  cmsPageId?: string;
  slug?: string;
  postId?: string;
  packageId?: string;
  entityType?: string;
  entityId?: string;
};

export type PageSeoWriteTarget = {
  pageKey?: string;
  cmsPageId?: string;
  postId?: string;
  packageId?: string;
};

export type PageSeoContentFallbacks = {
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
};

export type PageSeoIndexing = {
  robots: string;
  isNoIndex: boolean;
  publicPath: string;
};

/**
 * Canonical SEO domain read model — single language of the entire SEO system.
 * All consumers must map from this contract; they must not assemble SEO state independently.
 */
export type PageSeoContext = {
  identity: PageSeoIdentity;
  writeTarget: PageSeoWriteTarget;
  meta: SeoMeta | null;
  /** Effective values shown in admin fields (saved SEO + content fallbacks for display). */
  translations: Record<string, string>;
  /** Persisted EntityTranslation only — drives saved-vs-fallback semantics. */
  savedTranslations: Record<string, string>;
  contentFallbacks: PageSeoContentFallbacks;
  origin: string;
  indexing: PageSeoIndexing;
};

export type PageSeoResolveInput = {
  pageKey?: string;
  cmsPageId?: string;
  slug?: string;
  postId?: string;
  packageId?: string;
  entityType?: string;
  entityId?: string;
  /** When true, uses request host for origin (public metadata). */
  originContext?: "admin-preview" | "public";
  /** When false, skips SeoMeta upserts/merges on read (public routes). Defaults from originContext. */
  allowWrites?: boolean;
};

export function isSeoWriteAllowed(input: PageSeoResolveInput): boolean {
  if (input.allowWrites !== undefined) return input.allowWrites;
  return (input.originContext ?? "admin-preview") === "admin-preview";
}
