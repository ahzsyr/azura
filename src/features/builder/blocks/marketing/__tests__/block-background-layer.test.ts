import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampOverlayOpacity,
  shouldShowBackgroundScrim,
} from "@/features/builder/blocks/marketing/lib/background-scrim";

describe("clampOverlayOpacity", () => {
  it("clamps values to 0–100", () => {
    assert.equal(clampOverlayOpacity(60), 60);
    assert.equal(clampOverlayOpacity(-10), 0);
    assert.equal(clampOverlayOpacity(150), 100);
    assert.equal(clampOverlayOpacity(Number.NaN), 0);
  });
});

describe("shouldShowBackgroundScrim", () => {
  it("shows scrim for image backgrounds when opacity is greater than zero", () => {
    assert.equal(
      shouldShowBackgroundScrim("image", {
        imageUrl: "/media/hero.jpg",
        overlayOpacity: 60,
      }),
      true,
    );
  });

  it("shows scrim for gradient backgrounds when opacity is greater than zero", () => {
    assert.equal(
      shouldShowBackgroundScrim("gradient", {
        overlayOpacity: 40,
      }),
      true,
    );
  });

  it("shows scrim for video backgrounds when a video URL is set", () => {
    assert.equal(
      shouldShowBackgroundScrim("video", {
        videoUrl: "https://example.com/hero.mp4",
        overlayOpacity: 55,
      }),
      true,
    );
  });

  it("omits scrim when opacity is zero", () => {
    assert.equal(
      shouldShowBackgroundScrim("image", {
        imageUrl: "/media/hero.jpg",
        overlayOpacity: 0,
      }),
      false,
    );
    assert.equal(
      shouldShowBackgroundScrim("gradient", {
        overlayOpacity: 0,
      }),
      false,
    );
  });

  it("omits scrim for transparent backgrounds", () => {
    assert.equal(
      shouldShowBackgroundScrim("transparent", {
        imageUrl: "/media/hero.jpg",
        overlayOpacity: 60,
      }),
      false,
    );
  });

  it("omits scrim for image type without an image URL", () => {
    assert.equal(
      shouldShowBackgroundScrim("image", {
        overlayOpacity: 60,
      }),
      false,
    );
  });
});
