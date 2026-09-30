import assert from "node:assert/strict";
import test from "node:test";
import {
  matchMvpCampaignProductSet,
  parseMvpCampaignProductSet,
} from "../google-shopping-mvp-set";

test("parseMvpCampaignProductSet ignores blanks, comments, and duplicates", () => {
  const tokens = parseMvpCampaignProductSet(`
# Launch set
sku-a
sku-b
sku-a
  SKU-B  
# trailing
`);
  assert.deepEqual(tokens, ["sku-a", "sku-b"]);
});

test("parseMvpCampaignProductSet returns empty for non-strings", () => {
  assert.deepEqual(parseMvpCampaignProductSet(null), []);
  assert.deepEqual(parseMvpCampaignProductSet(undefined), []);
  assert.deepEqual(parseMvpCampaignProductSet(12), []);
  assert.deepEqual(parseMvpCampaignProductSet("   \n  # only\n"), []);
});

test("matchMvpCampaignProductSet matches id, slug, and mpn", () => {
  const entries = [
    {
      product: {
        id: "prod-1",
        slug: "rb5009",
        productTitle: "RB5009",
        mpn: "RB5009UG+S+IN",
      },
      result: { status: "ready" as const, items: [{ id: "prod-1" }] },
    },
    {
      product: {
        id: "prod-2",
        slug: "quote-only",
        title: "Quote",
      },
      result: { status: "excluded" as const, items: [] },
    },
  ];

  const matches = matchMvpCampaignProductSet(
    ["rb5009", "RB5009UG+S+IN", "prod-2", "missing-sku"],
    entries,
  );

  assert.equal(matches.length, 4);
  assert.equal(matches[0].matched, true);
  assert.equal(matches[0].inFeed, true);
  assert.equal(matches[0].status, "ready");
  assert.equal(matches[1].matched, true);
  assert.equal(matches[1].productId, "prod-1");
  assert.equal(matches[2].matched, true);
  assert.equal(matches[2].inFeed, false);
  assert.equal(matches[2].status, "excluded");
  assert.equal(matches[3].matched, false);
  assert.equal(matches[3].inFeed, false);
});
