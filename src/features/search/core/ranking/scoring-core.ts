import type { SearchQueryPlan, SearchRawRow } from "@/features/search-framework/types";
import { buildRankingSignalsFromRow } from "@/features/search-framework/indexing/ranking-signals-snapshot";
import {
  computeSmartLexicalBoost,
  computeTypoPenalty,
  smartScoreFromPlan,
} from "@/features/search-framework/ranking/search-smart-scoring";
import type { ResolvedSearchRankingConfig } from "@/features/search-framework/ranking/search-ranking-config";
import type { ResolvedSearchSmartConfig } from "@/features/search/settings/resolve-search-smart-config";
import type { SearchRankingSignalId } from "@/features/search/settings/search-ranking-signals";
import { multiKeywordScore, tokenize } from "@/features/search/core/text";

/** Multiplier applied to DB full-text relevance scores. */
export const FT_SCORE_MULTIPLIER = 10;

/** Base score for LIKE/substring matches (no DB relevance). */
export const LIKE_BASE_SCORE = 5;

/** Weight for priority-order tie-breaking bonus. */
export const TIE_BONUS_WEIGHT = 0.001;

/** Title weight normalization divisor for FT scoring. */
export const TITLE_WEIGHT_DIVISOR = 3;

type RankingSignals = ReturnType<typeof buildRankingSignalsFromRow>;

const SIGNAL_TEXT_FIELD: Partial<
  Record<SearchRankingSignalId, (s: RankingSignals) => string | undefined>
> = {
  title: (s) => s.title,
  description: (s) => s.description,
  tags: (s) => s.tags,
  category: (s) => s.categories,
  collection: (s) => s.collections,
  customField: (s) => s.customFields,
};

export function textMatchStrength(
  query: string,
  text: string | undefined,
  queryTokens: string[] | undefined,
  smartConfig: ResolvedSearchSmartConfig
): number {
  if (!text?.trim() || !query.trim()) return 0;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (t.includes(q)) return 1;
  const tokens = queryTokens?.length ? queryTokens : tokenize(q);
  if (tokens.length === 0) return 0;
  if (smartConfig.enableMultiKeyword) {
    return multiKeywordScore(tokens, t, smartConfig.multiKeywordMode);
  }
  const hits = tokens.filter((tok) => t.includes(tok)).length;
  return hits / tokens.length;
}

export function signalContribution(
  signal: SearchRankingSignalId,
  query: string,
  signals: RankingSignals,
  config: ResolvedSearchRankingConfig,
  queryTokens: string[] | undefined,
  smartConfig: ResolvedSearchSmartConfig
): number {
  const weight = config.weights[signal];
  if (weight <= 0) return 0;

  switch (signal) {
    case "title":
    case "description":
    case "tags":
    case "category":
    case "collection":
    case "customField": {
      const getter = SIGNAL_TEXT_FIELD[signal];
      return weight * textMatchStrength(query, getter?.(signals), queryTokens, smartConfig);
    }
    case "featured":
      return signals.featured ? weight : 0;
    case "popularity": {
      const pop = signals.popularity;
      if (pop == null || !Number.isFinite(pop)) return 0;
      const normalized = Math.min(1, Math.max(0, pop / 100));
      return weight * normalized;
    }
    case "recent": {
      if (!signals.publishedAt) return 0;
      const ts = new Date(signals.publishedAt).getTime();
      if (!Number.isFinite(ts)) return 0;
      const ageDays = (Date.now() - ts) / 86_400_000;
      const freshness = Math.max(0, 1 - ageDays / 365);
      return weight * freshness;
    }
    default:
      return 0;
  }
}

export function priorityTieBonus(
  signal: SearchRankingSignalId,
  query: string,
  signals: RankingSignals,
  order: SearchRankingSignalId[],
  queryTokens: string[] | undefined,
  smartConfig: ResolvedSearchSmartConfig
): number {
  const index = order.indexOf(signal);
  if (index < 0) return 0;
  let strength = 0;
  if (signal === "featured") {
    strength = signals.featured ? 1 : 0;
  } else if (signal === "popularity") {
    strength = signals.popularity != null ? 0.5 : 0;
  } else if (signal === "recent") {
    strength = signals.publishedAt ? 0.5 : 0;
  } else {
    const getter = SIGNAL_TEXT_FIELD[signal];
    strength = textMatchStrength(query, getter?.(signals), queryTokens, smartConfig);
  }
  if (strength <= 0) return 0;
  return (order.length - index) * TIE_BONUS_WEIGHT * strength;
}

export function computeSignalBoost(
  query: string,
  signals: RankingSignals,
  config: ResolvedSearchRankingConfig,
  queryTokens: string[] | undefined,
  smartConfig: ResolvedSearchSmartConfig
): number {
  let total = 0;
  for (const signal of config.priorityOrder) {
    total += signalContribution(signal, query, signals, config, queryTokens, smartConfig);
  }
  return total;
}

export function computePriorityTieBonus(
  query: string,
  signals: RankingSignals,
  config: ResolvedSearchRankingConfig,
  queryTokens: string[] | undefined,
  smartConfig: ResolvedSearchSmartConfig
): number {
  let bonus = 0;
  for (const signal of config.priorityOrder) {
    bonus += priorityTieBonus(signal, query, signals, config.priorityOrder, queryTokens, smartConfig);
  }
  return bonus;
}

export type ScoreRowOptions = {
  row: SearchRawRow;
  query: string;
  baseScore: number;
  boost?: number;
  config: ResolvedSearchRankingConfig;
  smartConfig: ResolvedSearchSmartConfig;
  plan?: SearchQueryPlan;
};

/** Shared scoring core for both full-text and LIKE rows. */
export function scoreRow({
  row,
  query,
  baseScore,
  boost = 1,
  config,
  smartConfig,
  plan,
}: ScoreRowOptions): number {
  const smartInput = plan
    ? smartScoreFromPlan(plan)
    : { phraseQuery: query, tokens: tokenize(query), expandedTokens: tokenize(query) };
  const typo = computeTypoPenalty(smartInput, row.title, smartConfig, config.enableTypoTolerance);
  const smartBoost = computeSmartLexicalBoost(smartInput, row.title, row.body, smartConfig);
  const signals = buildRankingSignalsFromRow(row);
  const signalBoost = computeSignalBoost(query, signals, config, plan?.tokens, smartConfig);
  const tieBonus = computePriorityTieBonus(query, signals, config, plan?.tokens, smartConfig);
  return baseScore * boost + signalBoost + smartBoost - typo + tieBonus;
}

export function scoreFullTextRow(
  row: SearchRawRow,
  query: string,
  boost: number,
  config: ResolvedSearchRankingConfig,
  smartConfig: ResolvedSearchSmartConfig,
  plan?: SearchQueryPlan
): number {
  const ftScore = row.relevance ?? 0;
  const titleWeight = config.weights.title;
  const baseScore = ftScore * FT_SCORE_MULTIPLIER * (titleWeight / TITLE_WEIGHT_DIVISOR);
  return scoreRow({ row, query, baseScore, boost, config, smartConfig, plan });
}

export function scoreLikeRow(
  row: SearchRawRow,
  query: string,
  boost: number,
  config: ResolvedSearchRankingConfig,
  smartConfig: ResolvedSearchSmartConfig,
  plan?: SearchQueryPlan
): number {
  return scoreRow({ row, query, baseScore: LIKE_BASE_SCORE, boost, config, smartConfig, plan });
}
