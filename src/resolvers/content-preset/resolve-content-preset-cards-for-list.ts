import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contentRepository } from "@/features/content/content.repository";
import type { ContentBlockConfig } from "@/features/content/types";
import { entityService } from "@/features/entities/entity.service";
import {
  mapEntityToCardViewModel,
} from "@/resolvers/content-preset/map-entity-to-card";
import type { ContentPresetCardViewModel } from "@/view-models/content-preset-card";
import type { ResolverContext } from "@/view-models/types";
import {
  resolveContentTypeSlugForPreset,
  type ContentPresetId,
} from "@/templates/preset-template-map";
import { getEntityTypeDefinition } from "@/features/entities/preset-registry";
import { contentPublicService } from "@/features/content/content-public.service";

export async function resolveContentPresetCardsForList(
  presetId: ContentPresetId,
  config: ContentBlockConfig,
  ctx: ResolverContext,
): Promise<ContentPresetCardViewModel[]> {
  const contentTypeSlug = config.contentTypeSlug ?? resolveContentTypeSlugForPreset(presetId);
  const blockConfig: ContentBlockConfig = { ...config, contentTypeSlug };

  const [items, contentTypeRow] = await Promise.all([
    contentRepository.queryForBlock(blockConfig),
    prisma.contentType.findUnique({ where: { slug: contentTypeSlug } }),
  ]);

  if (items.length === 0) return [];

  const itemIds = items.map((item) => item.id);
  const collectionIds = [
    ...new Set(items.map((item) => item.collectionId).filter(Boolean)),
  ] as string[];

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

  const routePrefix = contentTypeRow?.routePrefix ?? null;
  const definition = getEntityTypeDefinition(presetId);

  const viewModels: ContentPresetCardViewModel[] = [];

  for (const item of items) {
    const entity = await entityService.getEntity(presetId, item.id, {
      locale: ctx.localePrefix,
    });
    if (!entity) continue;

    const collectionName = item.collection?.slug;
    const featuredImage =
      item.featuredImageUrl ??
      item.media?.find((m) => m.isCover)?.url ??
      item.media?.[0]?.url ??
      entity.thumbnailUrl;

    viewModels.push(
      mapEntityToCardViewModel(
        {
          entity,
          presetId,
          contentTypeSlug: definition?.contentTypeSlug ?? contentTypeSlug,
          routePrefix,
          itemTranslations: byItem.get(item.id) ?? [],
          collectionTranslations: item.collectionId
            ? byCollection.get(item.collectionId) ?? []
            : [],
          collectionName: collectionName ?? undefined,
          imageUrl: featuredImage ?? null,
        },
        ctx,
      ),
    );
  }

  return viewModels;
}

export async function resolveContentPresetCardsFromEntityIds(
  presetId: ContentPresetId,
  entityIds: string[],
  ctx: ResolverContext,
): Promise<ContentPresetCardViewModel[]> {
  const models: ContentPresetCardViewModel[] = [];
  for (const entityId of entityIds) {
    const entity = await entityService.getEntity(presetId, entityId, {
      locale: ctx.localePrefix,
    });
    if (!entity) continue;

    const contentTypeSlug = ctx.contentTypeSlug ?? resolveContentTypeSlugForPreset(presetId);
    const typeView = await contentPublicService.getTypeBySlug(contentTypeSlug);

    models.push(
      mapEntityToCardViewModel(
        {
          entity,
          presetId,
          contentTypeSlug,
          routePrefix: typeView?.routePrefix ?? null,
          imageUrl: entity.thumbnailUrl,
        },
        ctx,
      ),
    );
  }
  return models;
}
