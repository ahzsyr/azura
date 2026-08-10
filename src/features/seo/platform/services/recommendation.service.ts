import { randomUUID } from "node:crypto";
import type {
  ContentSnapshot,
  RecommendationInput,
  RuleResult,
  SeoExecutionContext,
  SeoRecommendation,
  ValidationResult,
} from "../types";

export function buildRecommendations(
  _ctx: SeoExecutionContext,
  input: RecommendationInput
): SeoRecommendation[] {
  const items: SeoRecommendation[] = [];

  for (const violation of input.validation.violations) {
    items.push(
      Object.freeze({
        id: `val-${violation.id}`,
        severity: violation.severity,
        message: violation.message,
        suggestedFix: violation.field
          ? { [violation.field]: undefined }
          : undefined,
        actions: Object.freeze(["fix", "autoFix", "ignore"] as const),
        derivedFrom: Object.freeze(["validation"] as const),
      })
    );
  }

  for (const rule of input.rules.violations) {
    items.push(
      Object.freeze({
        id: `rule-${rule.ruleId}-${randomUUID().slice(0, 8)}`,
        severity: rule.severity,
        message: rule.message,
        actions: Object.freeze(["fix", "autoFix", "ignore"] as const),
        derivedFrom: Object.freeze(["rules"] as const),
      })
    );
  }

  const { signals } = input.snapshot;
  if (signals.h1Count === 0) {
    items.push(
      Object.freeze({
        id: "signal-h1",
        severity: "warn",
        message: "Add an H1 heading to improve page structure",
        actions: Object.freeze(["fix", "ignore"] as const),
        derivedFrom: Object.freeze(["signals"] as const),
      })
    );
  }
  if (signals.imagesMissingAlt > 0) {
    items.push(
      Object.freeze({
        id: "signal-alt",
        severity: "info",
        message: `${signals.imagesMissingAlt} image(s) missing alt text`,
        actions: Object.freeze(["fix", "ignore"] as const),
        derivedFrom: Object.freeze(["signals"] as const),
      })
    );
  }
  if (signals.internalLinkCount === 0) {
    items.push(
      Object.freeze({
        id: "signal-internal-links",
        severity: "info",
        message: "No internal links detected — consider adding contextual links",
        actions: Object.freeze(["fix", "ignore"] as const),
        derivedFrom: Object.freeze(["signals"] as const),
      })
    );
  }

  return items;
}

export const recommendationService = {
  build(
    ctx: SeoExecutionContext,
    input: RecommendationInput
  ): SeoRecommendation[] {
    return buildRecommendations(ctx, input);
  },
};
