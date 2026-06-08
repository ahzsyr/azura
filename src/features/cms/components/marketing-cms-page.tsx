import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import type { CmsPage } from "@prisma/client";
import { cmsService } from "@/features/cms/cms.service";
import { CmsPageRenderer } from "./cms-page-renderer";

type Props = {
  slug: string;
  locale: Locale;
  /** @deprecated Unused — empty pages render a blank shell when blocks are empty. */
  fallback?: React.ReactNode;
  /** When provided, skips a second CMS page fetch (e.g. packages route). */
  page?: CmsPage | null;
};

export async function MarketingCmsPage({ slug, locale, page: pageProp }: Props) {
  const page =
    pageProp !== undefined && pageProp !== null
      ? pageProp
      : await cmsService.resolveMarketingPage(slug);
  if (!page) {
    notFound();
  }
  return <CmsPageRenderer slug={slug} locale={locale} page={page} />;
}
