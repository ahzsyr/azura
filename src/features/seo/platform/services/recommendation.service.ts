import { randomUUID } from "node:crypto";
import type {
  RecommendationInput,
  SeoExecutionContext,
  SeoRecommendation,
} from "../types";
import { ADS_LANDING_RELEVANCE_THRESHOLD } from "../analyzers/ads-landing-relevance";

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

  const relevance = input.snapshot.metadata?.adsLandingRelevance as
    | { score?: number; tokens?: string[] }
    | undefined;
  if (
    relevance &&
    Array.isArray(relevance.tokens) &&
    relevance.tokens.length > 0 &&
    typeof relevance.score === "number" &&
    relevance.score < ADS_LANDING_RELEVANCE_THRESHOLD
  ) {
    items.push(
      Object.freeze({
        id: "ads-landing-relevance",
        severity: "warn",
        message: `Ads campaign/ad-group names have low overlap with the title and H1 (${Math.round(relevance.score * 100)}%). Align landing copy with the ads message.`,
        actions: Object.freeze(["fix", "ignore"] as const),
        derivedFrom: Object.freeze(["signals"] as const),
      }),
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
