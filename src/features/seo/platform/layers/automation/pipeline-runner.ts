import "server-only";

import { runPublishing } from "../../capabilities/publishing";
import { seoEventBus } from "../../event-bus/bus";
import { buildContentSnapshot } from "../content/content-engine";
import { generateRuleBasedSuggestion } from "../intelligence/generation-engine";
import { evaluateRules } from "../governance/rule-engine";
import { validateAndEmit } from "../governance/validation-engine";
import { loadPipeline, resolvePipelineId } from "../../pipelines/pipeline-loader";
import { recommendationService } from "../../services/recommendation.service";
import type {
  AutomationRunResult,
  SeoExecutionContext,
  SeoSuggestion,
  ValidationViolation,
} from "../../types";

export async function runAutomationPipeline(
  ctx: SeoExecutionContext,
  pipelineId?: string
): Promise<AutomationRunResult> {
  const id = resolvePipelineId(ctx, pipelineId);
  const pipeline = (await loadPipeline(id)) ?? (await loadPipeline("validate-only"))!;
  const events: string[] = [];

  await seoEventBus.emit("pipeline.started", { ctx, pipelineId: id });
  events.push("pipeline.started");

  let snapshot = await buildContentSnapshot(ctx);
  events.push("snapshot.built");

  let suggestion: SeoSuggestion | undefined;
  let validation;
  let rules;
  let recommendations;

  for (const step of pipeline.steps) {
    if (step.kind === "capability") {
      switch (step.capability) {
        case "analysis":
          snapshot = await buildContentSnapshot(ctx);
          break;
        case "generation":
          rules = await evaluateRules(ctx, snapshot);
          suggestion = await generateRuleBasedSuggestion(ctx, snapshot, rules);
          break;
        case "validation":
          validation = await validateAndEmit(ctx, {
            snapshot,
            suggestion,
          });
          if (
            step.onCritical === "halt" &&
            validation.violations.some((v: ValidationViolation) => v.severity === "critical")
          ) {
            break;
          }
          break;
        case "publishing":
          if (suggestion) {
            await runPublishing(ctx, suggestion);
            events.push("persist.completed");
          }
          break;
      }
    } else if (step.kind === "service" && step.service === "recommendations") {
      rules = rules ?? (await evaluateRules(ctx, snapshot));
      validation =
        validation ??
        (await validateAndEmit(ctx, { snapshot, suggestion }));
      recommendations = recommendationService.build(ctx, {
        snapshot,
        validation,
        rules,
      });
      await seoEventBus.emit("recommendations.ready", {
        ctx,
        recommendations,
      });
      events.push("recommendations.ready");
    } else if (step.kind === "gate" && step.gate === "approval") {
      if (step.requiredWhen?.source && ctx.source !== step.requiredWhen.source) {
        continue;
      }
      if (ctx.mode === "preview") continue;
    } else if (step.kind === "event" && step.event === "submit") {
      events.push("submit.delegated");
    }
  }

  await seoEventBus.emit("pipeline.completed", { ctx, pipelineId: id });
  events.push("pipeline.completed");

  return Object.freeze({
    pipelineId: id,
    correlationId: ctx.correlationId,
    snapshot,
    suggestion,
    validation,
    rules,
    recommendations,
    persisted: ctx.mode === "commit" && Boolean(suggestion),
    events: Object.freeze([...events]),
  });
}
