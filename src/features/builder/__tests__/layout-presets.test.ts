import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  inferMaxWidthPreset,
  inferMinHeightPreset,
  inferSectionSpacingPreset,
  inferWidthPreset,
  resolveLayoutFromPresets,
} from "@/features/builder/styles/layout-preset-resolver";

describe("layout presets", () => {
  it("resolves full width preset", () => {
    const resolved = resolveLayoutFromPresets({ widthPreset: "full" });
    assert.equal(resolved.width, "100%");
  });

  it("resolves page max width preset", () => {
    const resolved = resolveLayoutFromPresets({ maxWidthPreset: "page" });
    assert.equal(resolved.maxWidth, "var(--site-page-max-width)");
  });

  it("infers custom width", () => {
    assert.equal(inferWidthPreset("50%"), "custom");
    assert.equal(inferWidthPreset("100%"), "full");
  });

  it("infers page max width from legacy and current tokens", () => {
    assert.equal(inferMaxWidthPreset("80rem"), "page");
    assert.equal(inferMaxWidthPreset("1440px"), "page");
    assert.equal(inferMaxWidthPreset("var(--site-page-max-width)"), "page");
  });

  it("resolves section spacing large", () => {
    const resolved = resolveLayoutFromPresets({ sectionSpacingPreset: "large" });
    assert.equal(resolved.sectionSpacing, "6rem");
  });

  it("infers min height screen", () => {
    assert.equal(inferMinHeightPreset("100vh"), "screen");
    assert.equal(inferSectionSpacingPreset("4rem"), "default");
  });
});
