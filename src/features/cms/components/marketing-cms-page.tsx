import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import type { CmsPage } from "@prisma/client";
import { cmsService } from "@/features/cms/cms.service";
import { CmsPageRenderer } from "./cms-page-renderer";
import { renderCmsDegradationResponse } from "./cms-degradation-response";
import { logAgentDebug } from "@/lib/debug/agent-session-log.server";
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
  // #region agent log
  logAgentDebug({
    location: "marketing-cms-page.tsx:entry",
    message: "MarketingCmsPage render start",
    data: { slug, locale, hasPageProp: pageProp != null },
    hypothesisId: "C",
    runId: "post-fix",
  });
  // #endregion

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
    // #region agent log
    logAgentDebug({
      location: "marketing-cms-page.tsx:catch",
      message: "MarketingCmsPage render failed",
      data: { slug, locale, errorMessage: message, recoverable },
      hypothesisId: "C",
      runId: "post-fix",
    });
    // #endregion
    console.error(`[MarketingCmsPage] /${slug} render failed:`, message);
    if (recoverable) {
      return renderCmsDegradationResponse(slug, locale, { skipLive: true });
    }
    throw error;
  }
}
