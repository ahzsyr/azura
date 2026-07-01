import type { PageSeoContext } from "@/features/seo/page-seo-context.types";
import { siteOriginToDomain } from "@/features/seo/resolve-site-origin";

export type SeoMetaFormPropsFromContext = {
  pageKey?: string;
  cmsPageId?: string;
  postId?: string;
  packageId?: string;
  meta: PageSeoContext["meta"];
  translations: Record<string, string>;
  savedTranslations: Record<string, string>;
  defaultTitleEn: string;
  defaultTitleAr: string;
  defaultDescEn: string;
  defaultDescAr: string;
  previewOrigin: string;
};

/** Maps canonical PageSeoContext to SeoMetaForm / SeoMetaPanel props. */
export function toSeoMetaFormProps(context: PageSeoContext): SeoMetaFormPropsFromContext {
  const { contentFallbacks, writeTarget } = context;
  return {
    pageKey: writeTarget.pageKey,
    cmsPageId: writeTarget.cmsPageId,
    postId: writeTarget.postId,
    packageId: writeTarget.packageId,
    meta: context.meta,
    translations: context.translations,
    savedTranslations: context.savedTranslations,
    defaultTitleEn: contentFallbacks.titleEn,
    defaultTitleAr: contentFallbacks.titleAr,
    defaultDescEn: contentFallbacks.descEn,
    defaultDescAr: contentFallbacks.descAr,
    previewOrigin: siteOriginToDomain(context.origin),
  };
}
