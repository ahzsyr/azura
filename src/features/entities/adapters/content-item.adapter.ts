import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { contentPublicService } from "@/features/content/content-public.service";
import type { ContentItemView } from "@/features/content/content-public.types";
import { contentRepository } from "@/features/content/content.repository";
import { translationService } from "@/features/translation/translation.service";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type {
  Collection,
  EntityGetOptions,
  EntityListOptions,
  EntityListRow,
  EntityPresetId,
  EntityRecord,
} from "@/features/entities/types";
import {
  mapContentItemViewToEntityRecord,
  mapContentListItemToEntityListRow,
} from "@/features/entities/adapters/normalize";
import type { EntityStorageAdapter } from "@/features/entities/adapters/types";

const CUID_PATTERN = /^c[a-z0-9]{20,}$/i;

function looksLikeContentItemId(value: string): boolean {
  return CUID_PATTERN.test(value.trim());
}

function usePublicReadPath(options?: EntityGetOptions): boolean {
  if (options?.includeDeleted) return false;
  if (options?.status && options.status !== "PUBLISHED") return false;
  return true;
}

function mapRepositoryRowToEntityRecord(
  presetId: EntityPresetId,
  contentTypeSlug: string,
  row: NonNullable<Awaited<ReturnType<typeof contentRepository.getItemById>>>,
  translations: EntityTranslation[] = [],
): EntityRecord {
  const ctx = { translations };
  const slug = row.slug?.trim() || row.id;
  const title =
    resolveTranslation("title", "en", ctx) ||
    resolveTranslation("title", "ar", ctx) ||
    slug;
  const cover =
    row.media?.find((m) => m.isCover)?.url ??
    row.media?.[0]?.url ??
    row.featuredImageUrl ??
    null;

  const attributes =
    row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)
      ? (row.attributes as Record<string, unknown>)
      : {};

  return {
    ref: {
      presetId,
      storage: "content_item",
      id: row.id,
      slug,
    },
    title,
    titleEn: resolveTranslation("title", "en", ctx),
    titleAr: resolveTranslation("title", "ar", ctx),
    description: resolveTranslation("description", "en", ctx),
    excerpt: resolveTranslation("excerpt", "en", ctx),
    status: row.status,
    thumbnailUrl: cover,
    collectionSlug: row.collection?.slug ?? null,
    updatedAt: row.updatedAt,
    isFeatured: row.isFeatured,
    isVisible: row.isVisible,
    fields: { ...attributes },
  };
}

export function createContentItemAdapter(
  presetId: EntityPresetId,
  contentTypeSlug: string,
): EntityStorageAdapter {
  return {
    async list(options?: EntityListOptions): Promise<EntityListRow[]> {
      const rows = await contentRepository.listItemsAsListRows(contentTypeSlug, {
        search: options?.search,
        status: options?.status,
        collectionSlug: options?.collectionSlug,
        includeDeleted: options?.includeDeleted,
      });

      let mapped = rows.map((row) =>
        mapContentListItemToEntityListRow(presetId, row),
      );

      if (options?.limit != null && options.limit > 0) {
        mapped = mapped.slice(0, options.limit);
      }

      return mapped;
    },

    async get(idOrSlug: string, options?: EntityGetOptions): Promise<EntityRecord | null> {
      const key = idOrSlug.trim();
      if (!key) return null;

      if (usePublicReadPath(options)) {
        let view: ContentItemView | null = null;

        if (looksLikeContentItemId(key)) {
          const row = await contentRepository.getItemById(key);
          if (row?.contentType.slug === contentTypeSlug && row.status === "PUBLISHED") {
            const translations = await contentRepository.loadListTranslations([row.id]);
            const itemTranslations = translations.get(row.id) ?? [];
            if (row.slug) {
              view = await contentPublicService.getItemByTypeAndSlug(
                contentTypeSlug,
                row.slug,
              );
            }
            if (!view) {
              return mapRepositoryRowToEntityRecord(
                presetId,
                contentTypeSlug,
                row,
                itemTranslations,
              );
            }
          }
        } else {
          view = await contentPublicService.getItemByTypeAndSlug(contentTypeSlug, key);
        }

        if (view) {
          return mapContentItemViewToEntityRecord(presetId, view);
        }
      }

      if (looksLikeContentItemId(key)) {
        const row = await contentRepository.getItemById(key);
        if (!row || row.contentType.slug !== contentTypeSlug) return null;
        const translations = await contentRepository.loadListTranslations([row.id]);
        return mapRepositoryRowToEntityRecord(
          presetId,
          contentTypeSlug,
          row,
          translations.get(row.id) ?? [],
        );
      }

      const rows = await contentRepository.listItems(contentTypeSlug, {
        includeDeleted: options?.includeDeleted,
        status: options?.status,
      });
      const match = rows.find((row) => row.slug === key);
      if (!match) return null;

      const full = await contentRepository.getItemById(match.id);
      if (!full || full.contentType.slug !== contentTypeSlug) return null;
      const translations = await contentRepository.loadListTranslations([full.id]);
      return mapRepositoryRowToEntityRecord(
        presetId,
        contentTypeSlug,
        full,
        translations.get(full.id) ?? [],
      );
    },

    async listCollections(options?: EntityListOptions): Promise<Collection[]> {
      const type = await contentRepository.getTypeBySlug(contentTypeSlug);
      if (!type) return [];

      const rows = await contentRepository.listCollections(type.id);
      const collectionIds = rows.map((row) => row.id);
      const translationsMap =
        collectionIds.length > 0
          ? await translationService.getForEntities("ContentCollection", collectionIds)
          : new Map<string, EntityTranslation[]>();

      return rows.map((row, index) => {
        const ctx = { translations: translationsMap.get(row.id) ?? [] };
        const title =
          resolveTranslation("name", "en", ctx) ||
          resolveTranslation("name", "ar", ctx) ||
          row.slug;
        return {
          id: row.id,
          slug: row.slug,
          title,
          presetId,
          sortOrder: row.sortOrder ?? index,
        };
      });
    },
  };
}
