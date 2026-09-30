import assert from "node:assert/strict";
import test from "node:test";
import { resolveGoogleShoppingEligibility } from "../google-shopping-eligibility";
import {
  apexOriginSuggestion,
  originFromAbsoluteUrl,
  productLinksMatchStoreOrigin,
  resolveGoogleShoppingMarket,
  resolveGoogleShoppingStoreOrigin,
  storeOriginIsFinalLandingHost,
  storeOriginUsesWwwPrefix,
} from "../google-shopping-market";
import { sampleProduct } from "./google-shopping-fixtures";

test("originFromAbsoluteUrl extracts https origin", () => {
  assert.equal(originFromAbsoluteUrl("https://brt-me.com/feeds/x.xml"), "https://brt-me.com");
  assert.equal(originFromAbsoluteUrl("https://www.brt-me.com/"), "https://www.brt-me.com");
  assert.equal(originFromAbsoluteUrl("/feeds/google-shopping.xml"), null);
  assert.equal(originFromAbsoluteUrl(""), null);
});

test("resolveGoogleShoppingStoreOrigin prefers storeUrl over feedUrl and site origin", () => {
  assert.equal(
    resolveGoogleShoppingStoreOrigin(
      {
        storeUrl: "https://brt-me.com",
        feedUrl: "https://staging.example.com/feeds/google-shopping.xml",
      },
      "https://wrong.example",
    ),
    "https://brt-me.com",
  );
  assert.equal(
    resolveGoogleShoppingStoreOrigin(
      { feedUrl: "https://brt-me.com/feeds/google-shopping.xml" },
      "https://wrong.example",
    ),
    "https://brt-me.com",
  );
  assert.equal(
    resolveGoogleShoppingStoreOrigin({}, "https://fallback.example"),
    "https://fallback.example",
  );
});

test("resolveGoogleShoppingMarket pins siteOrigin from storeUrl for g:link", () => {
  const market = resolveGoogleShoppingMarket(
    {
      storeUrl: "https://brt-me.com",
      feedUrl: "https://brt-me.com/feeds/google-shopping.xml",
      country: "AE",
      defaultCurrency: "AED",
    },
    { siteOrigin: "https://staging.hostinger-temp.test", localePrefix: "en" },
  );
  assert.equal(market.siteOrigin, "https://brt-me.com");

  const result = resolveGoogleShoppingEligibility(sampleProduct(), market);
  assert.equal(result.status, "ready");
  assert.ok(result.item);
  assert.equal(result.item!.link, "https://brt-me.com/products/mikrotik-rb5009");
  assert.match(result.item!.link, /^https:\/\/brt-me\.com\//);
});

test("productLinksMatchStoreOrigin requires exact host match", () => {
  const items = [{ link: "https://brt-me.com/products/a" }];
  assert.equal(productLinksMatchStoreOrigin(items, "https://brt-me.com"), true);
  assert.equal(productLinksMatchStoreOrigin(items, "https://www.brt-me.com"), false);
  assert.equal(
    productLinksMatchStoreOrigin(
      [{ link: "https://other.example/p" }],
      "https://brt-me.com",
    ),
    false,
  );
  assert.equal(productLinksMatchStoreOrigin([], "https://brt-me.com"), true);
});

test("www store origin is not a final landing host; apex suggestion provided", () => {
  assert.equal(storeOriginUsesWwwPrefix("https://www.brt-me.com"), true);
  assert.equal(storeOriginUsesWwwPrefix("https://brt-me.com"), false);
  assert.equal(storeOriginIsFinalLandingHost("https://brt-me.com"), true);
  assert.equal(storeOriginIsFinalLandingHost("https://www.brt-me.com"), false);
  assert.equal(apexOriginSuggestion("https://www.brt-me.com"), "https://brt-me.com");
  assert.equal(apexOriginSuggestion("https://brt-me.com"), null);
});
