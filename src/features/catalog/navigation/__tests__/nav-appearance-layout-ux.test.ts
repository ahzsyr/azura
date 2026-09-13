import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAppearanceStyle,
  resolveDisplayMode,
  resolveHorizontalAlign,
  resolveIconContainerStyle,
  resolveIconPosition,
  resolveOverflowMode,
  resolveShowTooltip,
} from "../layout-semantics";
import {
  applyAppearanceStylePreset,
  applyLayoutQuickPreset,
  defaultCatalogNavigationAppearance,
  defaultCatalogNavigationLayout,
  layoutPatchForAppearanceStyle,
  layoutPatchForDensity,
  layoutPatchForIconSize,
  layoutPatchForSize,
  matchLayoutDensity,
  matchLayoutIconSize,
  matchLayoutSize,
} from "../../admin/navigation/nav-style-presets";
import { catalogNavigationAppearanceSchema, catalogNavigationLayoutSchema } from "../schema";

describe("layout-semantics defaults", () => {
  it("defaults displayMode auto / missing to icon-text", () => {
    assert.equal(resolveDisplayMode(undefined), "icon-text");
    assert.equal(resolveDisplayMode({}), "icon-text");
    assert.equal(resolveDisplayMode({ displayMode: "auto" }), "icon-text");
  });

  it("honors explicit display modes and showIcons=false", () => {
    assert.equal(resolveDisplayMode({ displayMode: "icon" }), "icon");
    assert.equal(resolveDisplayMode({ displayMode: "text" }), "text");
    assert.equal(resolveDisplayMode({ displayMode: "icon-text" }), "icon-text");
    assert.equal(resolveDisplayMode({ showIcons: false }), "text");
  });

  it("defaults icon position, alignment, tooltip, and icon box", () => {
    assert.equal(resolveIconPosition(undefined), "top");
    assert.equal(resolveHorizontalAlign(undefined), "start");
    assert.equal(resolveIconContainerStyle(undefined), "none");
    assert.equal(resolveShowTooltip(undefined), true);
    assert.equal(resolveShowTooltip({ showTooltip: false }), false);
    assert.equal(resolveAppearanceStyle(undefined), "minimal");
  });
});

describe("appearance style presets", () => {
  it("writes appearanceStyle and concrete visual fields for pills", () => {
    const next = applyAppearanceStylePreset("pills", { theme: "inherit" });
    assert.equal(next.appearanceStyle, "pills");
    assert.equal(next.theme, "custom");
    assert.equal(next.borderRadius, "999px");
    assert.ok(next.activeBackground);
    assert.equal(catalogNavigationAppearanceSchema.safeParse(next).success, true);
  });

  it("underline clears item chrome defaults", () => {
    const next = applyAppearanceStylePreset("underline", {});
    assert.equal(next.appearanceStyle, "underline");
    assert.equal(next.activeBackground, "transparent");
    assert.equal(next.shadow, "none");
  });

  it("pairs layout patches with appearance styles", () => {
    const pillsLayout = layoutPatchForAppearanceStyle("pills");
    assert.equal(pillsLayout.iconPosition, "left");
    assert.equal(pillsLayout.displayMode, "icon-text");
    assert.equal(catalogNavigationLayoutSchema.safeParse(pillsLayout).success, true);
  });
});

describe("layout quick presets", () => {
  it("icon-only compact enables scroll bar overflow and icon display", () => {
    const layout = applyLayoutQuickPreset("icon-only-compact", { forMobile: true });
    assert.equal(layout.displayMode, "icon");
    assert.equal(layout.overflowMode, "scroll-bar");
    assert.equal(resolveOverflowMode(layout), "scroll-bar");
    assert.equal(layout.showTooltip, true);
    assert.equal(catalogNavigationLayoutSchema.safeParse(layout).success, true);
  });

  it("categories equal uses equal item width", () => {
    const layout = applyLayoutQuickPreset("categories-equal");
    assert.equal(layout.itemWidth, "equal");
    assert.equal(layout.displayMode, "icon-text");
  });

  it("text-only hides icons", () => {
    const layout = applyLayoutQuickPreset("text-only");
    assert.equal(layout.displayMode, "text");
    assert.equal(layout.showIcons, false);
  });

  it("biases icon-text standard toward top icons on mobile", () => {
    const desktop = applyLayoutQuickPreset("icon-text-standard");
    const mobile = applyLayoutQuickPreset("icon-text-standard", { forMobile: true });
    assert.equal(desktop.iconPosition, "left");
    assert.equal(mobile.iconPosition, "top");
    assert.equal(mobile.overflowMode, "scroll-bar");
    assert.equal(resolveOverflowMode(mobile), "scroll-bar");
  });
});

describe("overflow modes", () => {
  it("defaults to scroll bar and supports arrow slider", () => {
    assert.equal(resolveOverflowMode(undefined), "scroll-bar");
    assert.equal(resolveOverflowMode({ overflowMode: "scroll-arrows" }), "scroll-arrows");
    assert.equal(resolveOverflowMode({ horizontalScroll: false }), "clip");
    assert.equal(
      catalogNavigationLayoutSchema.safeParse({ overflowMode: "scroll-arrows" }).success,
      true,
    );
  });
});

describe("restore defaults", () => {
  it("appearance defaults to minimal inherit theme", () => {
    const appearance = defaultCatalogNavigationAppearance();
    assert.equal(appearance.appearanceStyle, "minimal");
    assert.equal(appearance.theme, "inherit");
    assert.equal(appearance.shadow, "none");
    assert.equal(catalogNavigationAppearanceSchema.safeParse(appearance).success, true);
  });

  it("layout defaults match icon-text standard preset", () => {
    const layout = defaultCatalogNavigationLayout();
    const preset = applyLayoutQuickPreset("icon-text-standard");
    assert.equal(layout.displayMode, preset.displayMode);
    assert.equal(layout.iconPosition, preset.iconPosition);
    assert.equal(layout.itemWidth, "auto");
    assert.equal(catalogNavigationLayoutSchema.safeParse(layout).success, true);
  });

  it("layout defaults bias mobile toward top icons + scroll bar", () => {
    const layout = defaultCatalogNavigationLayout({ forMobile: true });
    assert.equal(layout.iconPosition, "top");
    assert.equal(layout.overflowMode, "scroll-bar");
  });
});

describe("density and size helpers", () => {
  it("applies density and size patches", () => {
    const density = layoutPatchForDensity("tight");
    const size = layoutPatchForSize("large");
    assert.equal(density.gap, "4px");
    assert.equal(size.iconSize, "32px");
    assert.equal(size.itemHeight, "auto");
    assert.equal(matchLayoutDensity(density), "tight");
    assert.equal(matchLayoutSize(size), "large");
  });

  it("applies icon size presets and matches them", () => {
    const xl = layoutPatchForIconSize("xl");
    assert.equal(xl.iconSize, "40px");
    assert.equal(matchLayoutIconSize(xl), "xl");
    const custom = { iconSize: "22px", iconContainerSize: "34px" };
    assert.equal(matchLayoutIconSize(custom), "custom");
  });
});
