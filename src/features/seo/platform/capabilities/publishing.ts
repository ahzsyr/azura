import "server-only";

import { revalidateSeoMeta } from "@/services/cache";
import { translationService } from "@/features/translation/translation.service";
import { seoRepository } from "@/repositories/seo.repository";
import { seoTriggerService } from "@/features/seo/triggers/seo-trigger.service";
import { seoEventBus } from "../event-bus/bus";
import type { SeoExecutionContext, SeoSuggestion } from "../types";

export async function runPublishing(
  ctx: SeoExecutionContext,
  suggestion: SeoSuggestion
): Promise<string> {
  if (ctx.mode !== "commit") {
    await seoEventBus.emit("persist.requested", { ctx, suggestion });
    return ctx.entityId;
  }

  await seoEventBus.emit("persist.requested", { ctx, suggestion });

  const entityType = ctx.entityType;
  const entityId = ctx.entityId;

  let meta;
  if (entityType === "CmsPage" || entityType === "CMS_PAGE") {
    meta = await seoRepository.upsertMetaByCmsPage(entityId, {
      canonicalUrl: suggestion.canonicalUrl ?? null,
      robots: suggestion.robots ?? "index, follow",
      focusKeywords: suggestion.focusKeywords ?? null,
      ogImageUrl: suggestion.ogImageUrl ?? null,
      twitterCard: suggestion.twitterCard ?? "summary_large_image",
      jsonLd: suggestion.jsonLd as import("@prisma/client").Prisma.InputJsonValue | undefined,
    });
  } else if (entityType === "Post" || entityType === "POST") {
    meta = await seoRepository.upsertMetaByPost(entityId, {
      canonicalUrl: suggestion.canonicalUrl ?? null,
      robots: suggestion.robots ?? "index, follow",
      focusKeywords: suggestion.focusKeywords ?? null,
      ogImageUrl: suggestion.ogImageUrl ?? null,
      twitterCard: suggestion.twitterCard ?? "summary_large_image",
    });
  } else {
    meta = await seoRepository.upsertMetaByEntity(entityType, entityId, {
      canonicalUrl: suggestion.canonicalUrl ?? null,
      robots: suggestion.robots ?? "index, follow",
      focusKeywords: suggestion.focusKeywords ?? null,
      ogImageUrl: suggestion.ogImageUrl ?? null,
      twitterCard: suggestion.twitterCard ?? "summary_large_image",
    });
  }

  const inputs = [];
  if (suggestion.metaTitle?.trim()) {
    inputs.push({
      entityType: "SeoMeta" as const,
      entityId: meta.id,
      field: "metaTitle",
      localeCode: ctx.locale,
      value: suggestion.metaTitle,
      status: "PUBLISHED" as const,
    });
  }
  if (suggestion.metaDescription?.trim()) {
    inputs.push({
      entityType: "SeoMeta" as const,
      entityId: meta.id,
      field: "metaDescription",
      localeCode: ctx.locale,
      value: suggestion.metaDescription,
      status: "PUBLISHED" as const,
    });
  }
  if (suggestion.ogTitle?.trim()) {
    inputs.push({
      entityType: "SeoMeta" as const,
      entityId: meta.id,
      field: "ogTitle",
      localeCode: ctx.locale,
      value: suggestion.ogTitle,
      status: "PUBLISHED" as const,
    });
  }
  if (inputs.length) await translationService.upsertMany(inputs);

  revalidateSeoMeta(entityType, entityId, [ctx.locale]);

  await seoEventBus.emit("persist.completed", { ctx, entityId: meta.id });

  if (ctx.trigger === "page_save" || ctx.source === "publish") {
    await seoTriggerService.handle({
      type: "seo.metadataUpdated",
      entityType: "CONTENT_ITEM",
      entityId,
      paths: [],
    });
  }

  return meta.id;
}
