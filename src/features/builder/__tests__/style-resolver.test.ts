import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeStyleLayers, resolveBlockStyles } from "@/features/builder/styles/style-resolver";
import type { ThemeTokens } from "@/types/theme";

const themeWithPrimary = {
  primaryColor: "#8b5cf6",
  typography: { bodyFont: "Barlow" },
} as ThemeTokens;

describe("style resolver", () => {
  it("merges responsive tablet overrides", () => {
    const merged = mergeStyleLayers(
      { fontSize: 16 },
      { tablet: { fontSize: 14 }, mobile: { fontSize: 12 } },
      "mobile"
    );
    assert.equal(merged.fontSize, 12);
  });

  it("resolves hide flag from responsive settings", () => {
    const resolved = resolveBlockStyles({
      blockId: "x",
      responsive: { mobile: { hide: true } },
      breakpoint: "mobile",
    });
    assert.equal(resolved.hidden, true);
  });

  it("applies layout styles to CSS", () => {
    const resolved = resolveBlockStyles({
      blockId: "x",
      styles: { maxWidth: 1200, minHeight: "50vh" },
    });
    assert.equal(resolved.style.maxWidth, "1200px");
    assert.equal(resolved.style.minHeight, "50vh");
  });

  it("resolves width from preset before CSS", () => {
    const resolved = resolveBlockStyles({
      blockId: "x",
      styles: { widthPreset: "full" },
    });
    assert.equal(resolved.style.width, "100%");
  });

  it("applies alignment from responsive layer", () => {
    const resolved = resolveBlockStyles({
      blockId: "x",
      styles: {},
      responsive: { desktop: { alignment: "center" } },
      breakpoint: "desktop",
    });
    assert.equal(resolved.style.alignItems, "center");
  });

  it("does not apply theme primary as block background by default", () => {
    const resolved = resolveBlockStyles({
      blockId: "x",
      theme: themeWithPrimary,
    });
    assert.equal(resolved.style.backgroundColor, undefined);
    assert.equal(resolved.style.fontFamily, "Barlow");
  });

  it("applies background only when explicitly set", () => {
    const explicit = resolveBlockStyles({
      blockId: "x",
      styles: { backgroundColor: "#020408" },
      theme: themeWithPrimary,
    });
    assert.equal(explicit.style.backgroundColor, "#020408");

    const tokenOverride = resolveBlockStyles({
      blockId: "x",
      styles: { tokenOverrides: { primaryColor: "inherit" } },
      theme: themeWithPrimary,
    });
    assert.equal(tokenOverride.style.backgroundColor, "#8b5cf6");
  });
});
