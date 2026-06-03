import type { Locale } from "@/i18n/routing";
import { cmsService } from "@/features/cms/cms.service";
import { CmsPageRenderer } from "./cms-page-renderer";
import type { PageBlocks } from "@/types/builder";

type Props = {
  slug: string;
  locale: Locale;
  fallback: React.ReactNode;
};

export async function MarketingCmsPage({ slug, locale, fallback }: Props) {
  const page = await cmsService.getPublishedPageBySlug(slug);
  const blocks = (page?.blocks as PageBlocks) ?? [];
  if (page && blocks.length > 0) {
    return <CmsPageRenderer slug={slug} locale={locale} page={page} />;
  }
  if (page && blocks.length === 0 && (page.excerptEn || page.excerptAr)) {
    return <CmsPageRenderer slug={slug} locale={locale} page={page} />;
  }
  return <>{fallback}</>;
}
