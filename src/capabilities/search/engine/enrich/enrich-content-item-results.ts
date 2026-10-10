import "server-only";

import { resolveContentCoverUrl } from "@/capabilities/search/lib/content-cover-url";
import { contentItemSearchPath } from "@/capabilities/search/lib/search-public-path";
import type { SearchCardPayload } from "@/capabilities/search/types/search-card";
import { prisma } from "@/lib/prisma";

type ContentSearchHit = {
  entityType: string;
  entityId: string;
  locale: string;
  urlPath: string;
  card?: SearchCardPayload;
};

/** Point catalog content hits at the item page and attach the live cover image. */
export async function enrichContentItemSearchResults<T extends ContentSearchHit>(
  results: T[],
): Promise<T[]> {
  const ids = [
    ...new Set(
      results
        .filter((result) => result.entityType === "CONTENT_ITEM" && result.entityId)
        .map((result) => result.entityId),
    ),
  ];
  if (!ids.length) return results;

  const rows = await prisma.contentItem.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      featuredImageUrl: true,
      contentType: { select: { slug: true, routePrefix: true } },
      media: {
        select: {
          url: true,
          isCover: true,
          sortOrder: true,
          isHidden: true,
          isPublished: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const byId = new Map(rows.map((row) => [row.id, row] as const));

  return results.map((result) => {
    if (result.entityType !== "CONTENT_ITEM") return result;
    const row = byId.get(result.entityId);
    if (!row) return result;

    const imageUrl = resolveContentCoverUrl(row);
    const urlPath = row.slug
      ? contentItemSearchPath(
          result.locale,
          row.contentType.routePrefix,
          row.contentType.slug,
          row.slug,
        )
      : result.urlPath;

    return {
      ...result,
      urlPath,
      ...(imageUrl || row.slug
        ? {
            card: {
              ...result.card,
              ...(imageUrl ? { imageUrl } : {}),
              ...(row.slug ? { slug: row.slug } : {}),
            },
          }
        : {}),
    };
  });
}
