import type { PageSeoContext } from "@/features/seo/page-seo-context.types";
import { siteUrlToDomain } from "@/features/seo/site-url-utils";

export type SeoMetaFormPropsFromContext = {
  pageKey?: string;
  cmsPageId?: string;
  postId?: string;
  packageId?: string;
  contentItemId?: string;
  meta: PageSeoContext["meta"];
  translations: Record<string, string>;
  savedTranslations: Record<string, string>;
  defaultTitleEn: string;
  defaultTitleAr: string;
  defaultDescEn: string;
  defaultDescAr: string;
  previewOrigin: string;
  publicPath: string;
  defaultOgImageUrl?: string;
};

/** Maps canonical PageSeoContext to SeoMetaForm / SeoMetaPanel props. */
export function toSeoMetaFormProps(context: PageSeoContext): SeoMetaFormPropsFromContext {
  const { contentFallbacks, writeTarget } = context;
  return {
    pageKey: writeTarget.pageKey,
    cmsPageId: writeTarget.cmsPageId,
    postId: writeTarget.postId,
    packageId: writeTarget.packageId,
    contentItemId: writeTarget.contentItemId,
    meta: context.meta,
    translations: context.translations,
    savedTranslations: context.savedTranslations,
    defaultTitleEn: contentFallbacks.titleEn,
    defaultTitleAr: contentFallbacks.titleAr,
    defaultDescEn: contentFallbacks.descEn,
    defaultDescAr: contentFallbacks.descAr,
    previewOrigin: siteUrlToDomain(context.origin),
    publicPath: context.indexing.publicPath || "",
  };
}
