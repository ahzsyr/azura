import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildResponsiveBlockStyleSheet,
  cssPropertiesToDeclarations,
  mergeStyleLayers,
  resolveBlockStyles,
} from "@/features/builder/styles/style-resolver";
import { BUILDER_BREAKPOINT_MQ } from "@/features/builder/constants/responsive-breakpoints";
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

  it("applies independent top and bottom padding from presets", () => {
    const resolved = resolveBlockStyles({
      blockId: "x",
      styles: { paddingTopPreset: "compact", paddingBottomPreset: "none" },
    });
    assert.equal(resolved.style.paddingTop, "2rem");
    assert.equal(resolved.style.paddingBottom, "0px");
  });

  it("fills unset padding side with theme default when only one side is authored", () => {
    const resolved = resolveBlockStyles({
      blockId: "x",
      styles: { paddingTopPreset: "none" },
    });
    assert.equal(resolved.style.paddingTop, "0px");
    assert.equal(resolved.style.paddingBottom, "var(--az-section-padding-block)");
  });

  it("keeps both sides zero when both presets are none", () => {
    const resolved = resolveBlockStyles({
      blockId: "x",
      styles: { paddingTopPreset: "none", paddingBottomPreset: "none" },
    });
    assert.equal(resolved.style.paddingTop, "0px");
    assert.equal(resolved.style.paddingBottom, "0px");
  });

  it("applies responsive desktop layout overrides on top of Style > Layout", () => {
    const merged = mergeStyleLayers(
      { maxWidth: "80rem" },
      { desktop: { maxWidth: "48rem" }, mobile: { maxWidth: "100%" } },
      "desktop",
    );
    assert.equal(merged.maxWidth, "48rem");
  });

  it("serializes CSS properties to declarations", () => {
    assert.equal(
      cssPropertiesToDeclarations({ maxWidth: "48rem", paddingTop: "2rem" }),
      "max-width:48rem;padding-top:2rem",
    );
  });

  it("emits media-query stylesheet for all layout breakpoints", () => {
    const css = buildResponsiveBlockStyleSheet({
      blockId: "img-1",
      styles: { maxWidthPreset: "page" },
      responsive: {
        tablet: { maxWidth: "40rem" },
        mobile: { maxWidth: "100%", hide: true },
      },
    });
    assert.ok(css);
    assert.ok(css!.includes(`@media ${BUILDER_BREAKPOINT_MQ.desktop}`));
    assert.ok(css!.includes(`@media ${BUILDER_BREAKPOINT_MQ.tablet}`));
    assert.ok(css!.includes(`@media ${BUILDER_BREAKPOINT_MQ.mobile}`));
    assert.ok(css!.includes('[data-block-id="img-1"]'));
    assert.ok(css!.includes("max-width:40rem"));
    assert.ok(css!.includes("display:none!important"));
  });

  it("omits height styles so image blocks can shrink-wrap media", () => {
    const resolved = resolveBlockStyles({
      blockId: "img-2",
      styles: { maxWidth: "80rem", minHeight: "50vh", height: "40vh" },
      omitHeights: true,
    });
    assert.equal(resolved.style.maxWidth, "80rem");
    assert.equal(resolved.style.minHeight, undefined);
    assert.equal(resolved.style.height, undefined);

    const css = buildResponsiveBlockStyleSheet({
      blockId: "img-2",
      styles: { maxWidth: "80rem", minHeight: "50vh" },
      omitHeights: true,
    });
    assert.ok(css);
    assert.equal(css!.includes("min-height"), false);
    assert.ok(css!.includes("max-width:80rem"));
  });
});
