import { generateRuleBasedSuggestion } from "../layers/intelligence/generation-engine";
import { evaluateRules } from "../layers/governance/rule-engine";
import type { ContentSnapshot, SeoExecutionContext, SeoSuggestion } from "../types";

export async function runGeneration(
  ctx: SeoExecutionContext,
  snapshot: ContentSnapshot
): Promise<SeoSuggestion> {
  const rules = await evaluateRules(ctx, snapshot);
  return generateRuleBasedSuggestion(ctx, snapshot, rules);
}
