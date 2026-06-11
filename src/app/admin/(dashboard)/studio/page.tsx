import { cmsRepository } from "@/repositories/cms.repository";
import { previewTokenService } from "@/features/preview/preview-token.service";
import { StudioShell } from "@/features/preview/studio-shell";
import type { PageBlocks } from "@/types/builder";

type Props = {
  searchParams: Promise<{ pageId?: string }>;
};

export default async function StudioPage({ searchParams }: Props) {
  const params = await searchParams;
  const pages = await cmsRepository.listPages();
  const pageOptions = pages.map((p) => ({ id: p.id, slug: p.slug, titleEn: p.titleEn }));

  let previewUrl: string | undefined;
  const pageId = params.pageId?.trim();

  if (pageId) {
    const page = await cmsRepository.getPageById(pageId);
    if (page) {
      const token = await previewTokenService.create({
        pageId: page.id,
        slug: page.slug,
        titleEn: page.titleEn,
        titleAr: page.titleAr,
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
