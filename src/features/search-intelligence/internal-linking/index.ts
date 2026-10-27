import type { GraphEntity, GraphMetrics, PublicEntityId } from "../types";
import type { GraphQueryService, EntityStore } from "../entity-graph";
import { readPropertyValue } from "../entity-graph";
import { normalizeSiteKey } from "../content-intelligence/page-search-target";

export type LinkRelationship =
  | "product_to_category"
  | "product_to_faq"
  | "product_to_article"
  | "article_to_product"
  | "support_page"
  | "related";

export type LinkRecommendation = {
  fromPublicId: PublicEntityId;
  toPublicId: PublicEntityId;
  siteKey: string;
  locale: string;
  suggestedAnchor: string;
  relationship: LinkRelationship;
  reason: string;
  score: number;
  /** Final href must be resolved at render/ops time via route + locale + site URL policy. */
};

export type RecommendInternalLinksOptions = {
  siteKey?: string;
  locale?: string;
  limit?: number;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function defaultAnchor(entity: GraphEntity): string {
  return (
    readPropertyValue<string>(entity, "name") ??
    readPropertyValue<string>(entity, "headline") ??
    entity.slug
  );
}

function classifyRelationship(
  fromType: string,
  toType: string,
): { relationship: LinkRelationship; score: number; reason: string } {
  if (fromType === "Product" && toType === "Category") {
    return {
      relationship: "product_to_category",
      score: 0.9,
      reason: "Product should link to its category",
    };
  }
  if (fromType === "Product" && toType === "FAQ") {
    return {
      relationship: "product_to_faq",
      score: 0.85,
      reason: "Product has weak FAQ support links",
    };
  }
  if (fromType === "Product" && toType === "Article") {
    return {
      relationship: "product_to_article",
      score: 0.8,
      reason: "Product should reference supporting articles",
    };
  }
  if (fromType === "Article" && toType === "Product") {
    return {
      relationship: "article_to_product",
      score: 0.75,
      reason: "Article should mention related products",
    };
  }
  if (toType === "WebPage") {
    return {
      relationship: "support_page",
      score: 0.4,
      reason: "Connect orphan or supporting pages",
    };
  }
  return {
    relationship: "related",
    score: 0.3,
    reason: "Topically related entity",
  };
}

/**
 * Filter out targets that look like parameterized crawl traps.
 * Href resolution remains the caller's responsibility via the site URL layer.
 */
export function isIndexableLinkTarget(publicId: PublicEntityId): boolean {
  const lower = publicId.toLowerCase();
  if (lower.includes("?") || lower.includes("&") || lower.includes("=")) return false;
  if (lower.includes("/filter/") || lower.includes("/page/")) return false;
  return true;
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
  limitOrOptions: number | RecommendInternalLinksOptions = 10,
): Promise<LinkRecommendation[]> {
  const options: RecommendInternalLinksOptions =
    typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
  const limit = options.limit ?? 10;
  const siteKey = normalizeSiteKey(options.siteKey ?? "https://localhost");
  const locale = options.locale ?? "en";

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
    if (!isIndexableLinkTarget(candidate.publicId)) continue;

    const classified = classifyRelationship(from.type, candidate.type);
    let score = classified.score;
    let reason = classified.reason;

    if (metrics.outDegree === 0) score += 0.2;
    if (metrics.inDegree > 10 && metrics.outDegree < 2) {
      score += 0.15;
      reason = `${reason} (hub with ${metrics.inDegree} inbound, ${metrics.outDegree} outbound)`;
    }

    recommendations.push({
      fromPublicId,
      toPublicId: candidate.publicId,
      siteKey,
      locale,
      suggestedAnchor: defaultAnchor(candidate),
      relationship: classified.relationship,
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

/** Inbound evidence notes for admin guidance (Phase 3). */
export function inboundLinkGuidance(metrics: GraphMetrics, entity: GraphEntity): string[] {
  const notes = summarizeLinkHealth(metrics, entity);
  if (metrics.inDegree > 0 && metrics.inDegree < 2) {
    notes.push(
      `${entity.publicId} has weak inbound support (${metrics.inDegree}). Prefer descriptive anchors from related hubs.`,
    );
  }
  return notes;
}
