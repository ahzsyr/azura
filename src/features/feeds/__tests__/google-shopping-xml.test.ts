import assert from "node:assert/strict";
import test from "node:test";
import { formatGoogleShoppingFeedXml } from "../google-shopping-feed.mapper";
import { resolveGoogleShoppingEligibility } from "../google-shopping-eligibility";
import { sampleMarket, sampleProduct } from "./google-shopping-fixtures";

test("formats XML with identifiers, shipping, additional images, and namespaces", () => {
  const result = resolveGoogleShoppingEligibility(sampleProduct(), sampleMarket());
  assert.ok(result.item);
  const xml = formatGoogleShoppingFeedXml([result.item!], {
    siteOrigin: "https://brt-me.com",
    title: "BRT Feed",
  });
  assert.match(xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  assert.match(xml, /<g:id>sku-rb5009<\/g:id>/);
  assert.match(xml, /<g:gtin>4752224001234<\/g:gtin>/);
  assert.match(xml, /<g:mpn>RB5009UG\+S\+IN<\/g:mpn>/);
  assert.match(xml, /<g:identifier_exists>yes<\/g:identifier_exists>/);
  assert.match(xml, /<g:availability>in stock<\/g:availability>/);
  assert.match(xml, /<g:price>499\.00 AED<\/g:price>/);
  assert.match(xml, /<g:shipping>/);
  assert.match(xml, /<g:country>AE<\/g:country>/);
  assert.match(xml, /<g:additional_image_link>https:\/\/cdn\.example\.com\/rb5009-side\.jpg<\/g:additional_image_link>/);
  assert.match(xml, /<g:google_product_category>278<\/g:google_product_category>/);
  assert.match(xml, /<link>https:\/\/brt-me\.com\/feeds\/google-shopping\.xml<\/link>/);
});

test("escapes XML special characters", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({
      productTitle: "Lens & Body <pro>",
      description: "Wide & sharp",
    }),
    sampleMarket(),
  );
  const xml = formatGoogleShoppingFeedXml([result.item!], { siteOrigin: "https://brt-me.com" });
  assert.match(xml, /<g:title>Lens &amp; Body &lt;pro&gt;<\/g:title>/);
  assert.match(xml, /<g:description>Wide &amp; sharp<\/g:description>/);
});

test("empty channel when no items", () => {
  const xml = formatGoogleShoppingFeedXml([], { siteOrigin: "https://brt-me.com" });
  assert.match(xml, /<channel>/);
  assert.doesNotMatch(xml, /<item>/);
});

test("sale_price appears in XML", () => {
  const result = resolveGoogleShoppingEligibility(
    sampleProduct({ old_price: 599 }),
    sampleMarket(),
  );
  const xml = formatGoogleShoppingFeedXml(result.items, { siteOrigin: "https://brt-me.com" });
  assert.match(xml, /<g:sale_price>599\.00 AED<\/g:sale_price>/);
});
