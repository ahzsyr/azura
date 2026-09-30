import type { GraphEntity, GraphMetrics, PublicEntityId } from "../types";
import type { GraphQueryService, EntityStore } from "../entity-graph";

export type LinkRecommendation = {
  fromPublicId: PublicEntityId;
  toPublicId: PublicEntityId;
  reason: string;
  score: number;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export async function computeGraphMetrics(
  store: EntityStore,
  publicId: PublicEntityId,
): Promise<GraphMetrics> {
  const rels = await store.relationships.list();
  const entities = await store.entities.list();
  const n = Math.max(entities.length, 1);
  const inDegree = rels.filter((r) => r.toPublicId === publicId).length;
  const outDegree = rels.filter((r) => r.fromPublicId === publicId).length;

  // Lightweight approximations suitable for admin recommendations (not full graph algorithms).
  const pageRank = clamp01((1 - 0.85) / n + 0.85 * (inDegree / Math.max(n - 1, 1)));
  const betweenness = clamp01((inDegree * outDegree) / Math.max(n * n, 1));
  const hubScore = clamp01(outDegree / Math.max(n - 1, 1));
  const authorityScore = clamp01(inDegree / Math.max(n - 1, 1));
  const topicClusterDensity = clamp01((inDegree + outDegree) / Math.max(2 * (n - 1), 1));
  const averageClickDistance = outDegree === 0 ? 99 : clamp01(1 / outDegree) * 5;
  const internalLinkDepth = outDegree === 0 ? 99 : Math.max(1, Math.round(3 / Math.max(outDegree, 1)));

  return {
    pageRank,
    betweenness,
    hubScore,
    authorityScore,
    topicClusterDensity,
    averageClickDistance,
    internalLinkDepth,
    inDegree,
    outDegree,
  };
}

export async function recommendInternalLinks(
  query: GraphQueryService,
  store: EntityStore,
  fromPublicId: PublicEntityId,
  limit = 10,
): Promise<LinkRecommendation[]> {
  const from = await query.getEntity(fromPublicId);
  if (!from) return [];

  const metrics = await computeGraphMetrics(store, fromPublicId);
  const candidates = await store.entities.list();
  const existing = new Set(
    (await store.relationships.list({ fromPublicId })).map((r) => r.toPublicId),
  );

  const recommendations: LinkRecommendation[] = [];

  for (const candidate of candidates) {
    if (candidate.publicId === fromPublicId) continue;
    if (existing.has(candidate.publicId)) continue;

    let score = 0;
    let reason = "Topically related entity";

    if (from.type === "Product" && candidate.type === "Category") {
      score = 0.9;
      reason = "Product should link to its category";
    } else if (from.type === "Product" && candidate.type === "FAQ") {
      score = 0.85;
      reason = "Product has weak FAQ support links";
    } else if (from.type === "Product" && candidate.type === "Article") {
      score = 0.8;
      reason = "Product should reference supporting articles";
    } else if (from.type === "Article" && candidate.type === "Product") {
      score = 0.75;
      reason = "Article should mention related products";
    } else if (candidate.type === "WebPage") {
      score = 0.4;
      reason = "Connect orphan or supporting pages";
    } else {
      score = 0.3;
    }

    if (metrics.outDegree === 0) score += 0.2;
    if (metrics.inDegree > 10 && metrics.outDegree < 2) {
      score += 0.15;
      reason = `${reason} (hub with ${metrics.inDegree} inbound, ${metrics.outDegree} outbound)`;
    }

    recommendations.push({
      fromPublicId,
      toPublicId: candidate.publicId,
      reason,
      score: clamp01(score),
    });
  }

  return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function summarizeLinkHealth(metrics: GraphMetrics, entity: GraphEntity): string[] {
  const notes: string[] = [];
  if (metrics.inDegree === 0) notes.push(`${entity.publicId} is an orphan (0 inbound links).`);
  if (metrics.outDegree === 0) notes.push(`${entity.publicId} has no outbound links.`);
  if (metrics.inDegree >= 10 && metrics.outDegree === 0) {
    notes.push(`${entity.publicId} is a sink hub (${metrics.inDegree} inbound, 0 outbound).`);
  }
  return notes;
}
