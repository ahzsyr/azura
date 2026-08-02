import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyProductCardPreset } from "@/features/products/card-design/product-card-presets";
import { resolveProductCardBadges } from "@/features/products/card-design/resolve-product-card-badges";
import {
  resolveProductCardDesign,
  resolveProductCardResponsiveRules,
  serializeProductCardDesignForSite,
} from "@/features/products/card-design/resolve-product-card-design";
import type { ProductListingRecord } from "@/features/products/listing/types";
import { resolveProductCardLayout } from "@/features/products/lib/product-storefront-layout";
import {
  buildProductCardPreviewTheme,
  productCardThemeFromLegacyProps,
} from "@/features/products/lib/product-card-theme";
import { buildProductPageSettingsFromSite } from "@/features/products/lib/product-page-responsive";
import { resolveEffectiveCardDesignState } from "@/features/products/lib/resolve-effective-card-design";
import { resolveProductBuyNow } from "@/features/products/lib/product-buy-now";
import { resolveProductCta, DEFAULT_RESOLVED_PRODUCT_CTA } from "@/features/products/lib/product-cta";

describe("resolveProductCardDesign preset persistence", () => {
  it("migrates legacy hoverBehavior into v2 design", () => {
    const legacy = resolveProductCardLayout({ hoverBehavior: "glow" });
    const design = resolveProductCardDesign({ legacyLayout: legacy });
    assert.equal(design.hoverEffect, "glow");
  });

  it("maps legacy quote action type to cta", () => {
    const design = resolveProductCardDesign({
      partial: {
        actions: {
          enabledTypes: ["buy_now", "quote"],
          primaryAction: "quote",
          customActions: [],
        },
      },
    });
    assert.deepEqual(design.actions.enabledTypes, ["buy_now", "cta"]);
    assert.equal(design.actions.primaryAction, "cta");
  });

  it("serializes minimal diff for defaults", () => {
    const design = resolveProductCardDesign({});
    const serialized = serializeProductCardDesignForSite(design);
    assert.equal(Object.keys(serialized).length, 0);
  });

  it("applies preset base before saved partial overrides", () => {
    const design = resolveProductCardDesign({
      partial: {
        presetId: "luxury",
        hoverEffect: "tilt",
      },
    });
    assert.equal(design.style, "luxury");
    assert.equal(design.layout, "luxury_showcase");
    assert.equal(design.hoverEffect, "tilt");
  });

  it("preserves electronics preset style mapping", () => {
    const merged = applyProductCardPreset("electronics", {});
    const design = resolveProductCardDesign({
      partial: {
        ...merged,
        presetId: "electronics",
      },
    });
    assert.equal(design.presetId, "electronics");
    assert.equal(design.style, "modern_commerce");
    assert.equal(design.layout, "marketplace");
  });

  it("round-trips customized preset fields through serialize + resolve", () => {
    const original = resolveProductCardDesign({
      partial: {
        presetId: "luxury",
        hoverEffect: "tilt",
        effects: {
          enabled: true,
          gradientBorder: false,
          glow: true,
          glassLayer: false,
          lightSweep: false,
          noiseTexture: false,
        },
      },
    });
    const serialized = serializeProductCardDesignForSite(original);
    const restored = resolveProductCardDesign({ partial: serialized });
    assert.equal(restored.presetId, "luxury");
    assert.equal(restored.hoverEffect, "tilt");
    assert.equal(restored.effects.glow, true);
  });
});

describe("resolveEffectiveCardDesignState", () => {
  it("applies mobile responsive overrides at mobile viewport", () => {
    const base = resolveProductCardDesign({ partial: { style: "modern_commerce" } });
    const responsive = resolveProductCardResponsiveRules(base, {
      mobile: { style: "minimal", layout: "compact_store" },
    });
    const cardLayout = resolveProductCardLayout();

    const desktop = resolveEffectiveCardDesignState({
      design: base,
      responsive,
      cardLayout,
      viewport: "desktop",
    });
    const mobile = resolveEffectiveCardDesignState({
      design: base,
      responsive,
      cardLayout,
      viewport: "mobile",
    });

    assert.equal(desktop.design.style, "modern_commerce");
    assert.equal(mobile.design.style, "minimal");
    assert.equal(mobile.design.layout, "compact_store");
    assert.equal(mobile.designDataAttrs["data-prd-style"], "minimal");
  });
});

describe("buildProductCardPreviewTheme", () => {
  it("uses saved page element rules instead of resolver defaults", () => {
    const elementsRules = buildProductPageSettingsFromSite({
      productPageDisplay: {
        price: { enabled: false },
        stock: { enabled: true },
        shortDescription: { enabled: true },
        compare: { enabled: true },
        trust: { enabled: true },
        buyNow: { enabled: true },
        wishlist: { enabled: true },
        linkedTags: { enabled: true },
      },
    }).elementsRules;

    const theme = buildProductCardPreviewTheme({
      design: resolveProductCardDesign({ partial: { style: "luxury" } }),
      cardLayout: resolveProductCardLayout(),
      elementsRules,
      buyNow: resolveProductBuyNow(),
      productCta: resolveProductCta(DEFAULT_RESOLVED_PRODUCT_CTA, undefined),
    });

    assert.equal(theme.cardDisplay.showPrice, false);
    assert.equal(theme.elementsRules.desktop.display.price.enabled, false);
    assert.equal(theme.design.style, "luxury");
  });
});

describe("productCardThemeFromLegacyProps", () => {
  it("accepts explicit design and responsive rules", () => {
    const design = resolveProductCardDesign({ partial: { style: "glass" } });
    const responsive = resolveProductCardResponsiveRules(design, {
      tablet: { layout: "editorial" },
    });
    const theme = productCardThemeFromLegacyProps({ design, responsive });
    assert.equal(theme.design.style, "glass");
    assert.equal(theme.responsive.tablet.layout, "editorial");
  });
});

describe("resolveProductCardBadges", () => {
  const base: ProductListingRecord = {
    slug: "x",
    id: "1",
    name: "Test",
    categories: [],
    tags: ["badge:new"],
    price: { value: 80, currency: "USD" },
    old_price: 100,
    priceMin: 80,
    priceMax: 80,
    in_stock: true,
    conditions: [],
    variationFacets: {},
    collectionSlugs: [],
    searchText: "",
  };

  it("returns sale and new badges", () => {
    const design = resolveProductCardDesign({});
    const badges = resolveProductCardBadges(base, design, 20);
    assert.ok(badges.some((b) => b.type === "sale"));
    assert.ok(badges.some((b) => b.type === "new"));
  });
});
