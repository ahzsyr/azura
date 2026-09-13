import assert from "node:assert/strict";
import test from "node:test";
import { resolveGoogleShoppingEligibility } from "../google-shopping-eligibility";
import { formatGoogleShoppingFeedXml } from "../google-shopping-feed.mapper";
import { sampleMarket, sampleProduct } from "./google-shopping-fixtures";

test("variation_combinations with SKUs emit separate rows sharing item_group_id", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({
      variation_combinations: [
        { sku: "RB5009-BLUE", price: 499, color: "Blue" },
        { sku: "RB5009-RED", price: 519, color: "Red" },
      ],
    }),
    sampleMarket(),
  );
  assert.equal(result.status, "ready");
  assert.equal(result.items.length, 2);
  const ids = result.items.map((i) => i.id).sort();
  assert.deepEqual(ids, ["RB5009-BLUE", "RB5009-RED"]);
  assert.ok(result.items.every((i) => i.itemGroupId === "sku-rb5009"));
  assert.equal(result.items.find((i) => i.id === "RB5009-RED")?.price, "519.00 AED");
  assert.equal(result.items.find((i) => i.id === "RB5009-BLUE")?.color, "Blue");
});

test("does not invent variants from available_colors", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({
      // @ts-expect-error available_colors is not a feed input field
      available_colors: ["Blue", "Red"],
    } as never),
    sampleMarket(),
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]!.id, "sku-rb5009");
  assert.equal(result.items[0]!.itemGroupId, undefined);
});

test("combinations without SKUs fall back to single parent row", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({
      variation_combinations: [{ color: "Blue", price: 499 }, { color: "Red" }],
    }),
    sampleMarket(),
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]!.id, "sku-rb5009");
});

test("duplicate combination SKUs are de-duplicated", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({
      variation_combinations: [
        { sku: "RB5009-BLUE", price: 499 },
        { sku: "RB5009-BLUE", price: 509 },
      ],
    }),
    sampleMarket(),
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]!.id, "RB5009-BLUE");
});

test("variant rows serialize with item_group_id in XML", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({
      variation_combinations: [
        { sku: "A-1", price: 100 },
        { sku: "A-2", price: 110 },
      ],
    }),
    sampleMarket(),
  );
  const xml = formatGoogleShoppingFeedXml(result.items, { siteOrigin: "https://brt-me.com" });
  assert.match(xml, /<g:id>A-1<\/g:id>/);
  assert.match(xml, /<g:id>A-2<\/g:id>/);
  assert.match(xml, /<g:item_group_id>sku-rb5009<\/g:item_group_id>/);
});
