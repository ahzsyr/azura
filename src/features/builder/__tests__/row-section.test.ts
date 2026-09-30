import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rowSectionPropsSchema } from "@/schemas/builder/props";
import { createBlock } from "@/schemas/builder";
import {
  containerMaxChildren,
  isContainerBlock,
  resolveRowSectionGridTemplate,
  rowSectionColumnLayoutsForMax,
} from "@/features/builder/container-blocks";
import { insertBlockInTree } from "@/features/builder/block-tree";
import type { BlockNode, PageBlocks } from "@/types/builder";

describe("rowSectionPropsSchema", () => {
  it("applies defaults", () => {
    const parsed = rowSectionPropsSchema.parse({});
    assert.equal(parsed.maxColumns, 2);
    assert.equal(parsed.columnLayout, "equal");
    assert.equal(parsed.gap, "md");
    assert.equal(parsed.stackOnMobile, true);
    assert.equal(parsed.verticalAlign, "stretch");
  });

  it("accepts valid maxColumns and layout", () => {
    const parsed = rowSectionPropsSchema.parse({
      maxColumns: 3,
      columnLayout: "equal-thirds",
    });
    assert.equal(parsed.maxColumns, 3);
    assert.equal(parsed.columnLayout, "equal-thirds");
  });
});

describe("container block helpers", () => {
  it("identifies container blocks", () => {
    assert.equal(isContainerBlock("section"), true);
    assert.equal(isContainerBlock("rowSection"), true);
    assert.equal(isContainerBlock("hero"), false);
  });

  it("returns max children for rowSection only", () => {
    assert.equal(containerMaxChildren("section", {}), null);
    assert.equal(containerMaxChildren("rowSection", { maxColumns: 4 }), 4);
    assert.equal(containerMaxChildren("rowSection", {}), 2);
  });

  it("filters layout presets by max columns", () => {
    assert.deepEqual(rowSectionColumnLayoutsForMax(2), ["equal", "wide-left", "wide-right"]);
    assert.deepEqual(rowSectionColumnLayoutsForMax(3), ["equal-thirds"]);
    assert.deepEqual(rowSectionColumnLayoutsForMax(4), ["equal-quarters"]);
  });

  it("resolves grid templates", () => {
    assert.equal(resolveRowSectionGridTemplate("wide-left", 2), "2fr 1fr");
    assert.equal(resolveRowSectionGridTemplate("wide-right", 2), "1fr 2fr");
    assert.equal(resolveRowSectionGridTemplate("equal-thirds", 3), "repeat(3, minmax(0, 1fr))");
    assert.equal(resolveRowSectionGridTemplate("equal-quarters", 4), "repeat(4, minmax(0, 1fr))");
    assert.equal(resolveRowSectionGridTemplate("equal", 2), "repeat(2, minmax(0, 1fr))");
  });
});

describe("insertBlockInTree rowSection cap", () => {
  const row = createBlock("rowSection", { maxColumns: 2 }) as BlockNode;
  const childA = createBlock("spacer", { height: 24 }) as BlockNode;
  const childB = createBlock("spacer", { height: 24 }) as BlockNode;
  const childC = createBlock("spacer", { height: 24 }) as BlockNode;

  row.children = [childA, childB];
  const blocks: PageBlocks = [row];

  it("allows insert into rowSection under cap", () => {
    const emptyRow = createBlock("rowSection", { maxColumns: 2 }) as BlockNode;
    emptyRow.children = [childA];
    const next = insertBlockInTree([emptyRow], childB, emptyRow.id);
    assert.equal(next[0].children?.length, 2);
  });

  it("rejects insert when rowSection is at max columns", () => {
    const next = insertBlockInTree(blocks, childC, row.id);
    assert.equal(next[0].children?.length, 2);
    assert.equal(next[0].children?.[0].id, childA.id);
    assert.equal(next[0].children?.[1].id, childB.id);
  });

  it("initializes children for rowSection on createBlock", () => {
    const created = createBlock("rowSection", {}) as BlockNode;
    assert.deepEqual(created.children, []);
  });
});
