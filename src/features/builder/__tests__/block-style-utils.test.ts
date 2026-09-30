import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BlockNode } from "@/types/builder";
import {
  hasActiveBlockVisualBackground,
  resolveMarketingBackgroundType,
} from "@/features/builder/components/block-style-utils";

describe("block style utils", () => {
  it("detects active block visual section background", () => {
    const block: BlockNode = {
      id: "h1",
      type: "hero",
      props: {},
      visual: { sectionBackground: { type: "image", imageUrl: "/media/bg.jpg" } },
    };
    assert.equal(hasActiveBlockVisualBackground(block), true);
  });

  it("returns transparent marketing background when block visual background is active", () => {
    const block: BlockNode = {
      id: "h1",
      type: "hero",
      props: { backgroundType: "image", imageUrl: "/media/hero.jpg" },
      visual: { sectionBackground: { type: "image", imageUrl: "/media/bg.jpg" } },
    };
    assert.equal(resolveMarketingBackgroundType(block, "image", "image"), "transparent");
  });

  it("preserves props background type when no block visual background", () => {
    const block: BlockNode = {
      id: "h1",
      type: "hero",
      props: { backgroundType: "image", imageUrl: "/media/hero.jpg" },
    };
    assert.equal(resolveMarketingBackgroundType(block, "image", "image"), "image");
  });
});
