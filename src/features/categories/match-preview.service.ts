import "server-only";

import { matchPublishedProductsToRules } from "@/features/categories/direct-rule-match.service";
import type { DirectRuleSample } from "@/features/categories/matching/direct-matches";

export type MatchPreviewSample = DirectRuleSample;

export type MatchPreviewResult = {
  count: number;
  totalScanned: number;
  samples: MatchPreviewSample[];
};

/**
 * Preview Matching Rules against published catalog products (PRODUCT scope).
 * Count is the full direct-match set the live category page uses.
 * Empty rules → count 0 (contract).
 */
export async function previewProductRuleMatches(input: {
  conditions: unknown;
  locale?: string;
  sampleLimit?: number;
  explainEntityIdOrSlug?: string;
}): Promise<MatchPreviewResult> {
  const result = await matchPublishedProductsToRules(input.locale ?? "en-us", input.conditions, {
    sampleLimit: input.sampleLimit,
    explainEntityIdOrSlug: input.explainEntityIdOrSlug,
  });
  return {
    count: result.count,
    totalScanned: result.totalScanned,
    samples: result.samples,
  };
}
