import type { SearchQueryPlan, SearchRawRow } from "@/features/search-framework/types";
import {
  getSearchRankingConfig,
  type ResolvedSearchRankingConfig,
} from "@/features/search-framework/ranking/search-ranking-config";
import { getSearchSmartConfig } from "@/features/search/settings/resolve-search-smart-config";
import type { ResolvedSearchSmartConfig } from "@/features/search/settings/resolve-search-smart-config";
import {
  scoreFullTextRow,
  scoreLikeRow,
} from "@/features/search/core/ranking/scoring-core";

export type RankedHit = SearchRawRow & { score: number };

export class SearchRankingEngine {
  scoreFullTextRow(
    row: SearchRawRow,
    query: string,
    boost = 1,
    config = getSearchRankingConfig(),
    plan?: SearchQueryPlan,
    smartConfig?: ResolvedSearchSmartConfig
  ): number {
    const smart = smartConfig ?? getSearchSmartConfig();
    return scoreFullTextRow(row, query, boost, config, smart, plan);
  }

  scoreLikeRow(
    row: SearchRawRow,
    query: string,
    boost = 1,
    config = getSearchRankingConfig(),
    plan?: SearchQueryPlan,
    smartConfig?: ResolvedSearchSmartConfig
  ): number {
    const smart = smartConfig ?? getSearchSmartConfig();
    return scoreLikeRow(row, query, boost, config, smart, plan);
  }

  mergeRanked(
    fullTextRows: SearchRawRow[],
    likeRows: SearchRawRow[],
    query: string,
    boostByKey?: Map<string, number>,
    config = getSearchRankingConfig(),
    plan?: SearchQueryPlan,
    semanticBoostByKey?: Map<string, number>,
    analyticsBoostByKey?: Map<string, number>
  ): RankedHit[] {
    const map = new Map<string, RankedHit>();
    const smartConfig = getSearchSmartConfig();

    for (const row of fullTextRows) {
      const key = `${row.entityType}:${row.entityId}:${row.locale}`;
      const boost = boostByKey?.get(key) ?? this.readBoost(row);
      let score = this.scoreFullTextRow(row, query, boost, config, plan, smartConfig);
      score += this.semanticBonus(key, semanticBoostByKey, smartConfig.semantic.hybridWeight);
      score += analyticsBoostByKey?.get(key) ?? 0;
      map.set(key, { ...row, score });
    }

    for (const row of likeRows) {
      const key = `${row.entityType}:${row.entityId}:${row.locale}`;
      if (map.has(key)) continue;
      const boost = boostByKey?.get(key) ?? this.readBoost(row);
      let score = this.scoreLikeRow(row, query, boost, config, plan, smartConfig);
      score += this.semanticBonus(key, semanticBoostByKey, smartConfig.semantic.hybridWeight);
      score += analyticsBoostByKey?.get(key) ?? 0;
      map.set(key, { ...row, score });
    }

    return Array.from(map.values()).sort((a, b) => b.score - a.score);
  }

  private semanticBonus(
    key: string,
    semanticBoostByKey: Map<string, number> | undefined,
    hybridWeight: number
  ): number {
    if (!semanticBoostByKey?.size || hybridWeight <= 0) return 0;
    const sim = semanticBoostByKey.get(key);
    if (sim == null) return 0;
    return sim * 10 * hybridWeight;
  }

  private readBoost(row: SearchRawRow): number {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const boost = meta.searchBoost;
    return typeof boost === "number" && Number.isFinite(boost) ? boost : 1;
  }
}

export const searchRankingEngine = new SearchRankingEngine();
