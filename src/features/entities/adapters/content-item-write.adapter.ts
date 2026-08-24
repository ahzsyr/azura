import "server-only";

import type { ContentStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contentRepository } from "@/features/content/content.repository";
import { ensureBuiltinContentTypes } from "@/features/content/content-data.service";
import type { EntitySaveResult, EntityWriteInput } from "@/features/entities/types";
import { searchIndexer } from "@/capabilities/search/search-indexer.service";
import { translationService } from "@/features/translation/translation.service";

function titleFromFields(fields: Record<string, unknown>, fallback: string): string {
  const candidates = ["title", "titleEn", "name", "productTitle"];
  for (const key of candidates) {
    const value = fields[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

export async function upsertContentEntity(
  contentTypeSlug: string,
  input: EntityWriteInput,
): Promise<EntitySaveResult> {
  await ensureBuiltinContentTypes();
  const type = await contentRepository.getTypeBySlug(contentTypeSlug);
  if (!type) {
    throw new Error(`Unknown content type: ${contentTypeSlug}`);
  }

  const slug = (input.slug ?? (input.fields.slug as string | undefined) ?? "").trim() || null;
  const status = (input.status ?? "DRAFT") as ContentStatus;
  const title = titleFromFields(input.fields, slug ?? "item");

  const existing = input.id
    ? await prisma.contentItem.findFirst({ where: { id: input.id, deletedAt: null } })
    : slug
      ? await prisma.contentItem.findFirst({
          where: { contentTypeId: type.id, slug, deletedAt: null },
        })
      : null;

  const row = existing
    ? await prisma.contentItem.update({
        where: { id: existing.id },
        data: {
          slug,
          attributes: input.fields as Prisma.InputJsonValue,
          status,
          isVisible: status === "PUBLISHED",
        },
        include: { contentType: true, collection: true },
      })
    : await prisma.contentItem.create({
        data: {
          contentTypeId: type.id,
          slug,
          attributes: input.fields as Prisma.InputJsonValue,
          blocks: [],
          displaySettings: {},
          metadata: { presetId: input.presetId } as Prisma.InputJsonValue,
          status,
          isFeatured: false,
          isVisible: status === "PUBLISHED",
          sortOrder: 0,
        },
        include: { contentType: true, collection: true },
      });

  if (input.localeCode) {
    await translationService.upsertMany([
      {
        entityType: "ContentItem",
        entityId: row.id,
        field: "title",
        localeCode: input.localeCode.toLowerCase(),
        value: title,
        status: "PUBLISHED",
      },
    ]);
    if (slug) {
      await translationService.upsertSlug(
        "ContentItem",
        row.id,
        input.localeCode,
        input.localizedSlug ?? slug,
      );
    }
  }

  const indexed = await prisma.contentItem.findUniqueOrThrow({
    where: { id: row.id },
    include: { contentType: true, collection: true },
  });

  await searchIndexer.indexContentItem({
    id: indexed.id,
    slug: indexed.slug,
    attributes: indexed.attributes,
    metadata: indexed.metadata,
    blocks: indexed.blocks,
    status: indexed.status,
    isVisible: indexed.isVisible,
    contentType: indexed.contentType,
    collection: indexed.collection
      ? { id: indexed.collection.id, slug: indexed.collection.slug }
      : null,
  });

  return {
    ref: {
      presetId: input.presetId,
      storage: "content_item",
      id: row.id,
      slug: row.slug ?? row.id,
    },
    created: !existing,
  };
}

export async function deleteContentEntity(
  contentTypeSlug: string,
  idOrSlug: string,
): Promise<void> {
  const type = await contentRepository.getTypeBySlug(contentTypeSlug);
  if (!type) return;

  const key = idOrSlug.trim();
  const item = await prisma.contentItem.findFirst({
    where: {
      contentTypeId: type.id,
      deletedAt: null,
      OR: [{ id: key }, { slug: key }],
    },
  });
  if (!item) return;

  await prisma.contentItem.update({
    where: { id: item.id },
    data: { deletedAt: new Date(), isVisible: false },
  });
  await searchIndexer.remove("CONTENT_ITEM", item.id);
}
