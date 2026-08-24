import "server-only";

import { pluginSdk } from "../plugin-sdk";
import { seoEventBus } from "../event-bus/bus";
import type { ContentSnapshot, SeoExecutionContext } from "../types";
import type { SeoEntityDescriptor } from "../types/entity-descriptor";
import { descriptorFromContext } from "../types/entity-descriptor";
import { extractContentFromBlocks } from "../layers/content/block-extractor";
import { emptyDraft, freezeContentSnapshot, mergeAnalyzerDraft } from "../layers/content/snapshot-builder";
import type { EntityTranslation } from "@prisma/client";
import { translationService } from "@/features/translation/translation.service";
import { toLocalizedRecord } from "@/features/translation/translation-resolver";
import { prisma } from "@/lib/prisma";
import type { PageBlocks } from "@/types/builder";

function normalizeLegacyEntityType(entityType: string): string {
  return entityType.toLowerCase().replace(/_/g, "");
}

async function loadLegacyBlocks(entityType: string, entityId: string): Promise<PageBlocks | null> {
  const normalized = normalizeLegacyEntityType(entityType);
  if (normalized === "cmspage") {
    const page = await prisma.cmsPage.findUnique({
      where: { id: entityId },
      select: { blocks: true },
    });
    return (page?.blocks as PageBlocks) ?? null;
  }
  if (normalized === "post") {
    const post = await prisma.post.findUnique({
      where: { id: entityId },
      select: { blocks: true },
    });
    return (post?.blocks as PageBlocks) ?? null;
  }
  if (normalized === "contentitem") {
    const item = await prisma.contentItem.findUnique({
      where: { id: entityId },
      select: { blocks: true },
    });
    return (item?.blocks as PageBlocks) ?? null;
  }
  return null;
}

async function loadLegacyFallbackTitle(
  entityType: string,
  entityId: string,
  locale: string
): Promise<string> {
  const normalized = normalizeLegacyEntityType(entityType);
  const translationEntityType =
    normalized === "contentitem"
      ? "ContentItem"
      : normalized === "cmspage"
        ? "CmsPage"
        : normalized === "post"
          ? "Post"
          : entityType;

  const translations = (await translationService.getForEntity(
    translationEntityType,
    entityId
  )) as EntityTranslation[];
  const seoTitle = toLocalizedRecord(translations, "seoTitle");
  const title = toLocalizedRecord(translations, "title");
  return (
    (seoTitle[locale] ?? seoTitle.en ?? "").trim() ||
    (title[locale] ?? title.en ?? "").trim()
  );
}

async function buildLegacySnapshot(ctx: SeoExecutionContext): Promise<ContentSnapshot> {
  const fallbackTitle = await loadLegacyFallbackTitle(ctx.entityType, ctx.entityId, ctx.locale);
  const blocks = await loadLegacyBlocks(ctx.entityType, ctx.entityId);
  let draft = blocks
    ? extractContentFromBlocks(blocks, fallbackTitle)
    : emptyDraft(fallbackTitle);
  if (!draft.title) draft.title = fallbackTitle;

  for (const analyzer of pluginSdk.getAnalyzers()) {
    const patch = await analyzer.analyze(ctx, draft);
    draft = mergeAnalyzerDraft(draft, patch);
  }

  return freezeContentSnapshot(ctx, draft);
}

export async function resolveDescriptor(
  ctx: SeoExecutionContext,
  descriptor?: SeoEntityDescriptor
): Promise<SeoEntityDescriptor> {
  if (descriptor) return descriptor;
  return descriptorFromContext(ctx.entityType, ctx.entityId, ctx.locale, ctx.metadata);
}

export async function buildSnapshotForDescriptor(
  ctx: SeoExecutionContext,
  descriptor: SeoEntityDescriptor
): Promise<ContentSnapshot> {
  await seoEventBus.emit("snapshot.requested", { ctx });

  const provider = pluginSdk.getEntityProvider(descriptor.kind);
  let draft;
  if (provider) {
    draft = await provider.buildSnapshot(descriptor);
  } else {
    return buildLegacySnapshot(ctx);
  }

  for (const analyzer of pluginSdk.getAnalyzers()) {
    const patch = await analyzer.analyze(ctx, draft);
    draft = mergeAnalyzerDraft(draft, patch);
  }

  const snapshotCtx = {
    ...ctx,
    entityType: descriptor.kind,
    entityId: descriptor.id,
  };
  const snapshot = freezeContentSnapshot(snapshotCtx, draft);
  await seoEventBus.emit("snapshot.built", { ctx, snapshot });
  return snapshot;
}

export const snapshotResolver = {
  resolveDescriptor,
  buildSnapshot: buildSnapshotForDescriptor,
};
