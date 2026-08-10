import assert from "node:assert/strict";
import test from "node:test";
import {
  createOperationsEngine,
  createSearchIntelligencePlatform,
  resetSearchIntelligencePlatformForTests,
  simulateSearchImpact,
  OPERATION_DEFINITIONS,
} from "../index";

test("risk policy auto-executes safe ops and gates high ops", async () => {
  const engine = createOperationsEngine();
  const safe = engine.enqueue({
    definitionId: "schema.rebuild",
    payload: {},
  });
  assert.equal(safe.status, "queued");
  await engine.execute(safe.id);
  assert.equal(engine.get(safe.id)?.status, "completed");

  const high = engine.enqueue({
    definitionId: "schema.publish",
    payload: {},
  });
  assert.equal(high.status, "waiting_approval");
  engine.approve(high.id, "admin");
  await engine.execute(high.id);
  assert.equal(engine.get(high.id)?.status, "completed");
  assert.ok(high.checkpointId);
});

test("critical ops require confirmation checkpoint and support undo", async () => {
  const platform = createSearchIntelligencePlatform({ siteOrigin: "https://brt.example" });
  await platform.ingestCompanyProfile({ name: "BRT Trading", phone: "+971500000000" });
  await platform.ingestSourceRecords([
    {
      source: "importer",
      sourceKey: "dup",
      entityType: "ExternalProfile",
      slug: "brt-trading-profile-99",
      properties: { url: "https://example.com/x" },
    },
  ]);

  const entities = await platform.store.entities.list();
  assert.ok(entities.length >= 2);

  const merge = platform.enqueueOperation({
    definitionId: "entity.merge",
    payload: {
      fromPublicId: entities[1].publicId,
      toPublicId: entities[0].publicId,
    },
  });
  assert.equal(merge.status, "waiting_approval");
  platform.operations.approve(merge.id, "admin");
  await platform.operations.execute(merge.id, "admin");
  const undone = platform.operations.undo(merge.id, "admin");
  assert.equal(undone.record.status, "rolled_back");
});

test("impact simulation returns actionable preview metrics", () => {
  const impact = simulateSearchImpact({
    currentTitle: "Wireless Radio Supplier Dubai",
    proposedTitle: "Professional Two-Way Radio Solutions UAE",
    currentDescription: "short",
    proposedDescription:
      "Professional supplier of DMR radios and wireless communication equipment across the United Arab Emirates.",
    schemaValid: true,
    improvesKnowledgeSignals: true,
  });
  assert.ok(impact.predictedCtrDeltaPct > 0);
  assert.equal(impact.knowledgeImpact, "improved");
  assert.ok(["safe", "moderate", "high", "critical"].includes(impact.risk));
});

test("automation fires product publish pipeline into operations queue", async () => {
  resetSearchIntelligencePlatformForTests();
  const platform = createSearchIntelligencePlatform({ siteOrigin: "https://brt.example" });
  const runs = await platform.automation.fire("product.published", {
    targetId: "entity://product/demo",
    targetLabel: "Demo Product",
  });
  assert.ok(runs.length >= 1);
  assert.ok(runs[0].operationIds.length >= 3);
  assert.ok(OPERATION_DEFINITIONS.length > 10);
});

test("command center exposes recommended actions", async () => {
  resetSearchIntelligencePlatformForTests();
  const platform = createSearchIntelligencePlatform({ siteOrigin: "https://brt.example" });
  await platform.ingestCompanyProfile({ name: "BRT Trading LLC" });
  const center = await platform.commandCenter();
  assert.ok(center.healthScore <= 100);
  assert.ok(center.recommended.length > 0);
  assert.ok(center.knowledgeReadiness > 0);
});
