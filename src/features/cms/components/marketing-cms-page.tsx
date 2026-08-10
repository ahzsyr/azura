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
        return await renderCmsDegradationResponse(slug, locale, { skipLive: true });
      }
      notFound();
    }
    return await CmsPageRenderer({ slug, locale, page });
  } catch (error) {
    const message = getErrorMessage(error);
    const recoverable = isRecoverableDbError(error);
    const digest = (error as { digest?: string })?.digest ?? null;
    const errorName =
      (error as { name?: string })?.name ??
      (error as { constructor?: { name?: string } })?.constructor?.name ??
      "Error";
    console.error(`[MarketingCmsPage] /${slug} render failed:`, {
      message,
      digest,
      errorName,
      recoverable,
    });

    if (recoverable) {
      return await renderCmsDegradationResponse(slug, locale, { skipLive: true });
    }

    console.error(`[MarketingCmsPage] /${slug} non-recoverable error — serving degradation UI`);
    return await renderCmsDegradationResponse(slug, locale, { skipLive: true });
  }
}
