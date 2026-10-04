import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseRevisionTranslationSnapshot,
  type RevisionTranslationSnapshotItem,
} from "@/features/cms/revision-translation-snapshot.shared";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation";
import type { PageSeoContentFallbacks } from "@/features/seo/page-seo-context.types";

type CmsEntityKind = "CmsPage" | "Post" | "ContentItem";

async function loadPublishedRevisionTranslations(
  kind: CmsEntityKind,
  entityId: string,
): Promise<RevisionTranslationSnapshotItem[] | null> {
  if (kind === "CmsPage") {
    const page = await prisma.cmsPage.findUnique({
      where: { id: entityId },
      select: { status: true, publishedRevisionId: true },
    });
    if (!page?.publishedRevisionId || page.status !== "PUBLISHED") return null;
    const rev = await prisma.cmsPageRevision.findUnique({
      where: { id: page.publishedRevisionId },
      select: { translations: true },
    });
    if (!rev) return null;
    const items = parseRevisionTranslationSnapshot(rev.translations);
    return items.length > 0 ? items : null;
  }

  if (kind === "Post") {
    const post = await prisma.post.findUnique({
      where: { id: entityId },
      select: { status: true, publishedRevisionId: true },
    });
    if (!post?.publishedRevisionId || post.status !== "PUBLISHED") return null;
    const rev = await prisma.postRevision.findUnique({
      where: { id: post.publishedRevisionId },
      select: { translations: true },
    });
    if (!rev) return null;
    const items = parseRevisionTranslationSnapshot(rev.translations);
    return items.length > 0 ? items : null;
  }

  const item = await prisma.contentItem.findUnique({
    where: { id: entityId },
    select: { status: true, publishedRevisionId: true },
  });
  if (!item?.publishedRevisionId || item.status !== "PUBLISHED") return null;
  const rev = await prisma.contentItemRevision.findUnique({
    where: { id: item.publishedRevisionId },
    select: { translations: true },
  });
  if (!rev) return null;
  const items = parseRevisionTranslationSnapshot(rev.translations);
  return items.length > 0 ? items : null;
}

function asEntityTranslationRows(
  items: RevisionTranslationSnapshotItem[],
): EntityTranslation[] {
  return items.map(
    (item) =>
      ({
        id: `${item.entityType}:${item.entityId}:${item.field}:${item.localeCode}`,
        entityType: item.entityType,
        entityId: item.entityId,
        field: item.field,
        localeCode: item.localeCode,
        value: item.value,
        status: (item.status as EntityTranslation["status"]) || "PUBLISHED",
        createdAt: new Date(0),
        updatedAt: new Date(0),
      }) as EntityTranslation,
  );
}

export function contentFallbacksFromSnapshotRows(
  rows: EntityTranslation[],
  parentType: CmsEntityKind,
): PageSeoContentFallbacks {
  if (parentType === "ContentItem") {
    const shape = legacyShapeFromTranslations(rows, [
      "title",
      "description",
      "seoTitle",
      "seoDescription",
      "shortDescription",
    ]);
    return {
      titleEn: shape.seoTitleEn?.trim() || shape.titleEn || "",
      titleAr: shape.seoTitleAr?.trim() || shape.titleAr || "",
      descEn:
        shape.seoDescriptionEn?.trim() ||
        shape.shortDescriptionEn?.trim() ||
        shape.descriptionEn?.slice(0, 160) ||
        "",
      descAr:
        shape.seoDescriptionAr?.trim() ||
        shape.shortDescriptionAr?.trim() ||
        shape.descriptionAr?.slice(0, 160) ||
        "",
    };
  }
  const shape = legacyShapeFromTranslations(rows, ["title", "excerpt"]);
  return {
    titleEn: shape.titleEn ?? "",
    titleAr: shape.titleAr ?? "",
    descEn: shape.excerptEn ?? "",
    descAr: shape.excerptAr ?? "",
  };
}

/**
 * Public SEO binding: prefer immutable published-revision translation snapshot.
 * Returns null when no published snapshot exists (caller falls back to live ET).
 */
export async function resolvePublishedSeoTranslationBinding(params: {
  kind: CmsEntityKind;
  entityId: string;
  seoMetaId?: string | null;
  seoFields: readonly string[];
}): Promise<{
  seoTranslations: Record<string, string>;
  contentFallbacks: PageSeoContentFallbacks;
} | null> {
  const snapshot = await loadPublishedRevisionTranslations(params.kind, params.entityId);
  if (!snapshot) return null;

  const allRows = asEntityTranslationRows(snapshot);
  const parentRows = allRows.filter(
    (row) => row.entityType === params.kind && row.entityId === params.entityId,
  );
  const seoRows = params.seoMetaId
    ? allRows.filter(
        (row) => row.entityType === "SeoMeta" && row.entityId === params.seoMetaId,
      )
    : [];

  return {
    seoTranslations: legacyShapeFromTranslations(seoRows, [...params.seoFields]),
    contentFallbacks: contentFallbacksFromSnapshotRows(parentRows, params.kind),
  };
}

export { pickSeoTitleFromRevisionSnapshots } from "@/features/cms/revision-translation-snapshot.shared";
