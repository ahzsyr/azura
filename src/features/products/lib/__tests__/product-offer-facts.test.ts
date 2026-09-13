import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProductOfferFacts } from "@/features/products/lib/product-offer-facts";
import { sampleProduct } from "@/features/feeds/__tests__/google-shopping-fixtures";

describe("resolveProductOfferFacts", () => {
  it("matches JSON-LD and Shopping availability/price/identifiers", () => {
    const product = sampleProduct();
    const facts = resolveProductOfferFacts(product);
    assert.equal(facts.emitOffer, true);
    assert.equal(facts.price, 499);
    assert.equal(facts.priceCurrency, "AED");
    assert.equal(facts.shoppingAvailability, "in stock");
    assert.equal(facts.schemaAvailability, "https://schema.org/InStock");
    assert.equal(facts.gtin, "4752224001234");
    assert.equal(facts.mpn, "RB5009UG+S+IN");
    assert.equal(facts.sku, "RB5009UG+S+IN");
  });

  it("omits offers for RequestQuote", () => {
    const facts = resolveProductOfferFacts(sampleProduct({ availability: "RequestQuote", price: { value: 0, currency: "AED" } }));
    assert.equal(facts.emitOffer, false);
    assert.equal(facts.shoppingAvailability, null);
  });
});
