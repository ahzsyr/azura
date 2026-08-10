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
      paddingTop: "3rem",
      paddingBottom: 48,
    });
    assert.equal(parsed.paddingTopPreset, "compact");
    assert.equal(parsed.paddingBottomPreset, "large");
    assert.equal(parsed.paddingTop, "3rem");
    assert.equal(parsed.paddingBottom, 48);
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
        },
      },
    ];
    const validated = validatePageBlocks(blocks);
    assert.equal(validated[0]?.styles?.paddingTopPreset, "default");
    assert.equal(validated[0]?.styles?.paddingBottomPreset, "none");
  });
});
