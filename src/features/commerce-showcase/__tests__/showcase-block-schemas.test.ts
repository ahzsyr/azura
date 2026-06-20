import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BLOCK_DEFAULTS } from "@/schemas/builder";
import {
  brandShowcasePropsSchema,
  categoryShowcasePropsSchema,
  productDiscoveryPropsSchema,
  productShowcasePropsSchema,
  taxonomyProductTabsPropsSchema,
} from "@/features/commerce-showcase/schemas/showcase-blocks";
import {
  brandNameToSlug,
  normalizeCatalogBrandProfiles,
  seedProfilesFromBrandNames,
} from "@/features/catalog/types/catalog-brand-profile";
import {
  coerceBrandShowcaseProps,
  mergeBrandWithOverrides,
  resolveBrandSelectionFromProps,
} from "@/features/commerce-showcase/lib/brand-selection";

describe("commerce showcase schemas", () => {
  it("parses categoryShowcase defaults", () => {
    const parsed = categoryShowcasePropsSchema.parse(BLOCK_DEFAULTS.categoryShowcase);
    assert.equal(parsed.layout, "grid");
    assert.equal(parsed.source, "collections");
  });

  it("parses brandShowcase defaults", () => {
    const parsed = brandShowcasePropsSchema.parse(BLOCK_DEFAULTS.brandShowcase);
    assert.equal(parsed.layout, "logoCarousel");
    assert.equal(parsed.source, "catalogProfiles");
    assert.equal(parsed.brandSelection, "all");
    assert.deepEqual(parsed.brandOverrides, {});
  });

  it("parses productShowcase defaults", () => {
    const parsed = productShowcasePropsSchema.parse(BLOCK_DEFAULTS.productShowcase);
    assert.equal(parsed.mode, "single");
    assert.equal(parsed.source, "featured");
  });

  it("parses taxonomyProductTabs defaults", () => {
    const parsed = taxonomyProductTabsPropsSchema.parse(BLOCK_DEFAULTS.taxonomyProductTabs);
    assert.equal(parsed.taxonomy, "category");
    assert.equal(parsed.ajaxEnabled, true);
  });

  it("parses productDiscovery defaults", () => {
    const parsed = productDiscoveryPropsSchema.parse(BLOCK_DEFAULTS.productDiscovery);
    assert.equal(parsed.layout, "grid");
    assert.equal(parsed.ajaxEnabled, true);
  });
});

describe("brand selection helpers", () => {
  it("infers manual mode from legacy source", () => {
    assert.equal(
      resolveBrandSelectionFromProps({ source: "manual", brandSelection: undefined }),
      "manual",
    );
  });

  it("infers pick mode from legacy manualSlugs", () => {
    assert.equal(
      resolveBrandSelectionFromProps({
        source: "catalogProfiles",
        manualSlugs: ["apple", "samsung"],
      }),
      "pick",
    );
  });

  it("coerces legacy manualSlugs into selectedBrandSlugs", () => {
    const coerced = coerceBrandShowcaseProps({
      source: "catalogProfiles",
      manualSlugs: ["apple"],
    });
    assert.equal(coerced.brandSelection, "pick");
    assert.deepEqual(coerced.selectedBrandSlugs, ["apple"]);
  });

  it("merges brand overrides onto catalog node", () => {
    const merged = mergeBrandWithOverrides(
      {
        slug: "apple",
        name: "Apple",
        nameEn: "Apple",
        nameAr: "Apple",
        logoUrl: "/old.png",
        href: "/en/products?brand=Apple",
      },
      { logoUrl: "/new.png", nameEn: "Apple Inc." },
    );
    assert.equal(merged.logoUrl, "/new.png");
    assert.equal(merged.nameEn, "Apple Inc.");
    assert.equal(merged.href, "/en/products?brand=Apple");
  });
});

describe("catalog brand profiles", () => {
  it("normalizes and seeds profiles from brand names", () => {
    const seeded = seedProfilesFromBrandNames([], ["Apple", "Samsung"]);
    assert.equal(seeded.length, 2);
    assert.equal(brandNameToSlug("Apple"), "apple");
    const merged = normalizeCatalogBrandProfiles([
      ...seeded,
      { ...seeded[0]!, name: "Apple Duplicate", slug: "apple" },
    ]);
    assert.equal(merged.length, 2);
  });
});
