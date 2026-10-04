import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { compositionService } from "@/features/layout-engine/composition.service";
import type { PageAstDocument } from "@/features/cms/page-ast";
import type { PageBlocks } from "@/types/builder";
import { isCmsDraftModeEnabled } from "@/features/cms/draft-mode";
import {
  captureRevisionTranslations,
  persistCompositionWithEditLocale,
} from "@/features/cms/revision-translation-snapshot";

export type CmsRevisionSnapshot = {
  id: string;
  blocks: unknown;
  composition: unknown;
};

/** Load Page AST for a revision row (or fall back to entity composition/blocks). */
export function loadAstFromSnapshot(
  snapshot: { composition?: unknown; blocks?: unknown } | null | undefined,
  fallback?: { composition?: unknown; blocks?: unknown },
): PageAstDocument {
  return compositionService.loadDocument({
    composition: snapshot?.composition ?? fallback?.composition,
    blocks: (snapshot?.blocks ?? fallback?.blocks) as PageBlocks | undefined,
  });
}

export async function loadCmsPageRevision(revisionId: string | null | undefined) {
  if (!revisionId) return null;
  return prisma.cmsPageRevision.findUnique({ where: { id: revisionId } });
}

export async function loadPostRevision(revisionId: string | null | undefined) {
  if (!revisionId) return null;
  return prisma.postRevision.findUnique({ where: { id: revisionId } });
}

export async function loadContentItemRevision(revisionId: string | null | undefined) {
  if (!revisionId) return null;
  return prisma.contentItemRevision.findUnique({ where: { id: revisionId } });
}

/**
 * Resolve which revision pointer to use for a public page load.
 * Draft Mode → working; otherwise → published.
 */
export async function selectCmsPageRevisionId(page: {
  workingRevisionId?: string | null;
  publishedRevisionId?: string | null;
}): Promise<{ revisionId: string | null; isDraftPreview: boolean }> {
  const isDraftPreview = await isCmsDraftModeEnabled();
  const revisionId = isDraftPreview
    ? page.workingRevisionId ?? page.publishedRevisionId ?? null
    : page.publishedRevisionId ?? null;
  return { revisionId, isDraftPreview };
}

export async function selectPostRevisionId(post: {
  workingRevisionId?: string | null;
  publishedRevisionId?: string | null;
}): Promise<{ revisionId: string | null; isDraftPreview: boolean }> {
  const isDraftPreview = await isCmsDraftModeEnabled();
  const revisionId = isDraftPreview
    ? post.workingRevisionId ?? post.publishedRevisionId ?? null
    : post.publishedRevisionId ?? null;
  return { revisionId, isDraftPreview };
}

/** Apply revision AST onto a page-like object for the shared renderer. */
export function applyAstToEntityFields<T extends { blocks: unknown; composition: unknown }>(
  entity: T,
  ast: PageAstDocument,
): T {
  const persisted = compositionService.saveDocument(ast);
  return {
    ...entity,
    blocks: persisted.blocks as T["blocks"],
    composition: persisted.composition as T["composition"],
  };
}

export type PublishPageResult = {
  page: Prisma.CmsPageGetPayload<object>;
  revisionId: string;
};

/**
 * Atomic publish: immutable revision snapshot + published/working pointers + PUBLISHED status.
 */
export async function publishCmsPageAtomically(
  pageId: string,
  options?: { createdById?: string; message?: string; editingLocale?: string | null },
): Promise<PublishPageResult> {
  const page = await prisma.cmsPage.findUniqueOrThrow({ where: { id: pageId } });
  const last = await prisma.cmsPageRevision.findFirst({
    where: { pageId },
    orderBy: { version: "desc" },
  });
  const version = (last?.version ?? 0) + 1;
  const persisted = persistCompositionWithEditLocale(
    page.composition as Parameters<typeof persistCompositionWithEditLocale>[0],
    page.blocks as PageBlocks,
    options?.editingLocale,
  );
  const translations = await captureRevisionTranslations({
    parentType: "CmsPage",
    parentId: pageId,
    blocksOrComposition: (page.composition as never) ?? (page.blocks as PageBlocks),
  });

  return prisma.$transaction(async (tx) => {
    const revision = await tx.cmsPageRevision.create({
      data: {
        pageId,
        version,
        blocks: persisted.blocks,
        composition: persisted.composition,
        translations: translations as unknown as Prisma.InputJsonValue,
        message: options?.message ?? "Published",
        createdById: options?.createdById,
      },
    });
    const updated = await tx.cmsPage.update({
      where: { id: pageId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        scheduledAt: null,
        publishedRevisionId: revision.id,
        workingRevisionId: revision.id,
        blocks: persisted.blocks,
        composition: persisted.composition,
      },
    });
    return { page: updated, revisionId: revision.id };
  });
}

export async function publishPostAtomically(
  postId: string,
  options?: { createdById?: string; message?: string; editingLocale?: string | null },
) {
  const post = await prisma.post.findUniqueOrThrow({ where: { id: postId } });
  const last = await prisma.postRevision.findFirst({
    where: { postId },
    orderBy: { version: "desc" },
  });
  const version = (last?.version ?? 0) + 1;
  const persisted = persistCompositionWithEditLocale(
    post.composition as Parameters<typeof persistCompositionWithEditLocale>[0],
    post.blocks as PageBlocks,
    options?.editingLocale,
  );
  const translations = await captureRevisionTranslations({
    parentType: "Post",
    parentId: postId,
    blocksOrComposition: (post.composition as never) ?? (post.blocks as PageBlocks),
  });

  return prisma.$transaction(async (tx) => {
    const revision = await tx.postRevision.create({
      data: {
        postId,
        version,
        blocks: persisted.blocks,
        composition: persisted.composition,
        translations: translations as unknown as Prisma.InputJsonValue,
        message: options?.message ?? "Published",
        createdById: options?.createdById,
      },
    });
    const updated = await tx.post.update({
      where: { id: postId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        scheduledAt: null,
        publishedRevisionId: revision.id,
        workingRevisionId: revision.id,
        blocks: persisted.blocks,
        composition: persisted.composition,
      },
    });
    return { post: updated, revisionId: revision.id };
  });
}

export async function publishContentItemAtomically(
  itemId: string,
  options?: { message?: string; editingLocale?: string | null },
) {
  const item = await prisma.contentItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { contentType: true },
  });
  const last = await prisma.contentItemRevision.findFirst({
    where: { itemId },
    orderBy: { version: "desc" },
  });
  const version = (last?.version ?? 0) + 1;
  const persisted = persistCompositionWithEditLocale(
    item.composition as Parameters<typeof persistCompositionWithEditLocale>[0],
    item.blocks as PageBlocks,
    options?.editingLocale,
  );
  const translations = await captureRevisionTranslations({
    parentType: "ContentItem",
    parentId: itemId,
    blocksOrComposition: (item.composition as never) ?? (item.blocks as PageBlocks),
  });

  return prisma.$transaction(async (tx) => {
    const revision = await tx.contentItemRevision.create({
      data: {
        itemId,
        version,
        blocks: persisted.blocks,
        composition: persisted.composition,
        translations: translations as unknown as Prisma.InputJsonValue,
        message: options?.message ?? "Published",
        status: "PUBLISHED",
      },
    });
    const updated = await tx.contentItem.update({
      where: { id: itemId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        scheduledAt: null,
        publishedRevisionId: revision.id,
        workingRevisionId: revision.id,
        blocks: persisted.blocks,
        composition: persisted.composition,
      },
      include: { contentType: true },
    });
    return { item: updated, revisionId: revision.id };
  });
}
