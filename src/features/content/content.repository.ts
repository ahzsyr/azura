import type { ContentStatus, EntityTranslation, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ContentBlockConfig, ContentListItem } from "@/features/content/types";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";
import { resolveTranslation } from "@/features/translation/translation-resolver";

type ContentTypeWithCounts = Prisma.ContentTypeGetPayload<{
  include: { _count: { select: { items: true; collections: true } } };
}>;

type ContentTypeWithCollections = Prisma.ContentTypeGetPayload<{
  include: { collections: { orderBy: { sortOrder: "asc" } } };
}>;

type ContentItemWithRelations = Prisma.ContentItemGetPayload<{
  include: {
    contentType: true;
    collection: true;
    media: { orderBy: { sortOrder: "asc" } };
  };
}>;

type ContentItemListRow = Prisma.ContentItemGetPayload<{
  include: { collection: true; media: { where: { isCover: true }; take: 1 } };
}>;

function groupTranslationsByEntity(translations: EntityTranslation[]) {
  const map = new Map<string, EntityTranslation[]>();
  for (const row of translations) {
    const list = map.get(row.entityId) ?? [];
    list.push(row);
    map.set(row.entityId, list);
  }
  return map;
}

type ContentListItemsOptions = {
  search?: string;
  status?: ContentStatus;
  collectionSlug?: string;
  includeDeleted?: boolean;
};

