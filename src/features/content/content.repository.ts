import type { ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ContentBlockConfig, ContentListItem } from "@/features/content/types";
import { mergeDisplaySettings } from "@/schemas/content/display-settings";

type ContentItemListRow = Prisma.ContentItemGetPayload<{
  include: { collection: true; media: { where: { isCover: true }; take: 1 } };
}>;

export const contentRepository = {
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
              { titleEn: { contains: options.search } },
              { titleAr: { contains: options.search } },
              { slug: { contains: options.search } },
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

  toListItem(item: ContentItemListRow, typeSlug: string): ContentListItem {
    const cover =
      item.media?.[0]?.url ??
      item.featuredImageUrl ??
      null;
    return {
      id: item.id,
      titleEn: item.titleEn,
      titleAr: item.titleAr,
      subtitle: item.collection?.nameEn,
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

  parseDisplaySettings(raw: unknown) {
    return mergeDisplaySettings(
      typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {}
    );
  },
};
