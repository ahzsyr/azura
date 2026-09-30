import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adsLandingRelevanceScore } from "../ads-landing-relevance";
import { freezeContentSnapshot, emptyDraft } from "@/features/seo/platform/layers/content/snapshot-builder";
import { createExecutionContext } from "@/features/seo/platform/execution-context";
import { recommendationService } from "@/features/seo/platform/services/recommendation.service";

describe("adsLandingRelevanceScore", () => {
  it("scores overlapping campaign tokens against title and H1", () => {
    const result = adsLandingRelevanceScore({
      campaignName: "DMR Radios UAE",
      adGroupName: "Hytera handheld",
      title: "Hytera DMR radios in the UAE",
      h1: "Hytera handheld radios",
    });
    assert.ok(result.score >= 0.5);
    assert.ok(result.overlap.includes("hytera"));
  });

  it("returns a low score when ads tokens are absent from the landing page", () => {
    const result = adsLandingRelevanceScore({
      campaignName: "Warehouse forklifts",
      title: "About our company",
      h1: "Our story",
    });
    assert.ok(result.score < 0.25);
  });

  it("emits a recommendation when overlap is below the threshold", () => {
    const ctx = createExecutionContext({
      entityType: "CmsPage",
      entityId: "p1",
      locale: "en",
      source: "api",
      trigger: "audit",
    });
    const snapshot = freezeContentSnapshot(ctx, {
      ...emptyDraft("About our company"),
      headings: [{ level: 1, text: "Our story" }],
      metadata: {
        adsLandingRelevance: {
          score: 0,
          overlap: [],
          tokens: ["warehouse", "forklifts"],
        },
      },
    });
    const recs = recommendationService.build(ctx, {
      snapshot,
      validation: { score: 80, violations: [], fieldScores: {} },
      rules: { violations: [], recommendations: [] },
    });
    assert.ok(recs.some((item) => item.id === "ads-landing-relevance"));
  });
});
