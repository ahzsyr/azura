import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isBlockHidden, setBlockHidden } from "@/features/builder/lib/block-hidden";
import type { BlockNode } from "@/types/builder";

const base: BlockNode = {
  id: "b1",
  type: "text",
  props: { content: "Hello" },
};

describe("block hidden", () => {
  it("isBlockHidden is false by default", () => {
    assert.equal(isBlockHidden(base), false);
  });

  it("setBlockHidden toggles flag", () => {
    const hidden = setBlockHidden(base, true);
    assert.equal(isBlockHidden(hidden), true);
    assert.equal(setBlockHidden(hidden, false).hidden, undefined);
  });
});
