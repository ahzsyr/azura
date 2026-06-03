import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BlockNode } from "@/types/builder";
import { migrateBlocksToBlockSystem } from "@/features/builder/migration/upgrade-blocks";

describe("block migration", () => {
  it("migrates legacy packages block to catalog v2", () => {
    const legacy = [
      {
        id: "p1",
        type: "packages",
        props: { titleEn: "Packages", limit: 6 },
      },
    ] as unknown as BlockNode[];
    const { blocks, migrated } = migrateBlocksToBlockSystem(legacy);
    assert.equal(migrated, true);
    assert.equal(blocks[0]?.type, "catalog");
    assert.equal(blocks[0]?.version, "2.0");
  });

  it("is idempotent for v2 blocks", () => {
    const v2 = [
      {
        id: "h1",
        type: "hero",
        version: "2.0",
        props: { titleEn: "Hi" },
        settings: { titleEn: "Hi" },
        styles: {},
      },
    ] as BlockNode[];
    const first = migrateBlocksToBlockSystem(v2);
    const second = migrateBlocksToBlockSystem(first.blocks);
    assert.equal(second.blocks[0]?.id, "h1");
  });
});
