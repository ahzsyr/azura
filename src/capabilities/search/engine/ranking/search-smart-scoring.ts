import type { SearchQueryPlan } from "@/capabilities/search/engine/types";
import type { ResolvedSearchSmartConfig } from "@/capabilities/search/settings/resolve-search-smart-config";
import {
  exactMatchBoost,
  fuzzySimilarity,
  multiKeywordScore,
  partialMatchScore,
  typoScore,
} from "@/capabilities/search/search-text";

export type SmartScoreInput = {
  phraseQuery: string;
  tokens: string[];
  expandedTokens: string[];
};

export function smartScoreFromPlan(plan: SearchQueryPlan): SmartScoreInput {
  return {
    phraseQuery: plan.phraseQuery,
    tokens: plan.tokens,
    expandedTokens: plan.expandedTokens,
  };
}

export function computeSmartLexicalBoost(
  input: SmartScoreInput,
  title: string,
  body: string,
  config: ResolvedSearchSmartConfig
): number {
  const text = `${title} ${body}`;
  const mode = config.enableMultiKeyword ? config.multiKeywordMode : "any";

  let score = 0;

  if (config.enableMultiKeyword) {
    score += multiKeywordScore(input.tokens, text, mode) * 2.5;
    const synOnly = input.expandedTokens.filter((t) => !input.tokens.includes(t));
    if (synOnly.length && config.enableSynonyms) {
      score += multiKeywordScore(synOnly, text, "any") * 1.2;
    }
  }

  if (config.enablePartialMatch) {
    score += partialMatchScore(input.tokens, text) * 1.8;
  }

  if (config.enableFuzzy && config.typoMaxDistance > 0) {
    score += fuzzySimilarity(input.tokens, text, config.typoMaxDistance) * 2;
  }

  score += exactMatchBoost(input.phraseQuery, title, body, config.exactMatchBoost);

  return score;
}

export function computeTypoPenalty(
  input: SmartScoreInput,
  title: string,
  config: ResolvedSearchSmartConfig,
  enableTypoTolerance: boolean
): number {
  if (!enableTypoTolerance || !config.enableFuzzy) return 0;
  return typoScore(input.phraseQuery, title, config.typoMaxDistance);
}
