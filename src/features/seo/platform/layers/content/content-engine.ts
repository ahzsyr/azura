import "server-only";

import { prisma } from "@/lib/prisma";
import { translationService } from "@/features/translation/translation.service";
import { toLocalizedRecord } from "@/features/translation/translation-resolver";
import type { PageBlocks } from "@/types/builder";
import { pluginSdk } from "../../plugin-sdk";
import { seoEventBus } from "../../event-bus/bus";
import type { ContentSnapshot, SeoExecutionContext } from "../../types";
import { extractContentFromBlocks } from "./block-extractor";
import { emptyDraft, freezeContentSnapshot, mergeAnalyzerDraft } from "./snapshot-builder";

async function loadFallbackTitle(
  entityType: string,
  entityId: string,
  locale: string
): Promise<string> {
  const translations = await translationService.getForEntity(entityType, entityId);
  const title = toLocalizedRecord(translations, "title");
  return title[locale] ?? title.en ?? "";
}

async function loadBlocks(entityType: string, entityId: string): Promise<PageBlocks | null> {
  if (entityType === "CmsPage" || entityType === "CMS_PAGE") {
    const page = await prisma.cmsPage.findUnique({
      where: { id: entityId },
      select: { blocks: true },
    });
    return (page?.blocks as PageBlocks) ?? null;
  }
  if (entityType === "Post" || entityType === "POST") {
    const post = await prisma.post.findUnique({
      where: { id: entityId },
      select: { blocks: true },
    });
    return (post?.blocks as PageBlocks) ?? null;
  }
  return null;
}

export async function buildContentSnapshot(ctx: SeoExecutionContext): Promise<ContentSnapshot> {
  await seoEventBus.emit("snapshot.requested", { ctx });

  const fallbackTitle = await loadFallbackTitle(ctx.entityType, ctx.entityId, ctx.locale);
  const blocks = await loadBlocks(ctx.entityType, ctx.entityId);
  let draft = blocks
    ? extractContentFromBlocks(blocks, fallbackTitle)
    : emptyDraft(fallbackTitle);

  if (!draft.title) draft.title = fallbackTitle;

  for (const analyzer of pluginSdk.getAnalyzers()) {
    const patch = await analyzer.analyze(ctx, draft);
    draft = mergeAnalyzerDraft(draft, patch);
  }

  const snapshot = freezeContentSnapshot(ctx, draft);
  await seoEventBus.emit("snapshot.built", { ctx, snapshot });
  return snapshot;
}
