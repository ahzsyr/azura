import type { Locale } from "@/i18n/routing";
import type { CmsPage } from "@prisma/client";
import { cmsService } from "@/features/cms/cms.service";
import { CmsPageRenderer } from "./cms-page-renderer";
import type { PageBlocks } from "@/types/builder";
import { agentLog, agentLogError } from "@/lib/debug/agent-log";

type Props = {
  slug: string;
  locale: Locale;
  /** When provided, skips a second CMS page fetch. */
  page?: CmsPage | null;
};

/** Renders published CMS blocks only when non-empty (for hybrid marketing routes). */
export async function CmsPageBlocksSection({ slug, locale, page: pageProp }: Props) {
  try {
    const page = pageProp !== undefined ? pageProp : await cmsService.getPublishedPageBySlug(slug);
    const blocks = (page?.blocks as PageBlocks) ?? [];
    if (!page || blocks.length === 0) {
      return null;
    }
    return <CmsPageRenderer slug={slug} locale={locale} page={page} />;
  } catch (error) {
    agentLogError("cms-page-blocks-section.tsx", error, "H8", { slug, locale });
    return null;
  }
}
