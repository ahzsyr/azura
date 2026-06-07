import "server-only";

import type { SeoMeta } from "@prisma/client";
import { seoRepository } from "@/repositories/seo.repository";
import type { SearchIndexSeoSnapshot } from "@/features/search-framework/indexing/search-index-types";

export function seoMetaToSnapshot(meta: SeoMeta | null | undefined): SearchIndexSeoSnapshot | null {
  if (!meta) return null;
  return {
    titleEn: meta.titleEn,
    titleAr: meta.titleAr,
    descriptionEn: meta.descriptionEn,
    descriptionAr: meta.descriptionAr,
    focusKeywords: meta.focusKeywords,
    canonicalUrl: meta.canonicalUrl,
    ogTitleEn: meta.ogTitleEn,
    ogTitleAr: meta.ogTitleAr,
  };
}

export async function loadSeoForContentItem(itemId: string): Promise<SearchIndexSeoSnapshot | null> {
  const meta = await seoRepository.getByEntity("ContentItem", itemId);
  return seoMetaToSnapshot(meta);
}

export async function loadSeoBatchForContentItems(
  itemIds: string[]
): Promise<Map<string, SearchIndexSeoSnapshot>> {
  const out = new Map<string, SearchIndexSeoSnapshot>();
  if (!itemIds.length) return out;

  const { prisma } = await import("@/lib/prisma");
  const rows = await prisma.seoMeta.findMany({
    where: { entityType: "ContentItem", entityId: { in: itemIds } },
  });
  for (const row of rows) {
    if (!row.entityId) continue;
    const snap = seoMetaToSnapshot(row);
    if (snap) out.set(row.entityId, snap);
  }
  return out;
}

export async function loadSeoForPost(postId: string): Promise<SearchIndexSeoSnapshot | null> {
  const meta = await seoRepository.getByPostId(postId);
  return seoMetaToSnapshot(meta);
}

export async function loadSeoForCmsPage(pageId: string): Promise<SearchIndexSeoSnapshot | null> {
  const meta = await seoRepository.getByCmsPageId(pageId);
  return seoMetaToSnapshot(meta);
}
