import { pageCache } from "@/features/storage/page-cache";
import type { CmsPage } from "@prisma/client";
import type { PageBlocks } from "@/types/builder";

export async function syncCmsPageCache(page: CmsPage) {
  if (page.status !== "PUBLISHED") {
    await pageCache.invalidate(page.slug);
    return;
  }
  await pageCache.set({
    id: page.id,
    slug: page.slug,
    titleEn: page.titleEn,
    titleAr: page.titleAr,
    excerptEn: page.excerptEn,
    excerptAr: page.excerptAr,
    blocks: (page.blocks as PageBlocks) ?? [],
    updatedAt: page.updatedAt.toISOString(),
  });
}
