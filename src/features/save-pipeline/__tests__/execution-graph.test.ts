import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileExecutionGraph, deriveMutationSignals } from "@/features/save-pipeline/execution-graph";
import { getExecutionProfile } from "@/features/save-pipeline/execution-registry";
import type { InputPatch } from "@/features/save-pipeline/execution-plan";

function input(paths: string[], baselineStatus = "DRAFT", finalStatus = "DRAFT"): InputPatch {
  return {
    entityType: "CMS_PAGE",
    operation: finalStatus === "PUBLISHED" ? "publish" : "save",
    paths,
    forcePaths: [],
    baselineStatus,
    finalStatus,
  };
}

describe("execution graph compiler", () => {
  it("derives deterministic mutation signals from input patch paths", () => {
    const first = deriveMutationSignals(input(["slug", "localeFields.title.en"]));
    const second = deriveMutationSignals(input(["slug", "localeFields.title.en"]));
    assert.deepEqual(first, second);
    assert.deepEqual(
      first.map((signal) => signal.id).sort(),
      [
        "content_changed",
        "locale_changed",
        "public_output_changed",
        "searchable_changed",
        "slug_changed",
      ].sort(),
    );
  });

  it("turns publication transitions into events, effects, and async tasks", () => {
    const plan = compileExecutionGraph({
      input: input(["status"], "DRAFT", "PUBLISHED"),
      finalState: { status: "PUBLISHED" },
      profile: getExecutionProfile("CMS_PAGE"),
    });

    assert.ok(plan.graph.signals.some((signal) => signal.id === "publish_transition"));
    assert.ok(plan.graph.events.some((event) => event.id === "PUBLICATION_PUBLISHED"));
    assert.ok(plan.effects.some((effect) => effect.id === "enqueue_search_index"));
    assert.ok(plan.effects.some((effect) => effect.id === "enqueue_seo"));
    assert.ok(plan.asyncTasks.some((task) => task.id === "search_index"));
    assert.ok(plan.asyncTasks.some((task) => task.id === "seo_submission"));
  });

  it("does not allow graph backflow from effects to signals or events", () => {
    const plan = compileExecutionGraph({
      input: input(["blocks"]),
      finalState: { blocks: [] },
      profile: getExecutionProfile("CMS_PAGE"),
    });

    for (const edge of plan.graph.edges) {
      if (edge.from.kind === "effect" || edge.from.kind === "task" || edge.from.kind === "target") {
        assert.notEqual(edge.to.kind, "signal");
        assert.notEqual(edge.to.kind, "event");
      }
    }
  });

  it("freezes execution plans after generation", () => {
    const plan = compileExecutionGraph({
      input: input(["slug"]),
      finalState: { slug: "about" },
      profile: getExecutionProfile("CMS_PAGE"),
    });
    assert.equal(Object.isFrozen(plan), true);
    assert.equal(Object.isFrozen(plan.graph), true);
    assert.equal(Object.isFrozen(plan.effects), true);
  });
});
