import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BlockNode, PageBlocks } from "@/types/builder";
import type { HeaderBuilderSettings } from "@/features/navigation/types";
import {
  computeHeaderOverlayPaddingTop,
  isPageHeaderOverlayActive,
  resolvePageHeaderOverlay,
  HEADER_OVERLAY_AUTO_PADDING,
  isBoxedHeaderStyle,
} from "@/features/builder/header-overlay";

const baseSettings: HeaderBuilderSettings = {
  headerStyle: "boxed-compact",
  menuType: "dropdown",
  mobileType: "hamburger",
  headerDesktopMode: "sticky",
  overlaySurface: "glass",
  firstBlockHeaderOverlay: { enabled: false, contentInset: "auto" },
};

describe("header overlay", () => {
  it("detects boxed header styles", () => {
    assert.equal(isBoxedHeaderStyle("boxed-compact"), true);
    assert.equal(isBoxedHeaderStyle("normal-compact"), false);
  });

  it("computes auto padding using CSS variables", () => {
    const padding = computeHeaderOverlayPaddingTop({ enabled: true, surface: "glass" });
    assert.equal(padding, HEADER_OVERLAY_AUTO_PADDING);
    assert.match(padding!, /var\(--header-height/);
  });

  it("uses custom padding when set", () => {
    const padding = computeHeaderOverlayPaddingTop({
      enabled: true,
      surface: "glass",
      contentInset: "custom",
      paddingTop: "120px",
    });
    assert.equal(padding, "120px");
  });

  it("returns null when overlay disabled in header settings and no legacy block data", () => {
    const blocks: PageBlocks = [{ id: "a", type: "hero", props: {} }];
    assert.equal(resolvePageHeaderOverlay(baseSettings, blocks), null);
    assert.equal(isPageHeaderOverlayActive(baseSettings, blocks), false);
  });

  it("resolves overlay from header settings", () => {
    const settings: HeaderBuilderSettings = {
      ...baseSettings,
      firstBlockHeaderOverlay: { enabled: true, contentInset: "auto" },
      overlaySurface: "glass",
    };
    const result = resolvePageHeaderOverlay(settings);
    assert.ok(result);
    assert.equal(result.enabled, true);
    assert.equal(result.surface, "glass");
  });

  it("falls back to legacy block overlay when header setting disabled", () => {
    const blocks: PageBlocks = [
      {
        id: "a",
        type: "hero",
        props: { headerOverlay: { enabled: true, surface: "solid", contentInset: "custom", paddingTop: "100px" } },
      },
    ];
    const result = resolvePageHeaderOverlay(baseSettings, blocks);
    assert.ok(result);
    assert.equal(result.surface, "solid");
    assert.equal(result.paddingTop, "100px");
  });
});
