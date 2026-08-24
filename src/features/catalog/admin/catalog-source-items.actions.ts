"use server";

import { requireAdmin } from "@/features/auth/guards";
import { catalogLimit, resolveCatalogTypeSlug } from "@/features/catalog/catalog-source";
import { contentRepository } from "@/features/content/content.repository";
import { prisma } from "@/lib/prisma";

export type CatalogSourceItemPreview = {
  id: string;
  title: string;
  slug: string | null;
  status: string;
};

export async function fetchCatalogSourceItems(input: {
  source: string;
  collectionSlug?: string;
  featuredOnly?: boolean;
  limit?: number;
}): Promise<CatalogSourceItemPreview[]> {
  await requireAdmin();
  const typeSlug = resolveCatalogTypeSlug(input.source);
  const items = await contentRepository.queryVisibleItemsForCatalog({
    contentTypeSlug: typeSlug,
    collectionSlug: input.collectionSlug,
    featuredOnly: input.featuredOnly,
    limit: catalogLimit(input.limit),
  });

  if (items.length === 0) return [];

  const translations = await prisma.entityTranslation.findMany({
    where: {
      entityType: "ContentItem",
      entityId: { in: items.map((item) => item.id) },
      field: "title",
    },
    select: { entityId: true, localeCode: true, value: true },
  });

  const titleById = new Map<string, string>();
  for (const row of translations) {
    if (!row.value.trim()) continue;
    const existing = titleById.get(row.entityId);
    if (!existing || row.localeCode === "en") titleById.set(row.entityId, row.value);
  }

  return items.map((item) => ({
    id: item.id,
    slug: item.slug,
    status: item.status,
    title: titleById.get(item.id) || item.slug || item.id,
  }));
}
