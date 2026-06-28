import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import type { CmsPage } from "@prisma/client";
import { cmsService } from "@/features/cms/cms.service";
import { CmsPageRenderer } from "./cms-page-renderer";
import { renderCmsDegradationResponse } from "./cms-degradation-response";
import { getErrorMessage, isRecoverableDbError } from "@/lib/debug/recoverable-db-error";

type Props = {
  slug: string;
  locale: Locale;
  /** @deprecated Unused — empty pages render a blank shell when blocks are empty. */
  fallback?: React.ReactNode;
  /** When provided, skips a second CMS page fetch (e.g. packages route). */
  page?: CmsPage | null;
};

export async function MarketingCmsPage({ slug, locale, page: pageProp }: Props) {
  try {
    const page =
      pageProp !== undefined && pageProp !== null
        ? pageProp
        : await cmsService.resolveMarketingPage(slug);
    if (!page) {
      if (slug === "home") {
        return renderCmsDegradationResponse(slug, locale, { skipLive: true });
      }
      notFound();
    }
    return <CmsPageRenderer slug={slug} locale={locale} page={page} />;
  } catch (error) {
    const message = getErrorMessage(error);
    const recoverable = isRecoverableDbError(error);
    console.error(`[MarketingCmsPage] /${slug} render failed:`, message);
    if (recoverable) {
      return renderCmsDegradationResponse(slug, locale, { skipLive: true });
    }
    throw error;
  }
}
