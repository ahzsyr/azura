import type { EntityType, GraphEntity } from "../types";
import type { EntityStore } from "../entity-graph";
import { readPropertyValue } from "../entity-graph";

export type TopicNode = {
  entityPublicId: string;
  topic: string;
  intents: string[];
  questions: string[];
  contentPublicIds: string[];
};

export type ContentGap = {
  topic: string;
  missingIntents: string[];
  suggestedTitles: string[];
  impact: number;
};

const DEFAULT_INTENTS: Record<string, string[]> = {
  Product: ["overview", "installation", "programming", "coverage", "licensing", "maintenance", "comparison"],
  Solution: ["overview", "architecture", "deployment", "roi", "case-study"],
  Category: ["buying-guide", "comparison", "use-cases", "standards"],
  Industry: ["regulations", "use-cases", "solutions", "case-study"],
};

export async function buildTopicClusters(store: EntityStore): Promise<TopicNode[]> {
  const entities = await store.entities.list();
  const articles = entities.filter((e) => e.type === "Article" || e.type === "FAQ");
  const clusters: TopicNode[] = [];

  for (const entity of entities) {
    if (!["Product", "Solution", "Category", "Industry"].includes(entity.type)) continue;
    const topic =
      readPropertyValue<string>(entity, "name") ??
      readPropertyValue<string>(entity, "headline") ??
      entity.slug;
    const intents = DEFAULT_INTENTS[entity.type] ?? ["overview"];
    const contentPublicIds = articles
      .filter((article) => articleMentions(article, entity))
      .map((a) => a.publicId);

    clusters.push({
      entityPublicId: entity.publicId,
      topic,
      intents,
      questions: intents.map((intent) => `What about ${topic} ${intent}?`),
      contentPublicIds,
    });
  }

  return clusters;
}

function articleMentions(article: GraphEntity, entity: GraphEntity): boolean {
  const text = [
    readPropertyValue<string>(article, "name"),
    readPropertyValue<string>(article, "headline"),
    readPropertyValue<string>(article, "description"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const needle = (readPropertyValue<string>(entity, "name") ?? entity.slug).toLowerCase();
  return text.includes(needle) || text.includes(entity.slug);
}

export async function detectContentGaps(store: EntityStore): Promise<ContentGap[]> {
  const clusters = await buildTopicClusters(store);
  const gaps: ContentGap[] = [];

  for (const cluster of clusters) {
    const covered = new Set(
      cluster.contentPublicIds.map((id) => id.split("/").pop() ?? id),
    );
    const missingIntents = cluster.intents.filter((intent) => {
      return ![...covered].some((slug) => slug.includes(intent) || cluster.topic.toLowerCase().includes(intent));
    });

    // If there is little supporting content, treat most intents as missing.
    const effectiveMissing =
      cluster.contentPublicIds.length === 0 ? cluster.intents : missingIntents.slice(0, 4);

    if (effectiveMissing.length === 0) continue;

    gaps.push({
      topic: cluster.topic,
      missingIntents: effectiveMissing,
      suggestedTitles: effectiveMissing.map(
        (intent) => `${cluster.topic}: ${intent.replace(/-/g, " ")} guide`,
      ),
      impact: Math.min(1, 0.4 + effectiveMissing.length * 0.1 + (cluster.contentPublicIds.length === 0 ? 0.3 : 0)),
    });
  }

  return gaps.sort((a, b) => b.impact - a.impact);
}

export function detectCannibalization(entities: GraphEntity[]): Array<{ a: string; b: string; reason: string }> {
  const pages = entities.filter((e) => e.type === "Article" || e.type === "WebPage");
  const findings: Array<{ a: string; b: string; reason: string }> = [];

  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length; j++) {
      const aTitle = (readPropertyValue<string>(pages[i], "name") ?? pages[i].slug).toLowerCase();
      const bTitle = (readPropertyValue<string>(pages[j], "name") ?? pages[j].slug).toLowerCase();
      const aTokens = new Set(aTitle.split(/[^a-z0-9]+/).filter((t) => t.length > 3));
      const bTokens = bTitle.split(/[^a-z0-9]+/).filter((t) => t.length > 3);
      const overlap = bTokens.filter((t) => aTokens.has(t)).length;
      if (overlap >= 3) {
        findings.push({
          a: pages[i].publicId,
          b: pages[j].publicId,
          reason: `Potential keyword cannibalization (${overlap} overlapping tokens)`,
        });
      }
    }
  }

  return findings;
}

export type ContentEntityFocus = Extract<EntityType, "Product" | "Solution" | "Category" | "Industry">;
