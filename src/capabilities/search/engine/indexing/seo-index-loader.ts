import "server-only";

import type { SeoMeta } from "@prisma/client";
import { seoRepository } from "@/repositories/seo.repository";
import { translationService } from "@/features/translation/translation.service";
import { toLocalizedRecord } from "@/features/translation/translation-resolver";
import type { SearchIndexSeoSnapshot } from "@/capabilities/search/engine/indexing/search-index-types";

export async function seoMetaToSnapshot(
  meta: SeoMeta | null | undefined
): Promise<SearchIndexSeoSnapshot | null> {
  if (!meta) return null;
  const translations = await translationService.getForEntity("SeoMeta", meta.id);
  return {
    title: toLocalizedRecord(translations, "metaTitle"),
    description: toLocalizedRecord(translations, "metaDescription"),
    focusKeywords: meta.focusKeywords,
    canonicalUrl: meta.canonicalUrl,
    ogTitle: toLocalizedRecord(translations, "ogTitle"),
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
    const snap = await seoMetaToSnapshot(row);
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
