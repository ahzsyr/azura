import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appearanceConfigFromParts,
  appearanceConfigFromSite,
  appearanceConfigToSiteSettings,
  applyQuickViewMode,
} from "../product-card-appearance-adapter";
import { resolveProductCardDesign } from "@/features/products/card-design/resolve-product-card-design";
import { applyProductCardPreset } from "@/features/products/card-design/product-card-presets";
import { resolveProductCardLayout } from "@/features/products/lib/product-storefront-layout";

describe("product-card-appearance-adapter", () => {
  it("round-trips design, layout, and responsive keys", () => {
    const layout = resolveProductCardLayout();
    const design = resolveProductCardDesign({ legacyLayout: layout });
    const responsive = {
      mobile: { layout: "compact_store" as const },
    };

    const config = appearanceConfigFromParts(design, layout, responsive);
    const saved = appearanceConfigToSiteSettings(config);
    const reloaded = appearanceConfigFromSite({
      productCardDesign: saved.productCardDesign,
      productCardLayout: saved.productCardLayout,
      productCardDesignResponsive: saved.productCardDesignResponsive,
    });

    assert.equal(reloaded.design.layout, config.design.layout);
    assert.equal(reloaded.design.hoverEffect, config.design.hoverEffect);
    assert.equal(reloaded.layout.cardActionArrangement, config.layout.cardActionArrangement);
    assert.equal(reloaded.responsive.mobile?.layout, "compact_store");
  });

  it("writes hover effect to design and syncs non-default hovers to legacy layout", () => {
    const layout = resolveProductCardLayout();
    const design = resolveProductCardDesign({
      partial: { hoverEffect: "glow" },
      legacyLayout: layout,
    });
    const config = appearanceConfigFromParts(design, layout);
    const saved = appearanceConfigToSiteSettings(config);

    assert.equal(saved.productCardDesign.hoverEffect, "glow");
    assert.equal(saved.productCardLayout?.hoverBehavior, "glow");
  });

  it("normalizes legacy card visibility flags out of the unified config", () => {
    const layout = resolveProductCardLayout({ showBrand: false, showCompare: false });
    const design = resolveProductCardDesign({ legacyLayout: layout });
    const config = appearanceConfigFromParts(design, layout);

    assert.equal(config.layout.showBrand, true);
    assert.equal(config.layout.showCompare, true);
  });

  it("maps quick view modes to layout and action enablement", () => {
    const layout = resolveProductCardLayout();
    const design = resolveProductCardDesign({ legacyLayout: layout });

    const overlay = applyQuickViewMode("hover_overlay", layout, design);
    assert.equal(overlay.layout.showQuickAction, true);
    assert.ok(overlay.design.actions.enabledTypes.includes("quick_view"));

    const button = applyQuickViewMode("action_button", layout, design);
    assert.equal(button.layout.showQuickAction, false);
    assert.ok(button.design.actions.enabledTypes.includes("quick_view"));

    const disabled = applyQuickViewMode("disabled", layout, design);
    assert.equal(disabled.layout.showQuickAction, false);
    assert.ok(!disabled.design.actions.enabledTypes.includes("quick_view"));
  });

  it("reset preset reapplies active preset defaults", () => {
    const layout = resolveProductCardLayout();
    const luxury = resolveProductCardDesign({
      partial: applyProductCardPreset("luxury", {}),
      legacyLayout: layout,
    });
    const withTweak = appearanceConfigFromParts({ ...luxury, style: "minimal" }, layout);
    const resetDesign = resolveProductCardDesign({
      partial: applyProductCardPreset("luxury", {}),
      legacyLayout: layout,
    });

    assert.equal(withTweak.design.style, "minimal");
    assert.notEqual(withTweak.design.style, resetDesign.style);
  });
});
