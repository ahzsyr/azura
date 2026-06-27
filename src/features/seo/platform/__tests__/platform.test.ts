import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { freezeContentSnapshot, emptyDraft } from "@/features/seo/platform/layers/content/snapshot-builder";
import { createExecutionContext } from "@/features/seo/platform/execution-context";
import { seoEventBus } from "@/features/seo/platform/event-bus/bus";
import { pluginSdk } from "@/features/seo/platform/plugin-sdk";
import { registerPlatformDefaults, resetPlatformDefaultsForTests } from "@/features/seo/platform/register-defaults";
import { recommendationService } from "@/features/seo/platform/services/recommendation.service";
import { simulationService } from "@/features/seo/platform/services/simulation.service";

describe("SEO Platform", () => {
  beforeEach(() => {
    pluginSdk.clearAll();
    resetPlatformDefaultsForTests();
    registerPlatformDefaults();
  });

  it("freezes ContentSnapshot", () => {
    const ctx = createExecutionContext({
      entityType: "CmsPage",
      entityId: "page-1",
      locale: "en",
      source: "api",
      trigger: "audit",
    });
    const snapshot = freezeContentSnapshot(ctx, emptyDraft("Hello"));
    assert.equal(Object.isFrozen(snapshot), true);
    assert.equal(Object.isFrozen(snapshot.signals), true);
    assert.equal(Object.isFrozen(snapshot.headings), true);
  });

  it("registers default analyzers, rules, and templates", () => {
    assert.ok(pluginSdk.getAnalyzers().length >= 2);
    assert.ok(pluginSdk.getRules().length >= 3);
    assert.ok(pluginSdk.getTemplates().length >= 2);
    assert.ok(pluginSdk.getProviders().length >= 2);
  });

  it("emits event bus sequence for snapshot build request", async () => {
    const events: string[] = [];
    seoEventBus.on("snapshot.requested", async () => {
      events.push("snapshot.requested");
    });
    const ctx = createExecutionContext({
      entityType: "CmsPage",
      entityId: "missing",
      locale: "en",
      source: "api",
      trigger: "audit",
    });
    await seoEventBus.emit("snapshot.requested", { ctx });
    assert.deepEqual(events, ["snapshot.requested"]);
  });

  it("builds recommendations from validation and signals", () => {
    const ctx = createExecutionContext({
      entityType: "CmsPage",
      entityId: "p1",
      locale: "en",
      source: "api",
      trigger: "audit",
    });
    const snapshot = freezeContentSnapshot(ctx, emptyDraft("Title"));
    const validation = {
      score: 70,
      violations: [
        {
          id: "title-length-en",
          field: "metaTitle",
          severity: "warn" as const,
          message: "Too short",
        },
      ],
      fieldScores: { metaTitle: 50 },
    };
    const rules = { violations: [], recommendations: [] };
    const recs = recommendationService.build(ctx, { snapshot, validation, rules });
    assert.ok(recs.some((r) => r.id === "val-title-length-en"));
    assert.ok(recs.some((r) => r.id === "signal-h1"));
  });

  it("projects simulation score from accepted recommendations", () => {
    const ctx = createExecutionContext({
      entityType: "CmsPage",
      entityId: "p1",
      locale: "en",
      source: "api",
      trigger: "audit",
    });
    const current = {
      score: 60,
      violations: [],
      fieldScores: {},
    };
    const recommendations = [
      {
        id: "rec-1",
        severity: "critical" as const,
        message: "Fix title",
        actions: ["fix"] as const,
        derivedFrom: ["validation"] as const,
      },
    ];
    const sim = simulationService.project(ctx, {
      current,
      acceptedRecommendationIds: ["rec-1"],
      recommendations,
    });
    assert.ok(sim.projectedScore > sim.currentScore);
    assert.equal(sim.delta, sim.projectedScore - sim.currentScore);
  });
});
