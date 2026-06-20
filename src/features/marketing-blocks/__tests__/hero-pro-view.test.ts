import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldShowHeroOverlay } from "@/features/marketing-blocks/lib/hero-pro-overlay";

describe("shouldShowHeroOverlay", () => {
  it("omits hero overlay when a content background image is set", () => {
    assert.equal(
      shouldShowHeroOverlay({
        backgroundType: "image",
        imageUrl: "/media/hero.jpg",
      }),
      false
    );
  });

  it("omits hero overlay when deferring to block Look & Feel background", () => {
    assert.equal(
      shouldShowHeroOverlay({
        useBlockVisualBg: true,
        backgroundType: "transparent",
      }),
      false
    );
  });

  it("shows hero overlay for default gradient fill", () => {
    assert.equal(
      shouldShowHeroOverlay({
        backgroundType: "gradient",
      }),
      true
    );
  });

  it("omits hero overlay for video backgrounds", () => {
    assert.equal(
      shouldShowHeroOverlay({
        backgroundType: "video",
      }),
      false
    );
  });
});
