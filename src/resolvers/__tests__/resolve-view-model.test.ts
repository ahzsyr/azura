import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ProductListingRecord } from "@/features/products/listing/types";
import { DEFAULT_RESOLVED_PRODUCT_BUY_NOW } from "@/features/products/lib/product-buy-now";
import { resolveProductCardFields } from "@/resolvers/product/product-card-fields";
import {
  getTemplateDefinition,
  isActiveTemplateId,
  listTemplateDefinitions,
} from "@/templates/registry";
import {
  TemplateNotActiveError,
  TemplatePresetMismatchError,
  UnknownTemplateError,
} from "@/resolvers/errors";
import { getTemplateDefinition as getDef } from "@/templates/registry";

const fixtureProduct: ProductListingRecord = {
  slug: "sample-widget",
  id: "prod-1",
  name: "Sample Widget",
  brand: "Acme",
  category: "Electronics",
  categories: ["Electronics"],
  tags: ["badge:new"],
  price: { value: 99, currency: "USD" },
  old_price: 129,
  priceMin: 99,
  priceMax: 99,
  in_stock: true,
  conditions: ["new"],
  variationFacets: {},
  collectionSlugs: [],
  searchText: "Sample Widget sample-widget Acme Electronics",
};

const minimalCardTheme = {
  cardLayout: {
    cardActionArrangement: "stacked" as const,
    hoverBehavior: "lift" as const,
    imageAspect: "square" as const,
  },
  buyNow: {
    ...DEFAULT_RESOLVED_PRODUCT_BUY_NOW,
    shopBaseUrl: "https://shop.example",
  },
  productCta: {
    enabled: true,
    label: "Quote",
    labelAr: "",
    href: "/quote",
    cardLayout: "floating_corner" as const,
    style: "outline" as const,
    openInNewTab: false,
    placement: "card" as const,
  },
  cardVariant: "default" as const,
  design: {
    presetId: "minimal" as const,
    style: "minimal" as const,
    layout: "classic_grid" as const,
    motion: "subtle" as const,
    hoverEffect: "lift" as const,
    pricingMode: "retail" as const,
    contentOrder: ["title", "price"] as const,
    badgePosition: "top-left" as const,
    maxBadges: 3,
    badgeRules: [],
    showCategory: true,
    effects: {
      enabled: false,
      gradientBorder: false,
      glow: false,
      glassLayer: false,
      lightSweep: false,
      noiseTexture: false,
    },
    media: {
      hoverSwap: false,
      galleryEnabled: false,
      maxGalleryImages: 4,
      effect: "none" as const,
      showSkeleton: true,
    },
    actions: {
      enabledTypes: ["buy_now", "cta"] as const,
      customActions: [],
      primaryAction: "buy_now" as const,
    },
    personalization: {
      highlightRecent: false,
      highlightRecommended: false,
      highlightTrending: false,
    },
    inheritThemePreset: true,
  },
  effectiveCardDisplay: {
    showPrice: true,
    showRating: true,
    showStock: true,
    showCompare: true,
    showBuyNow: true,
    showProductCta: true,
  },
  cardLayoutCssVars: { "--pl-card-radius": "8px" },
  designDataAttrs: { "data-card-style": "minimal" },
};

describe("template registry", () => {
  it("lists active product, content preset, knowledge, and portal card templates", () => {
    const active = listTemplateDefinitions({ status: "active" });
    assert.deepEqual(
      active.map((entry) => entry.id).sort(),
      [
        "destination-card",
        "destination-detail",
        "entity-card",
        "entity-detail",
        "entity-list",
        "knowledge-article-card",
        "knowledge-article-detail",
        "member-card",
        "partner-card",
        "plan-card",
        "product-card",
        "product-detail",
        "property-card",
        "property-detail",
        "service-card",
        "service-detail",
      ],
    );
  });

  it("marks planned portal templates", () => {
    const categoryList = getTemplateDefinition("knowledge-category-list");
    assert.equal(categoryList?.status, "planned");
    const member = getTemplateDefinition("member-card");
    assert.equal(member?.status, "active");
    assert.equal(member?.presetId, "team-member");
  });

  it("detects active template ids", () => {
    assert.equal(isActiveTemplateId("product-card"), true);
    assert.equal(isActiveTemplateId("member-card"), true);
    assert.equal(isActiveTemplateId("partner-card"), true);
    assert.equal(isActiveTemplateId("plan-card"), true);
    assert.equal(isActiveTemplateId("knowledge-category-list"), false);
  });
});

describe("resolver errors", () => {
  it("throws UnknownTemplateError", () => {
    assert.throws(() => {
      throw new UnknownTemplateError("missing");
    }, UnknownTemplateError);
  });

  it("throws TemplatePresetMismatchError", () => {
    const error = new TemplatePresetMismatchError("product-card", "service", "product");
    assert.match(error.message, /product-card/);
  });

  it("throws TemplateNotActiveError for planned templates", () => {
    assert.throws(() => {
      throw new TemplateNotActiveError("member-card");
    }, TemplateNotActiveError);
  });
});

describe("resolveProductCardFields", () => {
  it("builds a product-card view model with pricing and CTAs", () => {
    const viewModel = resolveProductCardFields({
      entityId: "prod-1",
      product: fixtureProduct,
      href: "/en/products/sample-widget",
      numberLocale: "en-US",
      localePrefix: "en",
      priority: false,
      cardLayout: minimalCardTheme.cardLayout,
      cardDisplay: minimalCardTheme.effectiveCardDisplay,
      design: minimalCardTheme.design,
      buyNow: minimalCardTheme.buyNow,
      productCta: minimalCardTheme.productCta,
      cardVariant: minimalCardTheme.cardVariant,
      layoutTokens: minimalCardTheme.cardLayoutCssVars,
      designDataAttrs: minimalCardTheme.designDataAttrs,
    });

    assert.equal(viewModel.templateId, "product-card");
    assert.equal(viewModel.slug, "sample-widget");
    assert.equal(viewModel.navHref, "/products/sample-widget");
    assert.ok(viewModel.discountPercent > 0);
    assert.equal(viewModel.showBuyNow, true);
    assert.equal(viewModel.showProductCta, true);
    assert.ok(viewModel.discountPercent > 0);
  });
});

describe("registry preset mapping", () => {
  it("maps product-card to product preset", () => {
    const def = getDef("product-card");
    assert.equal(def?.presetId, "product");
    assert.equal(def?.variant, "card");
  });
});
