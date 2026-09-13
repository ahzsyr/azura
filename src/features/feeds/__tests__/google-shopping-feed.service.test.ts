import assert from "node:assert/strict";
import test from "node:test";
import {
  formatGoogleShoppingFeedXml,
  isExcludedFromGoogleShopping,
  mapGoogleShoppingAvailability,
  mapGoogleShoppingCondition,
  formatGoogleShoppingPrice,
  resolveGoogleShoppingEligibility,
} from "../google-shopping-eligibility";
import { formatGoogleShoppingFeedXml as formatXml } from "../google-shopping-feed.mapper";
import { sampleMarket, sampleProduct } from "./google-shopping-fixtures";

test("excludes products flagged for Google Shopping omission", () => {
  assert.equal(isExcludedFromGoogleShopping({}), false);
  assert.equal(isExcludedFromGoogleShopping({ excludeFromGoogleShopping: true }), true);

  const excluded = resolveGoogleShoppingEligibility(
    sampleProduct({ excludeFromGoogleShopping: true }),
    sampleMarket(),
  );
  assert.equal(excluded.status, "excluded");
  assert.ok(excluded.issues.includes("EXCLUDED"));
});

test("maps MVP Google Shopping fields for published catalog products via resolver", () => {
  const result = resolveGoogleShoppingEligibility(sampleProduct(), sampleMarket());
  assert.ok(result.item);
  assert.equal(result.item!.id, "sku-rb5009");
  assert.equal(result.item!.title, "MikroTik RB5009UG+S+IN");
  assert.equal(result.item!.link, "https://brt-me.com/products/mikrotik-rb5009");
  assert.equal(result.item!.availability, "in stock");
  assert.equal(result.item!.price, "499.00 AED");
  assert.equal(result.item!.condition, "new");
  assert.equal(result.item!.brand, "MikroTik");
});

test("maps availability and condition variants", () => {
  assert.equal(mapGoogleShoppingAvailability("OutOfStock"), "out of stock");
  assert.equal(mapGoogleShoppingAvailability("PreOrder"), "preorder");
  assert.equal(mapGoogleShoppingAvailability(undefined, "preorder"), "preorder");
  assert.equal(mapGoogleShoppingAvailability(undefined, "backorder"), "backorder");
  assert.equal(mapGoogleShoppingAvailability("RequestQuote"), null);
  assert.equal(mapGoogleShoppingCondition(["used"]), "used");
  assert.equal(mapGoogleShoppingCondition([]), "new");
  assert.equal(formatGoogleShoppingPrice(10, "AED"), "10.00 AED");
});

test("formats XML via mapper from resolver items", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({
      productTitle: "Lens & Body <pro>",
      description: "Wide & sharp",
    }),
    sampleMarket(),
  );
  const xml = formatXml([result.item!], {
    siteOrigin: "https://brt-me.com",
    title: "BRT Feed",
  });
  assert.match(xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  assert.match(xml, /<g:title>Lens &amp; Body &lt;pro&gt;<\/g:title>/);
});

test("returns empty channel XML when there are no items", () => {
  const xml = formatXml([], { siteOrigin: "https://brt-me.com" });
  assert.match(xml, /<channel>/);
  assert.doesNotMatch(xml, /<item>/);
});

test("skips products missing required image or description", () => {
  assert.equal(
    resolveGoogleShoppingEligibility(
      sampleProduct({ media: { images: [] }, description: "", short_description: "" }),
      sampleMarket(),
    ).status,
    "excluded",
  );
});

// Keep named export reference if anything still imports formatGoogleShoppingFeedXml from eligibility path
void formatGoogleShoppingFeedXml;
