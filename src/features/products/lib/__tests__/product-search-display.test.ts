import assert from "node:assert/strict";
import test from "node:test";
import { resolveProductSearchDisplay } from "@/features/products/lib/product-search-display";
import type { Product } from "@/features/products/types";

const baseProduct: Product = {
  id: "p1",
  productTitle: "Ubiquiti WAN Switch",
  name: "Ubiquiti WAN Switch",
  brand: "Ubiquiti",
  short_description: "Compact WAN switch for office networks.",
  description: "Full description with HTML and hidden metadata keywords.",
  tags: ["switch", "ubiquiti", "networking"],
  categories: ["Networking"],
  price: { value: 100, currency: "USD" },
  media: { images: [] },
  reviews: { rating: 4.5, count: 12 },
};

test("resolveProductSearchDisplay uses short description when enabled", () => {
  const { displaySnippet } = resolveProductSearchDisplay(
    { productPageDisplay: { shortDescription: { enabled: true } } },
    baseProduct,
  );
  assert.equal(displaySnippet, "Compact WAN switch for office networks.");
});

test("resolveProductSearchDisplay excludes tags when snippet fields disabled", () => {
  const { displaySnippet, searchCardDisplay } = resolveProductSearchDisplay(
    {
      productPageDisplay: {
        shortDescription: { enabled: false },
        tabDescription: { enabled: false },
        linkedTags: { enabled: false },
      },
    },
    baseProduct,
  );
  assert.equal(displaySnippet, "");
  assert.equal(searchCardDisplay.showSnippet, false);
});

test("resolveProductSearchDisplay respects per-product page_display overrides", () => {
  const { searchCardDisplay } = resolveProductSearchDisplay(
    { productPageDisplay: { price: { enabled: true }, cardBrand: { enabled: true } } },
    {
      ...baseProduct,
      page_display: {
        price: { enabled: false, inherit: false },
        cardBrand: { enabled: false, inherit: false },
      },
    },
  );
  assert.equal(searchCardDisplay.showPrice, false);
  assert.equal(searchCardDisplay.showBrand, false);
});

test("resolveProductSearchDisplay falls back to description when short description disabled", () => {
  const { displaySnippet } = resolveProductSearchDisplay(
    {
      productPageDisplay: {
        shortDescription: { enabled: false },
        tabDescription: { enabled: true },
      },
    },
    baseProduct,
  );
  assert.match(displaySnippet, /Full description with HTML/);
  assert.doesNotMatch(displaySnippet, /networking/);
});
