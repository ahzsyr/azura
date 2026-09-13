import assert from "node:assert/strict";
import test from "node:test";
import {
  mapGoogleShoppingAvailability,
  resolveGoogleShoppingEligibility,
} from "../google-shopping-eligibility";
import { resolveProductCurrency } from "../google-shopping-market";
import { GOOGLE_SHOPPING_FEED_VERSION } from "../google-shopping-feed.types";
import { sampleMarket, sampleProduct } from "./google-shopping-fixtures";

test("maps commercial availability without turning quote into out of stock", () => {
  assert.equal(mapGoogleShoppingAvailability("InStock"), "in stock");
  assert.equal(mapGoogleShoppingAvailability("OutOfStock"), "out of stock");
  assert.equal(mapGoogleShoppingAvailability("PreOrder"), "preorder");
  assert.equal(mapGoogleShoppingAvailability("Backorder"), "backorder");
  assert.equal(mapGoogleShoppingAvailability("RequestQuote"), null);
  assert.equal(mapGoogleShoppingAvailability("ExternalPurchase"), null);
});

test("READY product with Brand+GTIN", () => {
  const result = resolveGoogleShoppingEligibility(sampleProduct(), sampleMarket());
  assert.equal(result.status, "ready");
  assert.equal(result.issues.length, 0);
  assert.equal(result.warnings.length, 0);
  assert.ok(result.item);
  assert.equal(result.item!.identifierExists, "yes");
  assert.equal(result.item!.gtin, "4752224001234");
  assert.equal(result.item!.mpn, "RB5009UG+S+IN");
  assert.equal(result.item!.price, "499.00 AED");
  assert.equal(result.item!.shipping?.country, "AE");
  assert.equal(result.feedVersion, GOOGLE_SHOPPING_FEED_VERSION);
});

test("RequestQuote is excluded as QUOTE_REQUIRED, not out of stock", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({ availability: "RequestQuote" }),
    sampleMarket(),
  );
  assert.equal(result.status, "excluded");
  assert.ok(result.issues.includes("QUOTE_REQUIRED"));
  assert.equal(result.item, null);
  assert.equal(result.items.length, 0);
});

test("ExternalPurchase is excluded", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({ availability: "ExternalPurchase" }),
    sampleMarket(),
  );
  assert.equal(result.status, "excluded");
  assert.ok(result.issues.includes("EXTERNAL_PURCHASE"));
});

test("Brand+MPN without GTIN warns MISSING_GTIN and does not set identifier_exists=yes", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({ ean: "" }),
    sampleMarket(),
  );
  assert.equal(result.status, "warning");
  assert.ok(result.warnings.includes("MISSING_GTIN"));
  assert.ok(!result.warnings.includes("IDENTIFIER_UNAVAILABLE"));
  assert.equal(result.item!.identifierExists, "no");
  assert.equal(result.item!.mpn, "RB5009UG+S+IN");
  assert.equal(result.item!.gtin, undefined);
});

test("no GTIN and no MPN warns IDENTIFIER_UNAVAILABLE", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({ ean: "", mpn: "", manufacturer_part_number: "" }),
    sampleMarket(),
  );
  assert.equal(result.status, "warning");
  assert.ok(result.warnings.includes("MISSING_GTIN"));
  assert.ok(result.warnings.includes("MISSING_MPN"));
  assert.ok(result.warnings.includes("IDENTIFIER_UNAVAILABLE"));
  assert.equal(result.item!.identifierExists, "no");
});

test("strict mode excludes missing GTIN", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({ ean: "" }),
    sampleMarket({ validationMode: "strict" }),
  );
  assert.equal(result.status, "excluded");
  assert.ok(result.issues.includes("MISSING_GTIN"));
});

test("standard mode keeps missing GTIN as warning", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({ ean: "" }),
    sampleMarket({ validationMode: "standard" }),
  );
  assert.equal(result.status, "warning");
  assert.ok(!result.issues.includes("MISSING_GTIN"));
});

test("currency mismatch warns but feed price uses market currency (AED)", () => {
  const market = sampleMarket({ defaultCurrency: "AED" });
  assert.equal(
    resolveProductCurrency({ price: { value: 10, currency: undefined as never } }, market),
    "AED",
  );
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({ price: { value: 100, currency: "USD" } }),
    market,
  );
  assert.equal(result.status, "warning");
  assert.ok(result.warnings.includes("CURRENCY_MISMATCH"));
  // 100 USD × 3.67 AED/USD from seeds/catalog/currency.config.json
  assert.equal(result.item!.price, "367.00 AED");
  assert.equal(result.item!.shipping?.price, "0.00 AED");
});

test("missing feed shipping excludes product", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct(),
    sampleMarket({ shippingCountry: undefined, shippingService: undefined, shippingPrice: undefined }),
  );
  assert.equal(result.status, "excluded");
  assert.ok(result.issues.includes("MISSING_SHIPPING"));
});

test("excludeFromGoogleShopping and missing brand/price/image", () => {
  assert.equal(
    resolveGoogleShoppingEligibility(
      sampleProduct({ excludeFromGoogleShopping: true }),
      sampleMarket(),
    ).status,
    "excluded",
  );
  assert.ok(
    resolveGoogleShoppingEligibility(
      sampleProduct({ brand: "" }),
      sampleMarket(),
    ).issues.includes("MISSING_BRAND"),
  );
  assert.ok(
    resolveGoogleShoppingEligibility(
      sampleProduct({ price: { value: 0, currency: "AED" } }),
      sampleMarket(),
    ).issues.includes("INVALID_PRICE"),
  );
  assert.ok(
    resolveGoogleShoppingEligibility(
      sampleProduct({ media: { images: [] } }),
      sampleMarket(),
    ).issues.includes("MISSING_IMAGE"),
  );
});

test("http image is INVALID_IMAGE_URL", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({
      media: { images: [{ url: "http://cdn.example.com/x.jpg", type: "main" }] },
    }),
    sampleMarket(),
  );
  assert.equal(result.status, "excluded");
  assert.ok(result.issues.includes("INVALID_IMAGE_URL"));
});

test("sale_price when old_price is higher", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({ old_price: 599 }),
    sampleMarket(),
  );
  assert.equal(result.item!.salePrice, "599.00 AED");
  assert.equal(result.item!.price, "499.00 AED");
});

test("missing google category is a warning", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({ googleProductCategory: undefined, mainCategory: undefined, category: null, categories: [] }),
    sampleMarket(),
  );
  assert.equal(result.status, "warning");
  assert.ok(result.warnings.includes("MISSING_GOOGLE_CATEGORY"));
});
