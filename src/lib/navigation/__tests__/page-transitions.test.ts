import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import {
  clampPageTransitionDurationMs,
  normalizePageTransitionPreset,
  pageTransitionDataAttributes,
  pageTransitionCssVars,
  readPageTransitionEnterClearMs,
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

  it("readPageTransitionEnterClearMs falls back without document attrs", () => {
    assert.equal(readPageTransitionEnterClearMs(240), 240);
  });
});

describe("route-loading page transition CSS", () => {
  it("wires presets to route-page-layer stale and active classes", async () => {
    const css = await readFile(new URL("../../../styles/route-loading.css", import.meta.url), "utf8");
    for (const preset of ["fade", "slide", "zoom", "scale"] as const) {
      assert.match(
        css,
        new RegExp(
          String.raw`html\[data-page-transition-enabled="true"\]\[data-page-transition="${preset}"\] \.route-page-layer--stale`,
        ),
      );
      assert.match(
        css,
        new RegExp(
          String.raw`html\[data-page-transition-enabled="true"\]\[data-page-transition="${preset}"\] \.route-page-layer--active`,
        ),
      );
    }
    assert.match(css, /--page-transition-duration/);
    assert.doesNotMatch(css, /\.route-page-layer--active\s*\{\s*animation:\s*route-page-enter\s+220ms/);
  });
});

describe("marketing page transition duration wiring", () => {
  it("uses readPageTransitionEnterClearMs instead of hard-coded PUBLIC_MOTION clear", async () => {
    const source = await readFile(
      new URL("../../../components/motion/marketing-page-transition.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /readPageTransitionEnterClearMs/);
    assert.doesNotMatch(source, /PUBLIC_MOTION\.routeEnterClearMs/);
    assert.doesNotMatch(source, /document\.startViewTransition\s*\(/);
  });
});
