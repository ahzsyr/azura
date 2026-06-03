import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blockRegistry } from "@/features/builder/registry/block-registry-system";

describe("blockRegistry", () => {
  it("registers all 17 block types", () => {
    assert.equal(blockRegistry.list().length, 17);
  });

  it("returns metadata for hero", () => {
    const hero = blockRegistry.get("hero");
    assert.ok(hero);
    assert.equal(hero.type, "hero");
    assert.equal(hero.version, "2.0");
    assert.ok(hero.translatableFields.includes("title"));
  });

  it("groups blocks by category", () => {
    const layout = blockRegistry.byCategory("layout");
    assert.ok(layout.some((b) => b.type === "hero"));
    assert.ok(layout.some((b) => b.type === "section"));
  });
});
