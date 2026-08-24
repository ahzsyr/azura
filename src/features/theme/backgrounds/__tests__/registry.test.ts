import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getEffect, isEffectRegistered, listEffects } from "@/features/theme/backgrounds/registry";
import { loadEffect } from "@/features/theme/backgrounds/lazy-imports";

describe("background effect registry", () => {
  it("registers eager static effects", () => {
    assert.equal(isEffectRegistered("grid"), true);
    assert.equal(isEffectRegistered("aurora"), true);
    assert.equal(getEffect("grid")?.tier, "light");
  });

  it("lazy-loads canvas effects on demand", async () => {
    assert.equal(isEffectRegistered("hexagons"), false);
    const def = await loadEffect("hexagons");
    assert.ok(def);
    assert.equal(def?.id, "hexagons");
    assert.equal(isEffectRegistered("hexagons"), true);
  });

  it("lists all registered effects after lazy load", async () => {
    await loadEffect("particles");
    await loadEffect("waves");
    const ids = listEffects().map((e) => e.id);
    assert.ok(ids.includes("grid"));
    assert.ok(ids.includes("particles"));
    assert.ok(ids.includes("waves"));
  });
});
