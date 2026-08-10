import type { SearchRankingSettings } from "@/capabilities/search/settings/admin-search-settings.schema";
import {
  DEFAULT_RANKING_PRIORITY_ORDER,
  DEFAULT_RANKING_WEIGHTS,
  normalizeRankingPriorityOrder,
  normalizeRankingWeights,
  type SearchRankingSignalId,
} from "@/capabilities/search/settings/search-ranking-signals";

export type ResolvedSearchRankingConfig = {
  weights: Record<SearchRankingSignalId, number>;
  priorityOrder: SearchRankingSignalId[];
  enableTypoTolerance: boolean;
  arabicLikeFallback: boolean;
};

const DEFAULT_CONFIG: ResolvedSearchRankingConfig = {
  weights: { ...DEFAULT_RANKING_WEIGHTS },
  priorityOrder: [...DEFAULT_RANKING_PRIORITY_ORDER],
  enableTypoTolerance: true,
  arabicLikeFallback: false,
};

let cached: ResolvedSearchRankingConfig | null = null;

export function resolveSearchRankingConfig(
  ranking: SearchRankingSettings | undefined
): ResolvedSearchRankingConfig {
  if (!ranking) return { ...DEFAULT_CONFIG };
  return {
    weights: normalizeRankingWeights(
      ranking.weights as Partial<Record<SearchRankingSignalId, number>>,
      ranking.titleFieldWeight
    ),
    priorityOrder: normalizeRankingPriorityOrder(ranking.priorityOrder),
    enableTypoTolerance: ranking.enableTypoTolerance !== false,
    arabicLikeFallback: ranking.arabicLikeFallback !== false,
  };
}

export function setSearchRankingConfig(config: ResolvedSearchRankingConfig): void {
  cached = config;
}

export function getSearchRankingConfig(): ResolvedSearchRankingConfig {
  return cached ?? { ...DEFAULT_CONFIG };
}
