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
  const page = pageProp !== undefined ? pageProp : await cmsService.getPublishedPageBySlug(slug);
  if (!page) {
    // #region agent log
    const draft = await import("@/repositories/cms.repository").then(({ cmsRepository }) =>
      cmsRepository.getPageBySlug(slug, false),
    );
    import("@/lib/debug-ingest").then(({ debugIngest }) =>
      debugIngest(
        "marketing-cms-page.tsx:not-found",
        "Published CMS page missing for wired route",
        {
          slug,
          locale,
          draftStatus: draft?.status ?? null,
          hasBlocks: Array.isArray(draft?.blocks) ? draft.blocks.length > 0 : false,
        },
        "H5",
      ),
    );
    // #endregion
    notFound();
  }
  return <CmsPageRenderer slug={slug} locale={locale} page={page} />;
}
