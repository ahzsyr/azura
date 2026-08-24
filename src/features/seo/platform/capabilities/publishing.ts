import "server-only";

import { revalidateSeoMeta } from "@/services/cache";
import { translationService } from "@/features/translation/translation.service";
import { seoRepository } from "@/repositories/seo.repository";
import { seoTriggerService } from "@/features/seo/triggers/seo-trigger.service";
import { logChangeSet } from "../services/change-log.service";
import { seoEventBus } from "../event-bus/bus";
import type { SeoExecutionContext, SeoSuggestion } from "../types";
import type { SeoChangeSet } from "../types/change-set";

function stringifySuggestionJsonLd(jsonLd: unknown): string | null {
  if (jsonLd == null || jsonLd === "") return null;
  if (typeof jsonLd === "string") {
    const trimmed = jsonLd.trim();
    return trimmed || null;
  }
  try {
    return JSON.stringify(jsonLd);
  } catch {
    return null;
  }
}

function buildSeoTranslationInputs(
  seoMetaId: string,
  locale: string,
  suggestion: SeoSuggestion,
) {
  const inputs: Array<{
    entityType: "SeoMeta";
    entityId: string;
    field: string;
    localeCode: string;
    value: string;
    status: "PUBLISHED";
  }> = [];

  if (suggestion.metaTitle?.trim()) {
    inputs.push({
      entityType: "SeoMeta",
      entityId: seoMetaId,
      field: "metaTitle",
      localeCode: locale,
      value: suggestion.metaTitle,
      status: "PUBLISHED",
    });
  }
  if (suggestion.metaDescription?.trim()) {
    inputs.push({
      entityType: "SeoMeta",
      entityId: seoMetaId,
      field: "metaDescription",
      localeCode: locale,
      value: suggestion.metaDescription,
      status: "PUBLISHED",
    });
  }
  if (suggestion.ogTitle?.trim()) {
    inputs.push({
      entityType: "SeoMeta",
      entityId: seoMetaId,
      field: "ogTitle",
      localeCode: locale,
      value: suggestion.ogTitle,
      status: "PUBLISHED",
    });
  }
  if (suggestion.focusKeywords?.trim()) {
    inputs.push({
      entityType: "SeoMeta",
      entityId: seoMetaId,
      field: "focusKeywords",
      localeCode: locale,
      value: suggestion.focusKeywords,
      status: "PUBLISHED",
    });
  }
  if (suggestion.canonicalUrl?.trim()) {
    inputs.push({
      entityType: "SeoMeta",
      entityId: seoMetaId,
      field: "canonicalUrl",
      localeCode: locale,
      value: suggestion.canonicalUrl,
      status: "PUBLISHED",
    });
  }
  const jsonLdValue = stringifySuggestionJsonLd(suggestion.jsonLd);
  if (jsonLdValue) {
    inputs.push({
      entityType: "SeoMeta",
      entityId: seoMetaId,
      field: "jsonLd",
      localeCode: locale,
      value: jsonLdValue,
      status: "PUBLISHED",
    });
  }

  return inputs;
}

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
      jsonLd: suggestion.jsonLd as import("@prisma/client").Prisma.InputJsonValue | undefined,
    });
  } else {
    meta = await seoRepository.upsertMetaByEntity(entityType, entityId, {
      canonicalUrl: suggestion.canonicalUrl ?? null,
      robots: suggestion.robots ?? "index, follow",
      focusKeywords: suggestion.focusKeywords ?? null,
      ogImageUrl: suggestion.ogImageUrl ?? null,
      twitterCard: suggestion.twitterCard ?? "summary_large_image",
      jsonLd: suggestion.jsonLd as import("@prisma/client").Prisma.InputJsonValue | undefined,
    });
  }

  const inputs = buildSeoTranslationInputs(meta.id, ctx.locale, suggestion);
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

function changeSetFieldMap(changeSet: SeoChangeSet): Map<string, string | null> {
  return new Map(changeSet.fields.map((f) => [f.field, f.next]));
}

