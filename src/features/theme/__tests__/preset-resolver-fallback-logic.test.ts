import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PresetDefinition } from "@/features/theme/preset-resolver.types";
import {
  resolveCloudPresetFromSources,
  resolvePresetCandidate,
} from "@/features/theme/preset-resolver.fallback";

const travelPreset: PresetDefinition = {
  id: "travel",
  name: "Travel",
  colors: { primary: "#06b6d4", accent: "#f97316", background: "#020c12" },
};

describe("preset resolver fallback logic", () => {
  it("does not map unknown ids to fallback preset in cloud lookup", () => {
    const resolved = resolveCloudPresetFromSources({
      requestedId: "smart-home",
      storePreset: null,
      bundled: { travel: travelPreset },
    });
    assert.equal(resolved, null);
  });

  it("explicitly falls back at resolver boundary and reports fallback id", () => {
    const resolved = resolvePresetCandidate({
      candidateId: "smart-home",
      candidatePreset: null,
      fallbackId: "travel",
      fallbackPreset: travelPreset,
    });
    assert.ok(resolved);
    assert.equal(resolved?.activeId, "travel");
    assert.equal(resolved?.preset.id, "travel");
  });
});
