import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blockRegistry } from "@/features/builder/registry/block-registry-system";

describe("blockRegistry", () => {
  it("registers all 60 block types", () => {
    assert.equal(blockRegistry.list().length, 60);
  });

  it("registers media blocks", () => {
    const media = blockRegistry.byCategory("media");
    assert.equal(media.length, 5);
    assert.ok(media.some((b) => b.type === "videoHero"));
    assert.ok(media.some((b) => b.type === "videoGallery"));
    assert.ok(media.some((b) => b.type === "beforeAfter"));
    assert.ok(media.some((b) => b.type === "interactiveHotspots"));
    assert.ok(media.some((b) => b.type === "masonryGallery"));
    assert.equal(blockRegistry.get("beforeAfter")?.name, "Image Comparison");
  });

  it("registers discovery blocks", () => {
    const discovery = blockRegistry.byCategory("discovery");
    assert.equal(discovery.length, 5);
    assert.ok(discovery.some((b) => b.type === "searchBlock"));
    assert.ok(discovery.some((b) => b.type === "relatedContent"));
  });

  it("registers commerce product blocks", () => {
    const commerce = blockRegistry.byCategory("commerce");
    assert.ok(commerce.some((b) => b.type === "productGrid"));
    assert.ok(commerce.some((b) => b.type === "relatedProducts"));
  });

  it("registers conversion blocks", () => {
    const conversion = blockRegistry.byCategory("conversion");
    assert.ok(conversion.some((b) => b.type === "stickyCta"));
    assert.ok(conversion.some((b) => b.type === "downloadGate"));
    assert.equal(conversion.length, 6);
  });

  it("registers portal blocks", () => {
    const portal = blockRegistry.byCategory("portal");
    assert.equal(portal.length, 6);
    assert.ok(portal.some((b) => b.type === "knowledgeBase"));
    assert.ok(portal.some((b) => b.type === "pricingCalculator"));
    assert.equal(blockRegistry.get("pricing")?.name, "Pricing Table");
    assert.equal(blockRegistry.get("changelog")?.name, "Release Notes");
  });

  it("returns metadata for hero pro", () => {
    const hero = blockRegistry.get("hero");
    assert.ok(hero);
    assert.equal(hero.type, "hero");
    assert.equal(hero.name, "Hero Pro");
    assert.equal(hero.version, "2.0");
    assert.ok(hero.translatableFields.includes("title"));
  });

  it("groups blocks by category", () => {
    const layout = blockRegistry.byCategory("layout");
    assert.ok(layout.some((b) => b.type === "hero"));
    assert.ok(layout.some((b) => b.type === "section"));
    assert.ok(layout.some((b) => b.type === "rowSection"));
    assert.equal(blockRegistry.get("rowSection")?.name, "Row Section");
  });

  it("registers announcementBar in marketing category", () => {
    const marketing = blockRegistry.byCategory("marketing");
    assert.ok(marketing.some((b) => b.type === "announcementBar"));
    assert.equal(blockRegistry.get("announcementBar")?.name, "Announcement Bar");
  });
});
