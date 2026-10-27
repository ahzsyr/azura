import assert from "node:assert/strict";
import test from "node:test";
import { buildRecommendations } from "../recommendation.service";
import type { ContentSnapshot, RecommendationInput, SeoExecutionContext } from "../../types";

function snapshot(partial: Partial<ContentSnapshot>): ContentSnapshot {
  return {
    id: "snap-1",
    entityType: "pageKey",
    entityId: "home",
    localeCode: "en",
    title: "Welcome",
    headings: [{ level: 1, text: "Welcome" }],
    paragraphs: ["Hello world from our company."],
    tables: [],
    images: [],
    links: { internal: [], external: [] },
    faq: [],
    products: [],
    language: "en",
    signals: {
      h1Count: 1,
      h2Count: 0,
      wordCount: 5,
      paragraphCount: 1,
      imageCount: 0,
      imagesMissingAlt: 0,
      internalLinkCount: 1,
      externalLinkCount: 0,
      hasFaq: false,
      hasCta: false,
      hasTable: false,
      hasList: false,
    },
    capturedAt: new Date().toISOString(),
    ...partial,
  };
}

test("recommendations include topic evidence guidance without autoFix for placement", () => {
  const ctx = {
    entityType: "pageKey",
    entityId: "home",
    locale: "en",
    source: "manual",
    trigger: "audit",
    mode: "preview",
    correlationId: "test",
  } satisfies SeoExecutionContext;

  const input: RecommendationInput = {
    snapshot: snapshot({}),
    validation: { score: 80, violations: [], fieldScores: {} },
    rules: { violations: [], recommendations: [] },
    pageSearchTarget: {
      primaryTopic: "wireless networking UAE",
      supportingTopics: ["wifi 6"],
    },
  };

  const recs = buildRecommendations(ctx, input);
  const topicRecs = recs.filter((r) => r.derivedFrom.includes("evidence"));
  assert.ok(topicRecs.length >= 1);
  assert.ok(topicRecs.every((r) => !r.actions.includes("autoFix")));
});
