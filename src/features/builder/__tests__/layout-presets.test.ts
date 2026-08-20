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

  it("resolves default padding preset to theme section token", () => {
    const resolved = resolveLayoutFromPresets({ paddingTopPreset: "default", paddingBottomPreset: "default" });
    assert.equal(resolved.paddingTop, "var(--az-section-padding-block)");
    assert.equal(resolved.paddingBottom, "var(--az-section-padding-block)");
  });

  it("fills missing bottom when only top preset is authored", () => {
    const resolved = resolveLayoutFromPresets({ paddingTopPreset: "compact" });
    assert.equal(resolved.paddingTop, "2rem");
    assert.equal(resolved.paddingBottom, "var(--az-section-padding-block)");
  });

  it("infers min height screen", () => {
    assert.equal(inferMinHeightPreset("100vh"), "screen");
    assert.equal(inferSectionSpacingPreset("4rem"), "default");
  });

  it("infers unauthored section spacing as default (theme section-padding)", () => {
    assert.equal(inferSectionSpacingPreset(undefined), "default");
    assert.equal(inferSectionSpacingPreset(""), "default");
  });

  it("infers zero section spacing as none", () => {
    assert.equal(inferSectionSpacingPreset(0), "none");
    assert.equal(inferSectionSpacingPreset("0"), "none");
    assert.equal(inferSectionSpacingPreset("0px"), "none");
    assert.equal(inferSectionSpacingPreset("0rem"), "none");
  });
});
