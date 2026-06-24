import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampPageTransitionDurationMs,
  normalizePageTransitionPreset,
  pageTransitionDataAttributes,
  pageTransitionCssVars,
  PAGE_TRANSITION_EASE,
} from "@/lib/navigation/page-transitions";

describe("page-transitions", () => {
  it("normalizes presets", () => {
    assert.equal(normalizePageTransitionPreset("zoom"), "zoom");
    assert.equal(normalizePageTransitionPreset("slide"), "slide");
    assert.equal(normalizePageTransitionPreset("scale"), "scale");
    assert.equal(normalizePageTransitionPreset("none"), "none");
    assert.equal(normalizePageTransitionPreset("invalid"), "fade");
  });

  it("clamps duration", () => {
    assert.equal(clampPageTransitionDurationMs(50), 120);
    assert.equal(clampPageTransitionDurationMs(280), 280);
    assert.equal(clampPageTransitionDurationMs(5000), 2000);
  });

  it("builds zoom data attributes", () => {
    assert.deepEqual(pageTransitionDataAttributes(true, "zoom", 280, true), {
      "data-page-transition": "zoom",
      "data-page-transition-enabled": "true",
      "data-page-transition-duration": "280",
      "data-shared-elements-enabled": "true",
    });
  });

  it("disables transitions when off", () => {
    assert.deepEqual(pageTransitionDataAttributes(false, "zoom", 280, true), {
      "data-page-transition": "none",
      "data-page-transition-enabled": "false",
      "data-shared-elements-enabled": "false",
    });
  });

  it("exposes unified easing and css vars", () => {
    assert.equal(PAGE_TRANSITION_EASE, "cubic-bezier(0.22, 1, 0.36, 1)");
    assert.equal(pageTransitionCssVars(280)["--page-transition-duration"], "280ms");
  });
});
