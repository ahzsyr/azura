import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blockLayoutStylesSchema } from "@/schemas/block-system";
import { validatePageBlocks } from "@/features/builder/validate-page-blocks";
import type { PageBlocks } from "@/types/builder";

describe("blockLayoutStylesSchema padding fields", () => {
  it("preserves per-side padding fields through parse", () => {
    const parsed = blockLayoutStylesSchema.parse({
      paddingTopPreset: "compact",
      paddingBottomPreset: "large",
      paddingLeftPreset: "default",
      paddingRightPreset: "none",
      paddingTop: "3rem",
      paddingBottom: 48,
      paddingLeft: "1.75rem",
      paddingRight: 0,
    });
    assert.equal(parsed.paddingTopPreset, "compact");
    assert.equal(parsed.paddingBottomPreset, "large");
    assert.equal(parsed.paddingLeftPreset, "default");
    assert.equal(parsed.paddingRightPreset, "none");
    assert.equal(parsed.paddingTop, "3rem");
    assert.equal(parsed.paddingBottom, 48);
    assert.equal(parsed.paddingLeft, "1.75rem");
    assert.equal(parsed.paddingRight, 0);
  });

  it("preserves horizontalAlign through parse", () => {
    const parsed = blockLayoutStylesSchema.parse({
      widthPreset: "custom",
      width: "75%",
      horizontalAlign: "center",
    });
    assert.equal(parsed.horizontalAlign, "center");
    assert.equal(parsed.width, "75%");
  });
});

describe("validatePageBlocks padding round-trip", () => {
  it("keeps paddingTopPreset and paddingBottomPreset on save validation", () => {
    const blocks: PageBlocks = [
      {
        id: "b1",
        type: "richText",
        props: {},
        styles: {
          paddingTopPreset: "default",
          paddingBottomPreset: "none",
          paddingLeftPreset: "compact",
          paddingRightPreset: "custom",
          paddingRight: "12px",
        },
      },
    ];
    const validated = validatePageBlocks(blocks);
    assert.equal(validated[0]?.styles?.paddingTopPreset, "default");
    assert.equal(validated[0]?.styles?.paddingBottomPreset, "none");
    assert.equal(validated[0]?.styles?.paddingLeftPreset, "compact");
    assert.equal(validated[0]?.styles?.paddingRightPreset, "custom");
    assert.equal(validated[0]?.styles?.paddingRight, "12px");
  });

  it("keeps a productGrid block type, id, settings, and children", () => {
    const blocks: PageBlocks = [
      {
        id: "grid-1",
        type: "productGrid",
        version: "2.0",
        props: {},
        settings: {
          title: "Featured products",
          source: "manual",
          productSlugs: ["desk-lamp"],
          columns: 3,
          showPrice: true,
        },
        children: [
          {
            id: "note-1",
            type: "richText",
            version: "2.0",
            props: {},
            settings: { html: "<p>Shown with the grid</p>" },
          },
        ],
      },
    ];
    const validated = validatePageBlocks(blocks);
    const grid = validated[0];
    assert.equal(grid?.type, "productGrid");
    assert.equal(grid?.id, "grid-1");
    assert.equal(grid?.settings?.title, "Featured products");
    assert.equal(grid?.settings?.source, "manual");
    assert.deepEqual(grid?.settings?.productSlugs, ["desk-lamp"]);
    assert.equal(grid?.settings?.columns, 3);
    assert.equal(grid?.settings?.showPrice, true);
    assert.equal(grid?.children?.[0]?.id, "note-1");
    assert.equal(grid?.children?.[0]?.type, "richText");
    assert.equal(grid?.children?.[0]?.settings?.html, "<p>Shown with the grid</p>");
  });
});
