import { prisma } from "@/lib/prisma";
import type { CompareItemSnapshot } from "@/features/comparison/types";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";
import { resolveTranslation } from "@/features/translation/translation-resolver";
import type { EntityTranslation } from "@prisma/client";

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

function titleTranslations(translations: EntityTranslation[]) {
  const ctx = { translations };
  return {
    titleEn: localizedFieldValue(translations, "title"),
    titleAr: resolveTranslation("title", "ar", ctx),
  };
}

function mapRowToSnapshot(
  row: {
    id: string;
    slug: string | null;
    attributes: unknown;
    featuredImageUrl: string | null;
    media: { isCover: boolean; url: string }[];
    contentType: { slug: string; routePrefix: string | null };
  },
  translations: EntityTranslation[]
): CompareItemSnapshot {
  const cover = row.media.find((m) => m.isCover) ?? row.media[0];
  const imageUrl = cover?.url ?? row.featuredImageUrl ?? null;
  const attrs =
    row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)
      ? (row.attributes as Record<string, unknown>)
      : {};
  const title = titleTranslations(translations);

  return {
    id: row.id,
    contentTypeSlug: row.contentType.slug,
    slug: row.slug,
    title: title.titleEn,
    titleEn: title.titleEn,
    titleAr: title.titleAr,
    translations,
    href: publicPath(row.contentType.routePrefix, row.slug, row.contentType.slug),
    imageUrl,
    attributes: attrs,
  };
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

  const titleMatches = qFilter
    ? await prisma.entityTranslation.findMany({
        where: {
          entityType: "ContentItem",
          field: "title",
          value: { contains: qFilter },
        },
        select: { entityId: true },
      })
    : [];

  const rows = await prisma.contentItem.findMany({
    where: {
      ...PUBLISHED,
      contentTypeId: type.id,
      ...(filters?.collectionSlug ? { collection: { slug: filters.collectionSlug } } : {}),
      ...(qFilter
        ? {
            OR: [
              { slug: { contains: qFilter } },
              ...(titleMatches.length
                ? [{ id: { in: titleMatches.map((m) => m.entityId) } }]
                : []),
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

  const translations = await loadTranslationsMap(
    "ContentItem",
    rows.map((row) => row.id)
  );

  let mapped = rows.map((row) =>
    mapRowToSnapshot(row, translations.get(row.id) ?? [])
  );

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

  const translations = await loadTranslationsMap(
    "ContentItem",
    rows.map((row) => row.id)
  );

  const order = new Map(itemIds.map((id, i) => [id, i]));
  const sorted = [...rows].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return sorted.map((row) =>
    mapRowToSnapshot(row, translations.get(row.id) ?? [])
  );
}
