import { prisma } from "@/lib/prisma";
import type { CompareItemSnapshot } from "@/features/comparison/types";

const PUBLISHED = {
  deletedAt: null,
  isVisible: true,
  status: "PUBLISHED" as const,
};

function publicPath(routePrefix: string | null, slug: string | null, contentTypeSlug: string): string {
  const prefix = routePrefix ?? contentTypeSlug;
  if (slug) return `/${prefix}/${slug}`;
  return `/${prefix}`;
}

export async function searchCompareCandidates(
  contentTypeSlug: string,
  query: string,
  limit = 12,
  filters?: { collectionSlug?: string; tags?: string[] }
): Promise<CompareItemSnapshot[]> {
  const q = query.trim();
  const qFilter = q && q !== "*" ? q : "";

  const type = await prisma.contentType.findFirst({
    where: { slug: contentTypeSlug, isEnabled: true },
  });
  if (!type) return [];

  const rows = await prisma.contentItem.findMany({
    where: {
      ...PUBLISHED,
      contentTypeId: type.id,
      ...(filters?.collectionSlug
        ? { collection: { slug: filters.collectionSlug } }
        : {}),
      ...(qFilter
        ? {
            OR: [
              { titleEn: { contains: qFilter } },
              { titleAr: { contains: qFilter } },
              { slug: { contains: qFilter } },
            ],
          }
        : {}),
    },
    take: limit,
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
    include: {
      media: { where: { isPublished: true }, orderBy: { sortOrder: "asc" } },
      contentType: { select: { slug: true, routePrefix: true } },
    },
  });

  let mapped = rows.map((row) => {
    const cover = row.media.find((m) => m.isCover) ?? row.media[0];
    const imageUrl = cover?.url ?? row.featuredImageUrl ?? null;
    const attrs =
      row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)
        ? (row.attributes as Record<string, unknown>)
        : {};

    return {
      id: row.id,
      contentTypeSlug: row.contentType.slug,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      href: publicPath(row.contentType.routePrefix, row.slug, row.contentType.slug),
      imageUrl,
      attributes: attrs,
    };
  });

  if (filters?.tags?.length) {
    mapped = mapped.filter((item) => {
      const tagList = item.attributes.tags;
      if (!Array.isArray(tagList)) return false;
      return filters.tags!.some((t) => tagList.includes(t));
    });
  }

  return mapped;
}

export async function fetchCompareItems(
  contentTypeSlug: string,
  itemIds: string[]
): Promise<CompareItemSnapshot[]> {
  if (itemIds.length === 0) return [];

  const type = await prisma.contentType.findFirst({
    where: { slug: contentTypeSlug, isEnabled: true },
  });
  if (!type) return [];

  const rows = await prisma.contentItem.findMany({
    where: {
      ...PUBLISHED,
      contentTypeId: type.id,
      id: { in: itemIds },
    },
    include: {
      media: { where: { isPublished: true }, orderBy: { sortOrder: "asc" } },
      contentType: { select: { slug: true, routePrefix: true } },
    },
  });

  const order = new Map(itemIds.map((id, i) => [id, i]));
  const sorted = [...rows].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return sorted.map((row) => {
    const cover = row.media.find((m) => m.isCover) ?? row.media[0];
    const imageUrl = cover?.url ?? row.featuredImageUrl ?? null;
    const attrs =
      row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)
        ? (row.attributes as Record<string, unknown>)
        : {};

    return {
      id: row.id,
      contentTypeSlug: row.contentType.slug,
      slug: row.slug,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      href: publicPath(row.contentType.routePrefix, row.slug, row.contentType.slug),
      imageUrl,
      attributes: attrs,
    };
  });
}
