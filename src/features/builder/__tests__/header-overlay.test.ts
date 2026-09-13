import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { BlockNode, PageBlocks } from "@/types/builder";
import type { HeaderBuilderSettings } from "@/features/navigation/types";
import {
  catalogHeroSupportsHeaderOverlay,
  computeHeaderOverlayPaddingTop,
  firstBlockSupportsHeaderOverlay,
  isPageHeaderOverlayActive,
  pageHeaderOverlayDataAttributes,
  resolvePageHeaderOverlay,
  resolveHeroBlock,
  HEADER_OVERLAY_AUTO_PADDING,
  HEADER_OVERLAY_MEDIA_BLOCK_TYPES,
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

  it("builds page overlay data attributes when enabled", () => {
    const attrs = pageHeaderOverlayDataAttributes({
      enabled: true,
      surface: "glass",
    });
    assert.equal(attrs["data-page-header-overlay"], "true");
    assert.equal(attrs["data-page-header-overlay-surface"], "glass");
    assert.equal(attrs["data-header-overlay-underlay"], "true");
    assert.deepEqual(pageHeaderOverlayDataAttributes(null), {});
  });

  it("omits overlay attributes when page has no media underlay", () => {
    const attrs = pageHeaderOverlayDataAttributes(
      { enabled: true, surface: "glass" },
      { hasUnderlay: false },
    );
    assert.deepEqual(attrs, {});
  });

  it("detects catalog hero styles that support overlay", () => {
    assert.equal(catalogHeroSupportsHeaderOverlay("banner"), true);
    assert.equal(catalogHeroSupportsHeaderOverlay("split"), true);
    assert.equal(catalogHeroSupportsHeaderOverlay("minimal"), false);
    assert.equal(catalogHeroSupportsHeaderOverlay(undefined), false);
  });

  it("detects first blocks that support overlay", () => {
    assert.equal(firstBlockSupportsHeaderOverlay({ id: "1", type: "hero", props: {} }), true);
    assert.equal(firstBlockSupportsHeaderOverlay({ id: "1", type: "videoHero", props: {} }), true);
    assert.equal(firstBlockSupportsHeaderOverlay({ id: "1", type: "catalog", props: {} }), false);
    assert.equal(firstBlockSupportsHeaderOverlay(undefined), false);
  });

  // ── SSOT: every type registered in HEADER_OVERLAY_MEDIA_BLOCK_TYPES is
  //    recognised by firstBlockSupportsHeaderOverlay so callers never need to
  //    maintain their own lists. New openers (Canvas Hero, 3D Hero, etc.) only
  //    require a single registration in the Set.
  it("firstBlockSupportsHeaderOverlay covers every type in HEADER_OVERLAY_MEDIA_BLOCK_TYPES", () => {
    for (const type of HEADER_OVERLAY_MEDIA_BLOCK_TYPES) {
      assert.equal(
        firstBlockSupportsHeaderOverlay({ id: "x", type, props: {} }),
        true,
        `Expected ${type} to support overlay`,
      );
    }
  });

  it("non-media first block does NOT support overlay (SSOT gate)", () => {
    const nonMedia = ["text", "catalog", "testimonials", "products", "cta", "richText"];
    for (const type of nonMedia) {
      assert.equal(
        firstBlockSupportsHeaderOverlay({ id: "x", type, props: {} }),
        false,
        `Expected ${type} NOT to support overlay`,
      );
    }
    assert.equal(firstBlockSupportsHeaderOverlay(undefined), false);
  });

  // ── resolveHeroBlock: composition-aware first-block resolution ───────────
  it("resolveHeroBlock returns top[0] when top section is enabled", () => {
    const heroBlock: BlockNode = { id: "top-hero", type: "hero", props: {} };
    const composition = {
      layout: {
        type: "full" as const,
        spacing: { gap: "md" as const, padding: "md" as const },
        regions: {},
        topSection: { enabled: true, width: "full" as const },
      },
      regions: {
        top: [heroBlock],
        primary: [{ id: "text-block", type: "text", props: {} }],
        asideStart: [],
        asideEnd: [],
      },
    };
    assert.equal(resolveHeroBlock(composition, "full"), heroBlock);
  });

  it("resolveHeroBlock falls back to primary[0] when top section is disabled", () => {
    const primaryHero: BlockNode = { id: "p-hero", type: "videoHero", props: {} };
    const composition = {
      layout: {
        type: "full" as const,
        spacing: { gap: "md" as const, padding: "md" as const },
        regions: {},
        topSection: { enabled: false, width: "boxed" as const },
      },
      regions: {
        top: [],
        primary: [primaryHero],
        asideStart: [],
        asideEnd: [],
      },
    };
    assert.equal(resolveHeroBlock(composition, "full"), primaryHero);
  });

  it("resolveHeroBlock returns undefined when both regions are empty", () => {
    const composition = {
      layout: {
        type: "full" as const,
        spacing: { gap: "md" as const, padding: "md" as const },
        regions: {},
      },
      regions: { top: [], primary: [], asideStart: [], asideEnd: [] },
    };
    assert.equal(resolveHeroBlock(composition, "full"), undefined);
  });

  // ── Overlay active gate: media SSOT + overlay enabled ───────────────────
  it("overlay is inactive when first block is not a media type (e.g. text)", () => {
    const settings: HeaderBuilderSettings = {
      ...baseSettings,
      firstBlockHeaderOverlay: { enabled: true, contentInset: "auto" },
    };
    const blocks: PageBlocks = [{ id: "t", type: "text", props: {} }];
    const overlay = resolvePageHeaderOverlay(settings, blocks);
    assert.ok(overlay?.enabled, "overlay setting is enabled");
    // hasUnderlay must be checked by callers via firstBlockSupportsHeaderOverlay
    assert.equal(firstBlockSupportsHeaderOverlay(blocks[0]), false);
  });

  it("overlay is active when first block is a media type and setting is enabled", () => {
    const settings: HeaderBuilderSettings = {
      ...baseSettings,
      firstBlockHeaderOverlay: { enabled: true, contentInset: "auto" },
    };
    const blocks: PageBlocks = [{ id: "h", type: "hero", props: {} }];
    const overlay = resolvePageHeaderOverlay(settings, blocks);
    assert.ok(overlay?.enabled);
    assert.equal(firstBlockSupportsHeaderOverlay(blocks[0]), true);
    // Simulate what CMS renderer does: enabled && hasUnderlay
    const effective = overlay?.enabled && firstBlockSupportsHeaderOverlay(blocks[0])
      ? overlay
      : null;
    assert.ok(effective, "effective overlay should be non-null for a media first block");
  });
});
