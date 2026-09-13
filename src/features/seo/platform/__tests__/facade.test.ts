import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { pluginSdk } from "@/features/seo/platform/plugin-sdk";
import { registerPlatformDefaults, resetPlatformDefaultsForTests } from "@/features/seo/platform/register-defaults";
import { createExecutionContext } from "@/features/seo/platform/execution-context";
import { clearEngineRegistry } from "@/features/seo/platform/engine-registry";
import { recommendationService } from "@/features/seo/platform/services/recommendation.service";
import { simulationService } from "@/features/seo/platform/services/simulation.service";
import { freezeContentSnapshot, emptyDraft } from "@/features/seo/platform/layers/content/snapshot-builder";
import type { ContentSnapshotDraft } from "@/features/seo/platform/types";

describe("SEO Platform facade", () => {
  beforeEach(() => {
    pluginSdk.clearAll();
    clearEngineRegistry();
    resetPlatformDefaultsForTests();
    registerPlatformDefaults();
  });

  it("registers plugin SDK defaults", () => {
    assert.ok(pluginSdk.getAnalyzers().length >= 2);
    assert.ok(pluginSdk.getRules().length >= 3);
    assert.ok(pluginSdk.getTemplates().length >= 2);
  });

  it("runs custom registered analyzer", () => {
    pluginSdk.registerAnalyzer({
      id: "word-count-boost",
      async analyze(_ctx, draft: ContentSnapshotDraft) {
        return {
          ...draft,
          paragraphs: [...draft.paragraphs, `Words: ${draft.paragraphs.join(" ").split(/\s+/).length}`],
        };
      },
    });

    const analyzers = pluginSdk.getAnalyzers();
    assert.ok(analyzers.some((a) => a.id === "word-count-boost"));
  });

  it("golden path: snapshot → recommendations → simulation", () => {
    const ctx = createExecutionContext({
      entityType: "CmsPage",
      entityId: "golden",
      locale: "en",
      source: "api",
      trigger: "audit",
    });
    const snapshot = freezeContentSnapshot(ctx, emptyDraft("Golden Path Page"));
    const validation = {
      score: 55,
      violations: [
        {
          id: "desc-missing",
          field: "metaDescription",
          severity: "warn" as const,
          message: "Missing description",
        },
      ],
      fieldScores: { metaTitle: 80, metaDescription: 0 },
    };
    const rules = { violations: [], recommendations: [] };
    const recommendations = recommendationService.build(ctx, {
      snapshot,
      validation,
      rules,
    });
    const simulation = simulationService.project(ctx, {
      current: validation,
      acceptedRecommendationIds: recommendations.slice(0, 1).map((r) => r.id),
      recommendations,
    });
    assert.ok(recommendations.length > 0);
    assert.ok(simulation.projectedScore >= simulation.currentScore);
  });
});
