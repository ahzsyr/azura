import assert from "node:assert/strict";
import test from "node:test";
import { formatGoogleShoppingFeedXml } from "../google-shopping-feed.mapper";
import {
  adjustGoogleShoppingPrice,
  applyGoogleShoppingFeedOverrides,
  availabilityRequiresDate,
  normalizeGoogleShoppingAvailabilityDate,
} from "../google-shopping-feed.overrides";
import { resolveGoogleShoppingEligibility } from "../google-shopping-eligibility";
import { resolveGoogleShoppingMarket } from "../google-shopping-market";
import { sampleMarket, sampleProduct } from "./google-shopping-fixtures";

test("increases list price by percentage: price + percent * price", () => {
  assert.equal(adjustGoogleShoppingPrice("499.00 AED", 10, "increase"), "548.90 AED");
});

test("decreases list price by percentage: price - percent * price", () => {
  assert.equal(adjustGoogleShoppingPrice("499.00 AED", 10, "decrease"), "449.10 AED");
});

test("zero percent leaves the amount unchanged", () => {
  assert.equal(adjustGoogleShoppingPrice("499.00 AED", 0, "increase"), "499.00 AED");
});

test("applies price and availability overrides to feed items and XML", () => {
  const result = resolveGoogleShoppingEligibility(sampleProduct(), sampleMarket());
  assert.ok(result.item);
  const items = applyGoogleShoppingFeedOverrides([result.item!], {
    priceAdjustmentPercent: 10,
    priceAdjustmentDirection: "increase",
    availabilityOverride: "backorder",
    availabilityDate: "2026-10-15",
  });
  assert.equal(items[0]?.price, "548.90 AED");
  assert.equal(items[0]?.availability, "backorder");
  assert.equal(items[0]?.availabilityDate, "2026-10-15T00:00:00Z");

  const xml = formatGoogleShoppingFeedXml(items, { siteOrigin: "https://brt-me.com" });
  assert.match(xml, /<g:availability>backorder<\/g:availability>/);
  assert.match(xml, /<g:availability_date>2026-10-15T00:00:00Z<\/g:availability_date>/);
  assert.match(xml, /<g:price>548\.90 AED<\/g:price>/);
});

test("omits availability_date when override is in stock", () => {
  const result = resolveGoogleShoppingEligibility(sampleProduct(), sampleMarket());
  const items = applyGoogleShoppingFeedOverrides([result.item!], {
    availabilityOverride: "in stock",
    availabilityDate: "2026-10-15",
  });
  assert.equal(items[0]?.availability, "in stock");
  assert.equal(items[0]?.availabilityDate, undefined);

  const xml = formatGoogleShoppingFeedXml(items, { siteOrigin: "https://brt-me.com" });
  assert.match(xml, /<g:availability>in stock<\/g:availability>/);
  assert.doesNotMatch(xml, /availability_date/);
});

test("applies the same percentage to sale_price", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({ old_price: 599 }),
    sampleMarket(),
  );
  const items = applyGoogleShoppingFeedOverrides(result.items, {
    priceAdjustmentPercent: 10,
    priceAdjustmentDirection: "decrease",
  });
  assert.equal(items[0]?.price, "449.10 AED");
  assert.equal(items[0]?.salePrice, "539.10 AED");
});

test("normalizeGoogleShoppingAvailabilityDate converts date-only to UTC midnight", () => {
  assert.equal(
    normalizeGoogleShoppingAvailabilityDate("2026-10-15"),
    "2026-10-15T00:00:00Z",
  );
  assert.equal(
    normalizeGoogleShoppingAvailabilityDate("2026-10-15T12:00:00Z"),
    "2026-10-15T12:00:00Z",
  );
  assert.equal(availabilityRequiresDate("backorder"), true);
  assert.equal(availabilityRequiresDate("preorder"), true);
  assert.equal(availabilityRequiresDate("in stock"), false);
});

test("resolveGoogleShoppingMarket reads feed generation config", () => {
  const market = resolveGoogleShoppingMarket(
    {
      storeUrl: "https://brt-me.com",
      feedPriceAdjustmentPercent: 12.5,
      feedPriceAdjustmentDirection: "decrease",
      feedAvailability: "preorder",
      feedAvailabilityDate: "2026-11-01",
    },
    { siteOrigin: "https://brt-me.com", localePrefix: "en" },
  );
  assert.equal(market.priceAdjustmentPercent, 12.5);
  assert.equal(market.priceAdjustmentDirection, "decrease");
  assert.equal(market.availabilityOverride, "preorder");
  assert.equal(market.availabilityDate, "2026-11-01");
});
