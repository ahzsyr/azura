import assert from "node:assert/strict";
import test from "node:test";
import {
  formatGoogleShoppingFeedXml,
  formatGoogleShoppingPrice,
  isExcludedFromGoogleShopping,
  mapGoogleShoppingAvailability,
  mapGoogleShoppingCondition,
  mapProductToGoogleShoppingItem,
  type GoogleShoppingFeedProductInput,
} from "../google-shopping-feed.mapper";

function sampleProduct(
  overrides: Partial<GoogleShoppingFeedProductInput> = {},
): GoogleShoppingFeedProductInput {
  return {
    id: "sku-100",
    slug: "demo-camera",
    productTitle: "Demo Camera",
    name: "Demo Camera",
    description: "A great camera for demos",
    short_description: "Great camera",
    price: { value: 199.5, currency: "AED" },
    availability: "InStock",
    stock_status: "in_stock",
    brand: "BRT",
    condition_options: ["new"],
    media: {
      images: [{ url: "/uploads/camera.jpg", type: "main", alt: "Camera" }],
    },
    reviews: { rating: 0, count: 0 },
    ...overrides,
  };
}

test("excludes products flagged for Google Shopping omission", () => {
  assert.equal(isExcludedFromGoogleShopping({}), false);
  assert.equal(isExcludedFromGoogleShopping({ excludeFromGoogleShopping: false }), false);
  assert.equal(isExcludedFromGoogleShopping({ excludeFromGoogleShopping: true }), true);

  const excluded = mapProductToGoogleShoppingItem(
    sampleProduct({ excludeFromGoogleShopping: true }),
    { siteOrigin: "https://brt-me.com", localePrefix: "en" },
  );
  assert.equal(excluded, null);
});

test("maps MVP Google Shopping fields for published catalog products", () => {
  const item = mapProductToGoogleShoppingItem(sampleProduct(), {
    siteOrigin: "https://brt-me.com",
    localePrefix: "en",
  });
  assert.ok(item);
  assert.equal(item!.id, "sku-100");
  assert.equal(item!.title, "Demo Camera");
  assert.equal(item!.description, "A great camera for demos");
  assert.equal(item!.link, "https://brt-me.com/en/products/demo-camera");
  assert.match(item!.imageLink, /^https:\/\/brt-me\.com\/uploads\/camera\.jpg/);
  assert.equal(item!.availability, "in stock");
  assert.equal(item!.price, "199.50 AED");
  assert.equal(item!.condition, "new");
  assert.equal(item!.brand, "BRT");
});

test("maps availability and condition variants", () => {
  assert.equal(mapGoogleShoppingAvailability("OutOfStock"), "out of stock");
  assert.equal(mapGoogleShoppingAvailability("PreOrder"), "preorder");
  assert.equal(mapGoogleShoppingAvailability(undefined, "preorder"), "preorder");
  assert.equal(mapGoogleShoppingCondition(["used"]), "used");
  assert.equal(mapGoogleShoppingCondition([]), "new");
  assert.equal(formatGoogleShoppingPrice(10, "usd"), "10.00 USD");
});

test("formats XML with required Google namespaces and escaped values", () => {
  const item = mapProductToGoogleShoppingItem(
    sampleProduct({
      productTitle: "Lens & Body <pro>",
      description: "Wide & sharp",
    }),
    { siteOrigin: "https://brt-me.com", localePrefix: "en" },
  );
  assert.ok(item);
  const xml = formatGoogleShoppingFeedXml([item!], {
    siteOrigin: "https://brt-me.com",
    title: "BRT Feed",
  });
  assert.match(xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  assert.match(xml, /<g:id>sku-100<\/g:id>/);
  assert.match(xml, /<g:title>Lens &amp; Body &lt;pro&gt;<\/g:title>/);
  assert.match(xml, /<g:description>Wide &amp; sharp<\/g:description>/);
  assert.match(xml, /<g:link>https:\/\/brt-me\.com\/en\/products\/demo-camera<\/g:link>/);
  assert.match(xml, /<g:availability>in stock<\/g:availability>/);
  assert.match(xml, /<link>https:\/\/brt-me\.com\/feeds\/google-shopping\.xml<\/link>/);
});

test("returns empty channel XML when there are no items", () => {
  const xml = formatGoogleShoppingFeedXml([], { siteOrigin: "https://brt-me.com" });
  assert.match(xml, /<channel>/);
  assert.doesNotMatch(xml, /<item>/);
});

test("skips products missing required image or description", () => {
  assert.equal(
    mapProductToGoogleShoppingItem(
      sampleProduct({ media: { images: [] }, description: "", short_description: "" }),
      { siteOrigin: "https://brt-me.com", localePrefix: "en" },
    ),
    null,
  );
});
