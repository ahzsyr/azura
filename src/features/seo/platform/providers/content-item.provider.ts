import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { translationService } from "@/features/translation/translation.service";
import type { PageBlocks } from "@/types/builder";
import type { SeoEntityProvider } from "../types/entity-provider";
import type { SeoEntityDescriptor } from "../types/entity-descriptor";
import type { BulkEntityFilter } from "../types/autofill";
import { emptyDraft } from "../layers/content/snapshot-builder";
import type { ContentSnapshotDraft } from "../types";
import {
  assembleContentItemDraft,
  resolveContentItemDescription,
  resolveContentItemTitle,
} from "./content-item-snapshot";

export {
  assembleContentItemDraft,
  resolveContentItemCoverImageUrl,
  resolveContentItemDescription,
  resolveContentItemTitle,
} from "./content-item-snapshot";

export async function buildContentItemSnapshot(
  descriptor: SeoEntityDescriptor
): Promise<ContentSnapshotDraft> {
  const translations = (await translationService.getForEntity(
    "ContentItem",
    descriptor.id
  )) as EntityTranslation[];

  const title = resolveContentItemTitle(translations, descriptor.locale);
  const description = resolveContentItemDescription(translations, descriptor.locale);

  const row = await prisma.contentItem.findUnique({
    where: { id: descriptor.id },
    select: {
      blocks: true,
      featuredImageUrl: true,
      media: {
        where: { isPublished: true },
        orderBy: { sortOrder: "asc" },
        select: { url: true, isCover: true },
      },
    },
  });

  if (!row) return emptyDraft(title);

  return assembleContentItemDraft({
    locale: descriptor.locale,
    title,
    description,
    blocks: (row.blocks as PageBlocks) ?? null,
    featuredImageUrl: row.featuredImageUrl,
    media: row.media,
  });
}

export const contentItemEntityProvider: SeoEntityProvider = {
  kind: "content_item",
  async buildSnapshot(descriptor) {
    return buildContentItemSnapshot(descriptor);
  },
  async *listEntities(filter: BulkEntityFilter = {}) {
    const items = await prisma.contentItem.findMany({
      where: {
        deletedAt: null,
        ...(filter.selectedIds?.length ? { id: { in: [...filter.selectedIds] } } : {}),
      },
      select: { id: true },
    });
    for (const item of items) {
      yield Object.freeze({ kind: "content_item" as const, id: item.id, locale: "en" });
      yield Object.freeze({ kind: "content_item" as const, id: item.id, locale: "ar" });
    }
  },
  async countEntities(filter = {}) {
    const count = await prisma.contentItem.count({
      where: {
        deletedAt: null,
        ...(filter.selectedIds?.length ? { id: { in: [...filter.selectedIds] } } : {}),
      },
    });
    return count * 2;
  },
  displayName(descriptor) {
    return `Content item ${descriptor.id}`;
  },
};
