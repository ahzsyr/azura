import { expressionEngine } from "@/platform/schema-ui/expressions/evaluator";
import type { FormRoutingRule, FormTemplateDefinition } from "@/features/forms/types";
import type { SubmissionEntityRefs } from "./pipeline";

export type { SubmissionEntityRefs };

export function resolveSubmissionEntityRefs(
  definition: FormTemplateDefinition,
  context?: { values?: Record<string, unknown>; score?: number },
): SubmissionEntityRefs {
  const base: SubmissionEntityRefs = {
    pipelineType: definition.pipeline?.pipelineType,
    assigneeId: definition.pipeline?.defaultAssigneeId,
    tags: definition.pipeline?.defaultTags ?? [],
    customerId: definition.pipeline?.defaultCustomerId,
    companyId: definition.pipeline?.defaultCompanyId,
    campaignId: definition.pipeline?.defaultCampaignId,
  };

  if (!context?.values || !definition.routingRules?.length) {
    return base;
  }

  const exprCtx = { ...context.values, score: context.score ?? 0 };

  for (const rule of definition.routingRules) {
    if (!matchesRoutingRule(rule, exprCtx)) continue;
    return {
      pipelineType: rule.pipelineType ?? base.pipelineType,
      assigneeId: rule.assigneeId ?? base.assigneeId,
      tags: rule.tags?.length ? [...new Set([...base.tags, ...rule.tags])] : base.tags,
      customerId: rule.customerId ?? base.customerId,
      companyId: rule.companyId ?? base.companyId,
      campaignId: rule.campaignId ?? base.campaignId,
    };
  }

  return base;
}

export function matchesRoutingRule(
  rule: FormRoutingRule,
  context: Record<string, unknown>,
): boolean {
  if (!rule.condition.trim()) return true;
  try {
    const result = expressionEngine.evaluate(rule.condition, context);
    return Boolean(result);
  } catch {
    return false;
  }
}
