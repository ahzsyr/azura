import "server-only";

import { runGeneration } from "../capabilities/generation";
import { runValidation } from "../capabilities/validation";
import { recommendationService } from "../services/recommendation.service";
import { evaluateRules } from "../layers/governance/rule-engine";
import { snapshotResolver } from "../services/snapshot.resolver";
import { seoDiffService } from "../services/seo-diff.service";
import { changeSetBuilder } from "../services/change-set.builder";
import { commitChangeSet } from "../capabilities/publishing";
import { pluginSdk } from "../plugin-sdk";
import { normalizeSeoSuggestion } from "../layers/quality/seo-normalizer";
import type {
  ContentSnapshot,
  SeoExecutionContext,
  SeoSuggestion,
  ValidationResult,
  RuleResult,
  SeoRecommendation,
} from "../types";
import type {
  ApplyMode,
  SeoChangeOrigin,
  SeoChangeSet,
} from "../types/change-set";
import type { SeoEntityDescriptor } from "../types/entity-descriptor";
import type { SeoDiffResult } from "../types/autofill";
import type { CapabilityPipelineDefinition } from "./pipelines/autofill.pipeline";
import { withPipelineOptions, getCapabilityPipeline } from "./pipelines/autofill.pipeline";

export type CapabilityPipelineResult = Readonly<{
  correlationId: string;
  descriptor: SeoEntityDescriptor;
  snapshot: ContentSnapshot;
  suggestion: SeoSuggestion;
  validation: ValidationResult;
  rules: RuleResult;
  recommendations: SeoRecommendation[];
  diff: SeoDiffResult;
  changeSet: SeoChangeSet;
  persisted: boolean;
  seoMetaId?: string;
}>;

export type CapabilityPipelineOptions = Readonly<{
  profileId?: string;
  applyMode?: ApplyMode;
  origin?: SeoChangeOrigin;
  descriptor?: SeoEntityDescriptor;
  fieldSelection?: ReadonlyArray<string>;
  includePublish?: boolean;
}>;

function resolveProfileId(profileId?: string): string {
  const id = profileId ?? "balanced";
  return pluginSdk.getGenerationProfile(id) ? id : "balanced";
}

export async function runCapabilityPipeline(
  pipelineId: "autofill",
  ctx: SeoExecutionContext,
  options: CapabilityPipelineOptions = {}
): Promise<CapabilityPipelineResult> {
  const base = getCapabilityPipeline(pipelineId);
  if (!base) throw new Error(`Unknown capability pipeline: ${pipelineId}`);

  const def: CapabilityPipelineDefinition = withPipelineOptions(base, {
    profileId: options.profileId,
    applyMode: options.applyMode,
    includePublish: options.includePublish,
  });

  const descriptor = await snapshotResolver.resolveDescriptor(ctx, options.descriptor);
  const origin = options.origin ?? "autofill";

  let snapshot: ContentSnapshot | undefined;
  let suggestion: SeoSuggestion | undefined;
  let validation: ValidationResult | undefined;
  let rules: RuleResult | undefined;
  let diff: SeoDiffResult | undefined;
  let changeSet: SeoChangeSet | undefined;
  let profileId = resolveProfileId(options.profileId);
  let applyMode: ApplyMode = options.applyMode ?? "preview";

  for (const step of def.steps) {
    switch (step.step) {
      case "snapshot":
        snapshot = await snapshotResolver.buildSnapshot(ctx, descriptor);
        break;
      case "generate":
        profileId = resolveProfileId(step.profileId);
        if (!snapshot) throw new Error("Pipeline error: snapshot required before generate");
        ctx = {
          ...ctx,
          metadata: {
            ...ctx.metadata,
            strategyId: pluginSdk.getGenerationProfile(profileId)?.strategyId,
            generationProfileId: profileId,
            providerId: pluginSdk.getGenerationProfile(profileId)?.providerId,
          },
        };
        suggestion = await runGeneration(ctx, snapshot);
        break;
      case "normalize":
        if (!snapshot || !suggestion) {
          throw new Error("Pipeline error: snapshot and suggestion required before normalize");
        }
        suggestion = await normalizeSeoSuggestion(ctx, snapshot, suggestion);
        break;
      case "validate":
        if (!snapshot) throw new Error("Pipeline error: snapshot required before validate");
        rules = await evaluateRules(ctx, snapshot);
        validation = await runValidation(ctx, { snapshot, suggestion });
        break;
      case "diff":
        if (!suggestion) throw new Error("Pipeline error: suggestion required before diff");
        diff = await seoDiffService.compare(descriptor, ctx.locale, suggestion);
        break;
      case "merge":
        applyMode = step.applyMode;
        if (!suggestion || !diff) throw new Error("Pipeline error: suggestion and diff required before merge");
        changeSet = changeSetBuilder.build({
          correlationId: ctx.correlationId,
          origin,
          descriptor,
          locale: ctx.locale,
          profileId,
          applyMode,
          suggestion,
          diff,
          fieldSelection: options.fieldSelection,
        });
        break;
      case "publish":
        if (!changeSet) throw new Error("Pipeline error: changeSet required before publish");
        if (step.when === "commit" && ctx.mode === "commit") {
          const seoMetaId = await commitChangeSet(ctx, changeSet);
          changeSet = Object.freeze({ ...changeSet, status: "applied" as const });
          return finalize(ctx, descriptor, snapshot!, suggestion!, validation!, rules!, diff!, changeSet, true, seoMetaId);
        }
        break;
    }
  }

  if (!snapshot || !suggestion || !validation || !rules || !diff || !changeSet) {
    throw new Error("Pipeline incomplete: missing required outputs");
  }

  return finalize(ctx, descriptor, snapshot, suggestion, validation, rules, diff, changeSet, false);
}

function finalize(
  ctx: SeoExecutionContext,
  descriptor: SeoEntityDescriptor,
  snapshot: ContentSnapshot,
  suggestion: SeoSuggestion,
  validation: ValidationResult,
  rules: RuleResult,
  diff: SeoDiffResult,
  changeSet: SeoChangeSet,
  persisted: boolean,
  seoMetaId?: string
): CapabilityPipelineResult {
  const recommendations = recommendationService.build(ctx, {
    snapshot,
    validation,
    rules,
  });

  return Object.freeze({
    correlationId: ctx.correlationId,
    descriptor,
    snapshot,
    suggestion,
    validation,
    rules,
    recommendations,
    diff,
    changeSet,
    persisted,
    seoMetaId,
  });
}

export const capabilityPipeline = {
  run: runCapabilityPipeline,
};
