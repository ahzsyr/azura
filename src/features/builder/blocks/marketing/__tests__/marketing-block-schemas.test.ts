import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_DEFAULTS } from "@/schemas/builder";
import {
  featureGridPropsSchema,
  featureGridItemSchema,
  benefitsGridPropsSchema,
  trustBadgesPropsSchema,
  logoCloudPropsSchema,
  statsCounterPropsSchema,
  beforeAfterPropsSchema,
  tabbedShowcasePropsSchema,
  extendedHeroPropsSchema,
  extendedCtaPropsSchema,
  gridItemSchema,
} from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { normalizeFeatureGridProps, plainTextToHtml } from "@/features/builder/blocks/marketing/lib/normalize-feature-grid";

describe("marketing block schemas", () => {
  it("parses featureGrid defaults from BLOCK_DEFAULTS", () => {
    const parsed = featureGridPropsSchema.parse(BLOCK_DEFAULTS.featureGrid);
    assert.equal(parsed.columns, 3);
    assert.equal(parsed.layout, "standard");
    assert.equal(parsed.cardStyle, "solid");
    assert.equal(parsed.expandEnabled, false);
    assert.equal(parsed.items.length, 0);
  });

  it("parses legacy featureGrid payloads without new fields", () => {
    const parsed = featureGridPropsSchema.parse({
      title: "Services",
      subtitle: "What we do",
      columns: 3,
      cardVariant: "iconTop",
      showCategories: false,
      items: [
        {
          id: "1",
          title: "Drafting",
          description: "Technical drawings",
          icon: "compass",
        },
      ],
    });
    assert.equal(parsed.cardVariant, "iconTop");
    assert.equal(parsed.items[0]?.description, "Technical drawings");
    assert.equal(parsed.items[0]?.descriptionHtml, "");
  });

  it("normalizes legacy cardVariant into layout and cardStyle", () => {
    const normalized = normalizeFeatureGridProps({
      title: "Features",
      cardVariant: "bordered",
      items: [],
    });
    assert.equal(normalized.layout, "standard");
    assert.equal(normalized.cardStyle, "outlined");
  });

  it("preserves explicit layout over legacy cardVariant mapping", () => {
    const normalized = normalizeFeatureGridProps({
      cardVariant: "iconTop",
      layout: "numbered",
      cardStyle: "elevated",
      items: [],
    });
    assert.equal(normalized.layout, "numbered");
    assert.equal(normalized.cardStyle, "elevated");
  });

  it("parses rich feature grid item fields", () => {
    const item = featureGridItemSchema.parse({
      id: "svc-1",
      title: "01. Drafting",
      descriptionHtml: "<p>Detailed drawings</p><ul><li>Workshop</li></ul>",
      descriptionContent: "{}",
      numberLabel: "01",
      badge: "Core",
      visualType: "icon",
    });
    assert.equal(item.numberLabel, "01");
    assert.ok(item.descriptionHtml.includes("<ul>"));
  });

  it("plainTextToHtml escapes and wraps paragraphs", () => {
    assert.equal(plainTextToHtml("Hello <world>"), "<p>Hello &lt;world&gt;</p>");
  });

  it("keeps benefitsGrid on plain gridItemSchema", () => {
    const parsed = benefitsGridPropsSchema.parse(BLOCK_DEFAULTS.benefitsGrid);
    assert.equal(parsed.layout, "cards");
    assert.equal(parsed.emphasis, "outcome");
    const item = gridItemSchema.parse({ id: "b1", title: "Benefit", description: "Plain" });
    assert.equal(item.description, "Plain");
    assert.equal("descriptionHtml" in item, false);
  });

  it("parses benefitsGrid defaults", () => {
    const parsed = benefitsGridPropsSchema.parse(BLOCK_DEFAULTS.benefitsGrid);
    assert.equal(parsed.layout, "cards");
    assert.equal(parsed.emphasis, "outcome");
  });

  it("parses trustBadges defaults", () => {
    const parsed = trustBadgesPropsSchema.parse(BLOCK_DEFAULTS.trustBadges);
    assert.equal(parsed.layout, "grid");
  });

  it("parses logoCloud defaults", () => {
    const parsed = logoCloudPropsSchema.parse(BLOCK_DEFAULTS.logoCloud);
    assert.equal(parsed.displayMode, "grid");
    assert.equal(parsed.grayscale, true);
    assert.equal(parsed.showNames, false);
  });

  it("parses statsCounter defaults", () => {
    const parsed = statsCounterPropsSchema.parse(BLOCK_DEFAULTS.statsCounter);
    assert.equal(parsed.animateOnView, true);
  });

  it("parses beforeAfter defaults", () => {
    const parsed = beforeAfterPropsSchema.parse(BLOCK_DEFAULTS.beforeAfter);
    assert.equal(parsed.layout, "slider");
    assert.equal(parsed.sliderPosition, 50);
  });

  it("parses tabbedShowcase defaults", () => {
    const parsed = tabbedShowcasePropsSchema.parse(BLOCK_DEFAULTS.tabbedShowcase);
    assert.equal(parsed.showNavArrows, true);
    assert.equal(parsed.tabs.length, 1);
  });

  it("parses extended hero defaults", () => {
    const parsed = extendedHeroPropsSchema.parse(BLOCK_DEFAULTS.hero);
    assert.equal(parsed.layout, "centered");
    assert.equal(parsed.minHeight, "70vh");
    assert.equal(parsed.fadeIntoSiteBackground, false);
  });

  it("parses extended cta defaults", () => {
    const parsed = extendedCtaPropsSchema.parse(BLOCK_DEFAULTS.cta);
    assert.equal(parsed.layout, "centered");
    assert.equal(parsed.countdownEnabled, false);
  });
});
