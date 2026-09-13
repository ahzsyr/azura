import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sectionPropsSchema } from "@/schemas/builder/props";
import { createBlock, BLOCK_DEFAULTS } from "@/schemas/builder";
import {
  normalizeSectionColumns,
  normalizeSectionLayoutMode,
  normalizeSectionMaxWidth,
  normalizeSectionSlidesPerView,
  resolveSectionEffectiveLayout,
  resolveSectionGridTemplate,
  resolveSectionSplitGridTemplate,
  sectionLayoutGapClass,
  sectionLayoutGridColumnClass,
  sectionLayoutMaxWidthClass,
} from "@/features/builder/container-blocks";
import type { BlockNode } from "@/types/builder";

describe("sectionPropsSchema", () => {
  it("applies defaults that preserve stacked layout", () => {
    const parsed = sectionPropsSchema.parse({});
    assert.equal(parsed.padding, "default");
    assert.equal(parsed.background, "default");
    assert.equal(parsed.layoutMode, "stack");
    assert.equal(parsed.gap, "md");
    assert.equal(parsed.stackOnMobile, true);
    assert.equal(parsed.maxWidth, "full");
    assert.equal(parsed.columns, 2);
    assert.equal(parsed.slidesPerView, 1);
    assert.equal(parsed.showArrows, true);
    assert.equal(parsed.showDots, false);
    assert.equal(parsed.autoplay, false);
    assert.equal(parsed.autoplayIntervalMs, 5000);
    assert.equal(parsed.loop, true);
  });

  it("accepts layout modes and slider options", () => {
    const parsed = sectionPropsSchema.parse({
      layoutMode: "slider",
      slidesPerView: 2,
      showDots: true,
      autoplay: true,
      autoplayIntervalMs: 4000,
    });
    assert.equal(parsed.layoutMode, "slider");
    assert.equal(parsed.slidesPerView, 2);
    assert.equal(parsed.showDots, true);
    assert.equal(parsed.autoplay, true);
    assert.equal(parsed.autoplayIntervalMs, 4000);
  });
});

describe("section block defaults", () => {
  it("defines layout defaults in BLOCK_DEFAULTS.section", () => {
    assert.equal(BLOCK_DEFAULTS.section.layoutMode, "stack");
    const parsed = sectionPropsSchema.parse(BLOCK_DEFAULTS.section);
    assert.equal(parsed.layoutMode, "stack");
    assert.equal(parsed.gap, "md");
  });

  it("initializes children array on createBlock", () => {
    const created = createBlock("section", {}) as BlockNode;
    assert.deepEqual(created.children, []);
  });

  it("remains backward compatible for legacy section props", () => {
    const legacy = sectionPropsSchema.parse({
      padding: "large",
      background: "muted",
    });
    assert.equal(legacy.layoutMode, "stack");
    assert.equal(legacy.padding, "large");
    assert.equal(legacy.background, "muted");
  });
});

describe("section layout helpers", () => {
  it("normalizes layout mode and numeric settings", () => {
    assert.equal(normalizeSectionLayoutMode("grid"), "grid");
    assert.equal(normalizeSectionLayoutMode("invalid"), "stack");
    assert.equal(normalizeSectionColumns(4), 4);
    assert.equal(normalizeSectionColumns(9), 2);
    assert.equal(normalizeSectionSlidesPerView(3), 3);
    assert.equal(normalizeSectionSlidesPerView(5), 1);
    assert.equal(normalizeSectionMaxWidth("narrow"), "narrow");
    assert.equal(normalizeSectionMaxWidth("unknown"), "full");
  });

  it("falls back split/grid/slider to stack when too few children", () => {
    assert.equal(resolveSectionEffectiveLayout("splitLeft", 1), "stack");
    assert.equal(resolveSectionEffectiveLayout("splitRight", 0), "stack");
    assert.equal(resolveSectionEffectiveLayout("grid", 1), "stack");
    assert.equal(resolveSectionEffectiveLayout("slider", 1), "stack");
    assert.equal(resolveSectionEffectiveLayout("splitLeft", 2), "splitLeft");
    assert.equal(resolveSectionEffectiveLayout("grid", 3), "grid");
    assert.equal(resolveSectionEffectiveLayout("slider", 4), "slider");
  });

  it("resolves grid templates and utility classes", () => {
    assert.equal(resolveSectionSplitGridTemplate("splitLeft"), "2fr 1fr");
    assert.equal(resolveSectionSplitGridTemplate("splitRight"), "1fr 2fr");
    assert.equal(resolveSectionGridTemplate(3), "repeat(3, minmax(0, 1fr))");
    assert.equal(sectionLayoutGapClass("lg"), "section-layout-grid--gap-lg");
    assert.equal(sectionLayoutGridColumnClass(4), "section-layout-grid--cols-4");
    assert.equal(sectionLayoutMaxWidthClass("narrow"), "max-w-3xl mx-auto w-full");
  });
});
