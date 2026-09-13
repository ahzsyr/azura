import "server-only";

import { createExecutionContext } from "../execution-context";
import { capabilityPipeline } from "../orchestration/capability-pipeline";
import { seoDiffService } from "./seo-diff.service";
import { commitChangeSet } from "../capabilities/publishing";
import type { SeoExecutionContext } from "../types";
import type { SeoChangeSet } from "../types/change-set";
import type {
  AutoFillCommitOptions,
  AutoFillCommitResult,
  AutoFillSuggestOptions,
  AutoFillSuggestionResult,
} from "../types/autofill";
import { changeSetBuilder } from "./change-set.builder";

export async function suggestAutoFill(
  ctx: SeoExecutionContext,
  options: AutoFillSuggestOptions = {}
): Promise<AutoFillSuggestionResult> {
  const result = await capabilityPipeline.run("autofill", ctx, {
    profileId: options.profileId,
    applyMode: options.applyMode ?? "preview",
    origin: options.origin ?? "autofill",
    descriptor: options.descriptor,
  });

  const previewModel = seoDiffService.toPreviewModel(
    result.correlationId,
    result.descriptor,
    result.diff,
    result.validation
  );

  return Object.freeze({
    correlationId: result.correlationId,
    descriptor: result.descriptor,
    snapshot: result.snapshot,
    suggestion: result.suggestion,
    diff: result.diff,
    previewModel,
    changeSet: result.changeSet,
    validation: result.validation,
    rules: result.rules,
    recommendations: result.recommendations,
  });
}

export async function commitAutoFill(
  ctx: SeoExecutionContext,
  changeSet: SeoChangeSet,
  options: AutoFillCommitOptions = {}
): Promise<AutoFillCommitResult> {
  const merged = changeSetBuilder.build({
    correlationId: changeSet.correlationId,
    origin: "manual",
    descriptor: changeSet.descriptor,
    writeTarget: changeSet.writeTarget,
    locale: changeSet.locale,
    profileId: changeSet.profileId,
    applyMode: changeSet.applyMode === "preview" ? "overwrite_all" : changeSet.applyMode,
    suggestion: changeSetToSuggestion(changeSet),
    diff: await seoDiffService.compare(
      changeSet.descriptor,
      changeSet.locale,
      changeSetToSuggestion(changeSet),
      changeSet.writeTarget
    ),
    fieldSelection: options.fieldSelection,
  });

  const commitCtx: SeoExecutionContext = {
    ...ctx,
    mode: "commit",
    source: "autofill",
    trigger: "autofill",
  };

  const seoMetaId = await commitChangeSet(commitCtx, merged);
  return Object.freeze({
    changeSet: Object.freeze({ ...merged, status: "applied" as const }),
    seoMetaId,
  });
}

function changeSetToSuggestion(changeSet: SeoChangeSet) {
  const byField = new Map(changeSet.fields.map((f) => [f.field, f.next]));
  return Object.freeze({
    metaTitle: byField.get("metaTitle") ?? undefined,
    metaDescription: byField.get("metaDescription") ?? undefined,
    ogTitle: byField.get("ogTitle") ?? undefined,
    focusKeywords: byField.get("focusKeywords") ?? changeSet.metaFields?.focusKeywords ?? undefined,
    canonicalUrl: byField.get("canonicalUrl") ?? changeSet.metaFields?.canonicalUrl ?? undefined,
    robots: byField.get("robots") ?? changeSet.metaFields?.robots ?? undefined,
    ogImageUrl: byField.get("ogImageUrl") ?? changeSet.metaFields?.ogImageUrl ?? undefined,
    twitterCard: byField.get("twitterCard") ?? changeSet.metaFields?.twitterCard ?? undefined,
    jsonLd: changeSet.metaFields?.jsonLd,
    source: "manual" as const,
    provenance: Object.freeze({}),
  });
}

export const autofillService = {
  suggest: suggestAutoFill,
  commit: commitAutoFill,
};

export function createAutofillContext(
  entityType: string,
  entityId: string,
  locale: string,
  options?: { userId?: string; mode?: "preview" | "commit"; metadata?: Record<string, unknown> }
): SeoExecutionContext {
  return createExecutionContext({
    entityType,
    entityId,
    locale,
    source: "autofill",
    trigger: "autofill",
    mode: options?.mode ?? "preview",
    userId: options?.userId,
    metadata: options?.metadata,
  });
}