export async function commitChangeSet(
  ctx: SeoExecutionContext,
  changeSet: SeoChangeSet
): Promise<string> {
  const fields = changeSetFieldMap(changeSet);
  const meta = changeSet.metaFields ?? {};
  const wt = changeSet.writeTarget;

  const jsonLdRaw = fields.get("jsonLd") ?? meta.jsonLd;
  const jsonLd =
    typeof jsonLdRaw === "string" && jsonLdRaw.trim()
      ? (JSON.parse(jsonLdRaw) as unknown)
      : jsonLdRaw;

  const suggestion: SeoSuggestion = Object.freeze({
    metaTitle: fields.get("metaTitle") ?? undefined,
    metaDescription: fields.get("metaDescription") ?? undefined,
    ogTitle: fields.get("ogTitle") ?? undefined,
    focusKeywords: fields.get("focusKeywords") ?? meta.focusKeywords ?? undefined,
    canonicalUrl: fields.get("canonicalUrl") ?? meta.canonicalUrl ?? undefined,
    robots: fields.get("robots") ?? meta.robots ?? undefined,
    ogImageUrl: fields.get("ogImageUrl") ?? meta.ogImageUrl ?? undefined,
    twitterCard: fields.get("twitterCard") ?? meta.twitterCard ?? undefined,
    jsonLd,
    source: "manual",
    provenance: Object.freeze({}),
  });

  const persistCtx: SeoExecutionContext = {
    ...ctx,
    entityType: wt.cmsPageId
      ? "CmsPage"
      : wt.postId
        ? "Post"
        : wt.entityType ?? changeSet.descriptor.kind,
    entityId: wt.cmsPageId ?? wt.postId ?? wt.entityId ?? changeSet.descriptor.id,
    mode: "commit",
  };

  let seoMetaId: string;
  if (wt.pageKey) {
    const row = await seoRepository.upsertMetaByPageKey(wt.pageKey, {
      canonicalUrl: suggestion.canonicalUrl ?? null,
      robots: suggestion.robots ?? "index, follow",
      focusKeywords: suggestion.focusKeywords ?? null,
      ogImageUrl: suggestion.ogImageUrl ?? null,
      twitterCard: suggestion.twitterCard ?? "summary_large_image",
      jsonLd: suggestion.jsonLd as import("@prisma/client").Prisma.InputJsonValue | undefined,
    });
    seoMetaId = await persistTranslations(persistCtx, row.id, suggestion);
    revalidateSeoMeta("SITE", wt.pageKey, [persistCtx.locale]);
  } else if (wt.cmsPageId) {
    seoMetaId = await runPublishing({ ...persistCtx, entityType: "CmsPage", entityId: wt.cmsPageId }, suggestion);
  } else if (wt.postId) {
    seoMetaId = await runPublishing({ ...persistCtx, entityType: "Post", entityId: wt.postId }, suggestion);
  } else if (wt.packageId) {
    seoMetaId = await runPublishing(
      { ...persistCtx, entityType: "PACKAGE", entityId: wt.packageId },
      suggestion
    );
  } else if (wt.contentItemId) {
    seoMetaId = await runPublishing(
      { ...persistCtx, entityType: "ContentItem", entityId: wt.contentItemId },
      suggestion
    );
  } else {
    seoMetaId = await runPublishing(persistCtx, suggestion);
  }

  await seoTriggerService.handle({
    type: "seo.metadataUpdated",
    entityType: "CONTENT_ITEM",
    entityId: persistCtx.entityId,
    paths: [],
  });

  await logChangeSet(changeSet, ctx.userId);

  return seoMetaId;
}

async function persistTranslations(
  ctx: SeoExecutionContext,
  seoMetaId: string,
  suggestion: SeoSuggestion
): Promise<string> {
  const inputs = buildSeoTranslationInputs(seoMetaId, ctx.locale, suggestion);
  if (inputs.length) await translationService.upsertMany(inputs);
  await seoEventBus.emit("persist.completed", { ctx, entityId: seoMetaId });
  return seoMetaId;
}
