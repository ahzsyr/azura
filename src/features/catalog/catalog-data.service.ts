import type { CatalogCardData } from "@/features/catalog/types";
import {
  catalogAttributeFiltersForSource,
  catalogLimit,
  resolveCatalogTypeSlug,
} from "@/features/catalog/catalog-source";
import { mapContentCardToCatalogCard } from "@/features/catalog/map-content-card-to-catalog-card";
import { serializeContentCard } from "@/features/content/content-data.service";
import { contentRepository } from "@/features/content/content.repository";
import { prisma } from "@/lib/prisma";
import type { EntityTranslation } from "@prisma/client";

export { resolveCatalogTypeSlug } from "@/features/catalog/catalog-source";

export type CatalogBlockConfig = {
  source: string;
  categorySlug?: string;
  city?: string;
  serviceType?: string;
  featuredOnly?: boolean;
  manualIds?: string[];
  limit?: number;
  attributeFilters?: Record<string, string>;
  includeUnpublished?: boolean;
};

export async function loadCatalogItems(config: CatalogBlockConfig): Promise<CatalogCardData[]> {
  const typeSlug = resolveCatalogTypeSlug(config.source);
  if (!typeSlug) return [];

  const items = await contentRepository.queryVisibleItemsForCatalog({
    contentTypeSlug: typeSlug,
    collectionSlug: config.categorySlug?.trim() || undefined,
    featuredOnly: config.featuredOnly,
    limit: catalogLimit(config.limit),
  });

  const type = await prisma.contentType.findUnique({ where: { slug: typeSlug } })
    ?? (items[0]
      ? await prisma.contentType.findUnique({ where: { id: items[0].contentTypeId } })
      : null);

  const itemIds = items.map((item) => item.id);
  const collectionIds = [...new Set(items.map((item) => item.collectionId).filter(Boolean))] as string[];
  const translations = itemIds.length
    ? await prisma.entityTranslation.findMany({
        where: {
          OR: [
            { entityType: "ContentItem", entityId: { in: itemIds } },
            { entityType: "ContentCollection", entityId: { in: collectionIds } },
          ],
        },
      })
    : [];

  const byItem = new Map<string, EntityTranslation[]>();
  const byCollection = new Map<string, EntityTranslation[]>();
  for (const row of translations) {
    const map = row.entityType === "ContentCollection" ? byCollection : byItem;
    const list = map.get(row.entityId) ?? [];
    list.push(row);
    map.set(row.entityId, list);
  }

  const cards = items.map((item) =>
    serializeContentCard(
      { ...item, contentType: type ?? undefined },
      byItem.get(item.id) ?? [],
      item.collectionId ? byCollection.get(item.collectionId) ?? [] : [],
    ),
  );

  const attributeFilters = catalogAttributeFiltersForSource(config.source, config);
  let filtered = cards;
  for (const [key, value] of Object.entries(attributeFilters)) {
    filtered = filtered.filter((card) => String(card.attributes[key] ?? "") === value);
  }
  if (filtered.length === 0 && cards.length > 0) {
    filtered = cards;
  }

  return filtered.map(mapContentCardToCatalogCard);
}