export const contentRepository: {
  listTypes: () => Promise<ContentTypeWithCounts[]>;
  getTypeBySlug: (slug: string) => Promise<ContentTypeWithCollections | null>;
  listCollections: (contentTypeId?: string) => Promise<Prisma.ContentCollectionGetPayload<object>[]>;
  listItems: (contentTypeSlug: string, options?: ContentListItemsOptions) => Promise<ContentItemListRow[]>;
  getItemById: (id: string) => Promise<ContentItemWithRelations | null>;
  queryForBlock: (config: ContentBlockConfig) => Promise<ContentItemListRow[]>;
  loadListTranslations: (itemIds: string[]) => Promise<Map<string, EntityTranslation[]>>;
  toListItem: (
    item: ContentItemListRow,
    typeSlug: string,
    translations?: EntityTranslation[],
    collectionTranslations?: EntityTranslation[]
  ) => ContentListItem;
  listItemsAsListRows: (
    contentTypeSlug: string,
    options?: ContentListItemsOptions
  ) => Promise<ContentListItem[]>;
  parseDisplaySettings: (raw: unknown) => ReturnType<typeof mergeDisplaySettings>;
} = {
  async listTypes() {
    return prisma.contentType.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { items: true, collections: true } } },
    });
  },

  async getTypeBySlug(slug: string) {
    return prisma.contentType.findUnique({
      where: { slug },
      include: { collections: { orderBy: { sortOrder: "asc" } } },
    });
  },

  async listCollections(contentTypeId?: string) {
    return prisma.contentCollection.findMany({
      where: contentTypeId ? { contentTypeId } : undefined,
      orderBy: { sortOrder: "asc" },
    });
  },

  async listItems(
    contentTypeSlug: string,
    options?: {
      search?: string;
      status?: ContentStatus;
      collectionSlug?: string;
      includeDeleted?: boolean;
    }
  ) {
    const type = await prisma.contentType.findUnique({ where: { slug: contentTypeSlug } });
    if (!type) return [];

    const where: Prisma.ContentItemWhereInput = {
      contentTypeId: type.id,
      ...(options?.includeDeleted ? {} : { deletedAt: null }),
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.collectionSlug
        ? { collection: { slug: options.collectionSlug } }
        : {}),
      ...(options?.search
        ? {
            OR: [
              { slug: { contains: options.search } },
              ...(await (async () => {
                const matches = await prisma.entityTranslation.findMany({
                  where: {
                    entityType: "ContentItem",
                    field: "title",
                    value: { contains: options.search },
                  },
                  select: { entityId: true },
                });
                const ids = matches.map((r) => r.entityId);
                return ids.length ? [{ id: { in: ids } }] : [];
              })()),
            ],
          }
        : {}),
    };

    return prisma.contentItem.findMany({
      where,
      include: { collection: true, media: { where: { isCover: true }, take: 1 } },
      orderBy: { sortOrder: "asc" },
    });
  },

  async getItemById(id: string) {
    return prisma.contentItem.findFirst({
      where: { id, deletedAt: null },
      include: {
        contentType: true,
        collection: true,
        media: { orderBy: { sortOrder: "asc" } },
      },
    });
  },

  async queryForBlock(config: ContentBlockConfig) {
    const type = config.contentTypeSlug
      ? await prisma.contentType.findUnique({ where: { slug: config.contentTypeSlug } })
      : null;
    if (!type) return [];

    const limit = config.limit ?? 6;
    const manualIds = config.manualIds?.filter(Boolean) ?? [];

    const items = await prisma.contentItem.findMany({
      where: {
        contentTypeId: type.id,
        deletedAt: null,
        isVisible: true,
        status: "PUBLISHED",
        ...(config.featuredOnly ? { isFeatured: true } : {}),
        ...(config.collectionSlug ? { collection: { slug: config.collectionSlug } } : {}),
        ...(manualIds.length ? { id: { in: manualIds } } : {}),
      },
      include: {
        collection: true,
        media: {
          where: { isPublished: true, isHidden: false },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: manualIds.length ? undefined : limit,
    });

    const ordered = manualIds.length
      ? (manualIds
          .map((id) => items.find((i) => i.id === id))
          .filter((i): i is (typeof items)[number] => Boolean(i)) as typeof items)
      : items;

    return ordered.slice(0, limit);
  },

  async loadListTranslations(itemIds: string[]) {
    if (itemIds.length === 0) return new Map<string, EntityTranslation[]>();
    const collectionIds = new Set<string>();
    const rows = await prisma.entityTranslation.findMany({
      where: {
        OR: [
          { entityType: "ContentItem", entityId: { in: itemIds } },
          { entityType: "ContentCollection", entityId: { in: [...collectionIds] } },
        ],
      },
    });
    return groupTranslationsByEntity(rows);
  },

  toListItem(
    item: ContentItemListRow,
    typeSlug: string,
    translations: EntityTranslation[] = [],
    collectionTranslations: EntityTranslation[] = []
  ): ContentListItem {
    const ctx = { translations };
    const collectionCtx = { translations: collectionTranslations };
    const title = resolveTranslation("title", "en", ctx);
    const cover =
      item.media?.[0]?.url ??
      item.featuredImageUrl ??
      null;
    return {
      id: item.id,
      titleEn: title,
      titleAr: resolveTranslation("title", "ar", ctx),
      subtitle: item.collection
        ? resolveTranslation("name", "en", collectionCtx) || item.collection.slug
        : undefined,
      thumbnailUrl: cover,
      status: item.status,
      isVisible: item.isVisible,
      isFeatured: item.isFeatured,
      sortOrder: item.sortOrder,
      slug: item.slug,
      badge: item.isFeatured ? "Featured" : item.status !== "PUBLISHED" ? item.status : undefined,
      meta: item.slug ? `/${item.slug}` : undefined,
      editHref: `/admin/content/${typeSlug}/${item.id}`,
    };
  },

  async listItemsAsListRows(contentTypeSlug: string, options?: ContentListItemsOptions) {
    const rows = await this.listItems(contentTypeSlug, options);
    const itemIds = rows.map((r) => r.id);
    const collectionIds = [...new Set(rows.map((r) => r.collectionId).filter(Boolean))] as string[];

    const translations = await prisma.entityTranslation.findMany({
      where: {
        OR: [
          { entityType: "ContentItem", entityId: { in: itemIds } },
          { entityType: "ContentCollection", entityId: { in: collectionIds } },
        ],
      },
    });

    const byItem = groupTranslationsByEntity(
      translations.filter((t) => t.entityType === "ContentItem")
    );
    const byCollection = groupTranslationsByEntity(
      translations.filter((t) => t.entityType === "ContentCollection")
    );

    return rows.map((row) =>
      this.toListItem(
        row,
        contentTypeSlug,
        byItem.get(row.id) ?? [],
        row.collectionId ? byCollection.get(row.collectionId) ?? [] : []
      )
    );
  },

  parseDisplaySettings(raw: unknown) {
    return mergeDisplaySettings(
      typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {}
    );
  },
};
