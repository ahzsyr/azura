import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProductCardDesign } from "@/features/products/card-design/resolve-product-card-design";
import { DEFAULT_RESOLVED_PRODUCT_BUY_NOW } from "@/features/products/lib/product-buy-now";
import { DEFAULT_RESOLVED_PRODUCT_CTA } from "@/features/products/lib/product-cta";
import { resolveProductPageDisplay } from "@/features/products/lib/product-page-display";
import {
  diagnosticsForSurface,
  resolveProductActionVisibility,
} from "@/features/products/lib/resolve-product-action-visibility";

const baseInput = () => ({
  buyNow: {
    ...DEFAULT_RESOLVED_PRODUCT_BUY_NOW,
    enabled: true,
    shopBaseUrl: "https://shop.example.com",
    slugPathPrefix: "/p/",
    placements: { page: true, card: true },
  },
  productCta: {
    ...DEFAULT_RESOLVED_PRODUCT_CTA,
    enabled: true,
    label: "Contact us",
    placements: { inline: true, floating: true, card: true },
    internalPath: "/contact",
    linkType: "internal" as const,
    cardLayout: "floating_corner" as const,
  },
  pageDisplay: resolveProductPageDisplay(undefined, undefined),
  cardDesign: resolveProductCardDesign({ partial: {} }),
});

describe("resolveProductActionVisibility", () => {
  it("reports Buy Now visible on card when all gates pass", () => {
    const diagnostics = resolveProductActionVisibility(baseInput());
    const card = diagnosticsForSurface(diagnostics, "buyNow", "card");
    assert.ok(card);
    assert.equal(card.visible, true);
    assert.ok(card.gates.every((g) => g.pass));
  });

  it("fails card Buy Now when card action type disabled", () => {
    const input = baseInput();
    input.cardDesign = resolveProductCardDesign({
      partial: {
        actions: {
          enabledTypes: ["cta", "wishlist", "compare", "quick_view"],
          primaryAction: "cta",
          customActions: [],
        },
      },
    });
    const card = diagnosticsForSurface(resolveProductActionVisibility(input), "buyNow", "card");
    assert.ok(card);
    assert.equal(card.visible, false);
    const typeGate = card.gates.find((g) => g.id === "cardActionType");
    assert.ok(typeGate);
    assert.equal(typeGate.pass, false);
    assert.equal(typeGate.fixHref, "#product-cards");
  });

  it("fails card CTA when card action type disabled", () => {
    const input = baseInput();
    input.cardDesign = resolveProductCardDesign({
      partial: {
        actions: {
          enabledTypes: ["buy_now", "wishlist", "compare", "quick_view"],
          primaryAction: "buy_now",
          customActions: [],
        },
      },
    });
    const card = diagnosticsForSurface(resolveProductActionVisibility(input), "cta", "card");
    assert.ok(card);
    assert.equal(card.visible, false);
    assert.equal(card.gates.find((g) => g.id === "cardActionType")?.pass, false);
  });

  it("shows PDP buy box when shop URL empty but shopUrl gate fails", () => {
    const input = baseInput();
    input.buyNow = { ...input.buyNow, shopBaseUrl: "" };
    const pdp = diagnosticsForSurface(resolveProductActionVisibility(input), "buyNow", "pdpBuyBox");
    assert.ok(pdp);
    assert.equal(pdp.visible, true);
    assert.equal(pdp.gates.find((g) => g.id === "shopUrl")?.pass, false);
  });

  it("fails Quick View when page element disabled", () => {
    const input = baseInput();
    input.pageDisplay = resolveProductPageDisplay(
      { buyNow: { enabled: false }, quickView: { enabled: false } },
      undefined,
    );
    const qv = diagnosticsForSurface(resolveProductActionVisibility(input), "quickView", "card");
    assert.ok(qv);
    assert.equal(qv.visible, false);
    const gate = qv.gates.find((g) => g.id === "pageElementQuickView");
    assert.ok(gate);
    assert.equal(gate.pass, false);
  });

  it("allows Quick View when explicitly enabled while Buy Now page element is off", () => {
    const input = baseInput();
    input.pageDisplay = resolveProductPageDisplay(
      { buyNow: { enabled: false }, quickView: { enabled: true } },
      undefined,
    );
    const qv = diagnosticsForSurface(resolveProductActionVisibility(input), "quickView", "card");
    assert.ok(qv);
    assert.equal(qv.gates.find((g) => g.id === "pageElementQuickView")?.pass, true);
    assert.equal(qv.visible, true);
  });

  it("fails CTA on card when quick_action layout", () => {
    const input = baseInput();
    input.productCta = { ...input.productCta, cardLayout: "quick_action" };
    const card = diagnosticsForSurface(resolveProductActionVisibility(input), "cta", "card");
    assert.ok(card);
    assert.equal(card.visible, false);
    assert.equal(card.gates.find((g) => g.id === "cardLayoutSlot")?.pass, false);
  });
});
