import "server-only";

import type { EntityTranslation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { translationService } from "@/features/translation/translation.service";
import { toLocalizedRecord } from "@/features/translation/translation-resolver";
import type { PageBlocks } from "@/types/builder";
import { normalizeRemoteImageUrl } from "@/lib/config/next-image";
import type { SeoEntityProvider } from "../types/entity-provider";
import type { SeoEntityDescriptor } from "../types/entity-descriptor";
import type { BulkEntityFilter } from "../types/autofill";
import { extractContentFromBlocks } from "../layers/content/block-extractor";
import { emptyDraft } from "../layers/content/snapshot-builder";

async function buildCmsLikeSnapshot(
  entityType: "CmsPage" | "Post",
  descriptor: SeoEntityDescriptor
) {
  const translations = (await translationService.getForEntity(
    entityType,
    descriptor.id
  )) as EntityTranslation[];
  const title = toLocalizedRecord(translations, "title");
  const excerpt = toLocalizedRecord(translations, "excerpt");
  const fallbackTitle = title[descriptor.locale] ?? title.en ?? "";

  const row =
    entityType === "CmsPage"
      ? await prisma.cmsPage.findUnique({ where: { id: descriptor.id }, select: { blocks: true } })
      : await prisma.post.findUnique({
          where: { id: descriptor.id },
          select: {
            blocks: true,
            featuredImage: { select: { url: true } },
          },
        });

  const blocks = (row?.blocks as PageBlocks) ?? null;
  let draft = blocks ? extractContentFromBlocks(blocks, fallbackTitle) : emptyDraft(fallbackTitle);
  if (!draft.title) draft.title = fallbackTitle;

  const desc = excerpt[descriptor.locale] ?? excerpt.en ?? "";
  if (desc && !draft.paragraphs.length) {
    draft = { ...draft, paragraphs: [desc] };
  } else if (desc && !draft.paragraphs.includes(desc)) {
    draft = { ...draft, paragraphs: [desc, ...draft.paragraphs] };
  }

  const featuredImageRaw =
    entityType === "Post" && row && "featuredImage" in row
      ? (row.featuredImage as { url: string | null } | null)?.url?.trim()
      : undefined;
  const featuredImage = featuredImageRaw
    ? normalizeRemoteImageUrl(featuredImageRaw) ?? featuredImageRaw
    : undefined;

  if (featuredImage) {
    const hasFeatured = draft.images.some((img) => img.src === featuredImage);
    if (!hasFeatured) {
      draft = {
        ...draft,
        images: [{ src: featuredImage, alt: fallbackTitle }, ...draft.images],
      };
    }
    draft = {
      ...draft,
      metadata: {
        ...(draft.metadata ?? {}),
        featuredImage,
      },
    };
  }

  return draft;
}

export const cmsPageEntityProvider: SeoEntityProvider = {
  kind: "cms_page",
  async buildSnapshot(descriptor) {
    return buildCmsLikeSnapshot("CmsPage", descriptor);
  },
  async *listEntities(filter: BulkEntityFilter = {}) {
    const pages = await prisma.cmsPage.findMany({
      where: filter.selectedIds?.length ? { id: { in: [...filter.selectedIds] } } : undefined,
      select: { id: true },
    });
    for (const page of pages) {
      yield Object.freeze({ kind: "cms_page" as const, id: page.id, locale: "en" });
      yield Object.freeze({ kind: "cms_page" as const, id: page.id, locale: "ar" });
    }
  },
  async countEntities(filter = {}) {
    const count = await prisma.cmsPage.count({
      where: filter.selectedIds?.length ? { id: { in: [...filter.selectedIds] } } : undefined,
    });
    return count * 2;
  },
  displayName(descriptor) {
    return `CMS page ${descriptor.id}`;
  },
};

export const postEntityProvider: SeoEntityProvider = {
  kind: "post",
  async buildSnapshot(descriptor) {
    return buildCmsLikeSnapshot("Post", descriptor);
  },
  async *listEntities(filter: BulkEntityFilter = {}) {
    const posts = await prisma.post.findMany({
      where: filter.selectedIds?.length ? { id: { in: [...filter.selectedIds] } } : undefined,
      select: { id: true },
    });
    for (const post of posts) {
      yield Object.freeze({ kind: "post" as const, id: post.id, locale: "en" });
      yield Object.freeze({ kind: "post" as const, id: post.id, locale: "ar" });
    }
  },
  async countEntities(filter = {}) {
    const count = await prisma.post.count({
      where: filter.selectedIds?.length ? { id: { in: [...filter.selectedIds] } } : undefined,
    });
    return count * 2;
  },
  displayName(descriptor) {
    return `Post ${descriptor.id}`;
  },
};
