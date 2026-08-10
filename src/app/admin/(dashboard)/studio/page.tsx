import { cmsRepository } from "@/repositories/cms.repository";
import { previewTokenService } from "@/features/preview/preview-token.service";
import { StudioShell } from "@/features/preview/studio-shell";
import type { PageBlocks } from "@/types/builder";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import { resolveTranslation } from "@/features/translation/translation-resolver";

type Props = {
  searchParams: Promise<{ pageId?: string }>;
};

export default async function StudioPage({ searchParams }: Props) {
  const params = await searchParams;
  const pages = await cmsRepository.listPages();
  const translations = await loadTranslationsMap(
    "CmsPage",
    pages.map((p) => p.id)
  );
  const pageOptions = pages.map((p) => {
    const rowTranslations = translations.get(p.id) ?? [];
    const ctx = { translations: rowTranslations };
    return {
      id: p.id,
      slug: p.slug,
      titleEn: localizedFieldValue(rowTranslations, "title"),
      titleAr: resolveTranslation("title", "ar", ctx),
    };
  });

  let previewUrl: string | undefined;
  const pageId = params.pageId?.trim();

  if (pageId) {
    const page = await cmsRepository.getPageById(pageId);
    if (page) {
      const token = await previewTokenService.create({
        pageId: page.id,
        slug: page.slug,
        blocks: (page.blocks as PageBlocks) ?? [],
        locale: "en",
      });
      previewUrl = `/preview/page?token=${token}&editor=1&locale=en`;
    }
  }

  return (
    <StudioShell pages={pageOptions} initialPageId={pageId} previewUrl={previewUrl} />
  );
}
