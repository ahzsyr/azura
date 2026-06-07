import type { SearchQueryPlan, SearchRawRow } from "@/features/search-framework/types";
import { buildRankingSignalsFromRow } from "@/features/search-framework/indexing/ranking-signals-snapshot";
import {
  computeSmartLexicalBoost,
  computeTypoPenalty,
  smartScoreFromPlan,
} from "@/features/search-framework/ranking/search-smart-scoring";
import {
  getSearchRankingConfig,
  type ResolvedSearchRankingConfig,
} from "@/features/search-framework/ranking/search-ranking-config";
import { getSearchSmartConfig } from "@/features/search/settings/resolve-search-smart-config";
import type { SearchRankingSignalId } from "@/features/search/settings/search-ranking-signals";
import { multiKeywordScore, tokenize } from "@/features/search/search-text";

export type RankedHit = SearchRawRow & { score: number };

function textMatchStrength(
  query: string,
  text: string | undefined,
  queryTokens?: string[]
): number {
  if (!text?.trim() || !query.trim()) return 0;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (t.includes(q)) return 1;
  const tokens = queryTokens?.length ? queryTokens : tokenize(q);
  if (tokens.length === 0) return 0;
  const smart = getSearchSmartConfig();
  if (smart.enableMultiKeyword) {
    return multiKeywordScore(tokens, t, smart.multiKeywordMode);
  }
  const hits = tokens.filter((tok) => t.includes(tok)).length;
  return hits / tokens.length;
}

function signalContribution(
  signal: SearchRankingSignalId,
  query: string,
  signals: ReturnType<typeof buildRankingSignalsFromRow>,
  config: ResolvedSearchRankingConfig,
  queryTokens?: string[]
): number {
  const weight = config.weights[signal];
  if (weight <= 0) return 0;

  switch (signal) {
    case "title":
      return weight * textMatchStrength(query, signals.title, queryTokens);
    case "description":
      return weight * textMatchStrength(query, signals.description, queryTokens);
    case "tags":
      return weight * textMatchStrength(query, signals.tags, queryTokens);
    case "category":
      return weight * textMatchStrength(query, signals.categories, queryTokens);
    case "collection":
      return weight * textMatchStrength(query, signals.collections, queryTokens);
    case "customField":
      return weight * textMatchStrength(query, signals.customFields, queryTokens);
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

function priorityTieBonus(
  signal: SearchRankingSignalId,
  query: string,
  signals: ReturnType<typeof buildRankingSignalsFromRow>,
  order: SearchRankingSignalId[],
  queryTokens?: string[]
): number {
  const index = order.indexOf(signal);
  if (index < 0) return 0;
  const strength =
    signal === "featured"
      ? signals.featured
        ? 1
        : 0
      : signal === "popularity"
        ? signals.popularity != null
          ? 0.5
          : 0
        : signal === "recent"
          ? signals.publishedAt
            ? 0.5
            : 0
          : textMatchStrength(
              query,
              signal === "title"
                ? signals.title
                : signal === "description"
                  ? signals.description
                  : signal === "tags"
                    ? signals.tags
                    : signal === "category"
                      ? signals.categories
                      : signal === "collection"
                        ? signals.collections
                        : signal === "customField"
                          ? signals.customFields
                          : undefined,
              queryTokens
            );
  if (strength <= 0) return 0;
  return (order.length - index) * 0.001 * strength;
}

export class SearchRankingEngine {
  scoreFullTextRow(
    row: SearchRawRow,
    query: string,
    boost = 1,
    config = getSearchRankingConfig(),
    plan?: SearchQueryPlan
  ): number {
    const smartConfig = getSearchSmartConfig();
    const smartInput = plan ? smartScoreFromPlan(plan) : { phraseQuery: query, tokens: tokenize(query), expandedTokens: tokenize(query) };
    const typo = computeTypoPenalty(smartInput, row.title, smartConfig, config.enableTypoTolerance);
    const smartBoost = computeSmartLexicalBoost(smartInput, row.title, row.body, smartConfig);
    const ftScore = row.relevance ?? 0;
    const titleWeight = config.weights.title;
    const signals = buildRankingSignalsFromRow(row);
    const signalBoost = this.computeSignalBoost(query, signals, config, plan?.tokens);
    const tieBonus = this.computePriorityTieBonus(query, signals, config, plan?.tokens);
    return ftScore * 10 * boost * (titleWeight / 3) + signalBoost + smartBoost - typo + tieBonus;
  }

  scoreLikeRow(
    row: SearchRawRow,
    query: string,
    boost = 1,
    config = getSearchRankingConfig(),
    plan?: SearchQueryPlan
  ): number {
    const smartConfig = getSearchSmartConfig();
    const smartInput = plan ? smartScoreFromPlan(plan) : { phraseQuery: query, tokens: tokenize(query), expandedTokens: tokenize(query) };
    const typo = computeTypoPenalty(smartInput, row.title, smartConfig, config.enableTypoTolerance);
    const smartBoost = computeSmartLexicalBoost(smartInput, row.title, row.body, smartConfig);
    const signals = buildRankingSignalsFromRow(row);
    const signalBoost = this.computeSignalBoost(query, signals, config, plan?.tokens);
    const tieBonus = this.computePriorityTieBonus(query, signals, config, plan?.tokens);
    return 5 * boost + signalBoost + smartBoost - typo + tieBonus;
  }

  computeSignalBoost(
    query: string,
    signals: ReturnType<typeof buildRankingSignalsFromRow>,
    config: ResolvedSearchRankingConfig,
    queryTokens?: string[]
  ): number {
    let total = 0;
    for (const signal of config.priorityOrder) {
      total += signalContribution(signal, query, signals, config, queryTokens);
    }
    return total;
  }

  computePriorityTieBonus(
    query: string,
    signals: ReturnType<typeof buildRankingSignalsFromRow>,
    config: ResolvedSearchRankingConfig,
    queryTokens?: string[]
  ): number {
    let bonus = 0;
    for (const signal of config.priorityOrder) {
      bonus += priorityTieBonus(signal, query, signals, config.priorityOrder, queryTokens);
    }
    return bonus;
  }

  mergeRanked(
    fullTextRows: SearchRawRow[],
    likeRows: SearchRawRow[],
    query: string,
    boostByKey?: Map<string, number>,
    config = getSearchRankingConfig(),
    plan?: SearchQueryPlan,
    semanticBoostByKey?: Map<string, number>
  ): RankedHit[] {
    const map = new Map<string, RankedHit>();
    const smart = getSearchSmartConfig();

    for (const row of fullTextRows) {
      const key = `${row.entityType}:${row.entityId}:${row.locale}`;
      const boost = boostByKey?.get(key) ?? this.readBoost(row);
      let score = this.scoreFullTextRow(row, query, boost, config, plan);
      score += this.semanticBonus(key, semanticBoostByKey, smart.semantic.hybridWeight);
      map.set(key, { ...row, score });
    }

    for (const row of likeRows) {
      const key = `${row.entityType}:${row.entityId}:${row.locale}`;
      if (map.has(key)) continue;
      const boost = boostByKey?.get(key) ?? this.readBoost(row);
      let score = this.scoreLikeRow(row, query, boost, config, plan);
      score += this.semanticBonus(key, semanticBoostByKey, smart.semantic.hybridWeight);
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
