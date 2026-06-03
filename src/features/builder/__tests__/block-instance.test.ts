import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BlockNode } from "@/types/builder";
import {
  createBlockInstance,
  getBlockSettings,
  normalizeBlockInstance,
  upgradePageBlocksToV2,
} from "@/features/builder/instance/block-instance";

describe("block instance", () => {
  it("reads settings from legacy props", () => {
    const block: BlockNode = {
      id: "a",
      type: "hero",
      props: { titleEn: "Hello" },
    };
    assert.equal(getBlockSettings(block).titleEn, "Hello");
  });

  it("supports unlimited instances of same type", () => {
    const a = createBlockInstance("hero", { settings: { titleEn: "A" } });
    const b = createBlockInstance("hero", { settings: { titleEn: "B" } });
    assert.notEqual(a.id, b.id);
    assert.equal(getBlockSettings(a).titleEn, "A");
    assert.equal(getBlockSettings(b).titleEn, "B");
  });

  it("upgrades v1 blocks to v2 with dual-write", () => {
    const legacy: BlockNode[] = [
      { id: "h1", type: "text", props: { contentEn: "x" } },
    ];
    const upgraded = upgradePageBlocksToV2(legacy);
    assert.equal(upgraded[0]?.version, "2.0");
    assert.equal(upgraded[0]?.settings?.contentEn, "x");
    assert.equal(upgraded[0]?.props?.contentEn, "x");
  });

  it("normalizes independent style layers per instance", () => {
    const block = createBlockInstance("cta", {
      styles: { backgroundColor: "#000" },
    });
    const norm = normalizeBlockInstance(block);
    assert.equal(norm.styles?.backgroundColor, "#000");
  });
});
