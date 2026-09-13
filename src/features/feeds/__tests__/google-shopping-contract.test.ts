import assert from "node:assert/strict";
import test from "node:test";
import { resolveGoogleShoppingEligibility } from "../google-shopping-eligibility";
import { aggregateGoogleShoppingDiagnostics } from "../google-shopping-diagnostics";
import { formatGoogleShoppingFeedXml } from "../google-shopping-feed.mapper";
import { GOOGLE_SHOPPING_FEED_VERSION } from "../google-shopping-feed.types";
import { sampleMarket, sampleProduct } from "./google-shopping-fixtures";

/**
 * Central invariant: same product + market ⇒ Product Manager status
 * = diagnostics status = feed inclusion/exclusion.
 */

test("READY fixture: resolver, diagnostics, and XML agree", () => {
  const product = sampleProduct();
  const market = sampleMarket();
  const result = resolveGoogleShoppingEligibility(product, market);

  assert.equal(result.status, "ready");
  assert.ok(result.item);

  const diagnostics = aggregateGoogleShoppingDiagnostics([{ product, result }]);
  assert.equal(diagnostics.feedVersion, GOOGLE_SHOPPING_FEED_VERSION);
  assert.equal(diagnostics.summary.ready, 1);
  assert.equal(diagnostics.summary.warnings, 0);
  assert.equal(diagnostics.summary.excluded, 0);
  assert.equal(diagnostics.summary.feedItems, 1);

  const included = result.status !== "excluded";
  assert.equal(included, true);

  const xml = formatGoogleShoppingFeedXml(result.items, { siteOrigin: market.siteOrigin });
  assert.match(xml, new RegExp(`<g:id>${result.item!.id}</g:id>`));
  assert.match(xml, /MikroTik/);
});

test("QUOTE_REQUIRED fixture: excluded everywhere, never out of stock in XML", () => {
  const product = sampleProduct({
    id: "quote-router",
    slug: "quote-router",
    availability: "RequestQuote",
  });
  const market = sampleMarket();
  const result = resolveGoogleShoppingEligibility(product, market);

  assert.equal(result.status, "excluded");
  assert.ok(result.issues.includes("QUOTE_REQUIRED"));
  assert.equal(result.item, null);

  const diagnostics = aggregateGoogleShoppingDiagnostics([{ product, result }]);
  assert.equal(diagnostics.summary.excluded, 1);
  assert.equal(diagnostics.summary.ready, 0);
  assert.equal(diagnostics.issues.QUOTE_REQUIRED?.count, 1);
  assert.equal(diagnostics.issues.QUOTE_REQUIRED?.products[0]?.slug, "quote-router");

  const feedItems = result.status !== "excluded" ? result.items : [];
  const xml = formatGoogleShoppingFeedXml(feedItems, { siteOrigin: market.siteOrigin });
  assert.doesNotMatch(xml, /quote-router/);
  assert.doesNotMatch(xml, /out of stock/);
});

test("mixed catalog aggregation matches per-product resolver statuses", () => {
  const market = sampleMarket();
  const ready = sampleProduct({ id: "ready-1", slug: "ready-1" });
  const quote = sampleProduct({
    id: "quote-1",
    slug: "quote-1",
    availability: "RequestQuote",
  });
  const warn = sampleProduct({ id: "warn-1", slug: "warn-1", ean: "" });

  const entries = [ready, quote, warn].map((product) => ({
    product,
    result: resolveGoogleShoppingEligibility(product, market),
  }));

  const diagnostics = aggregateGoogleShoppingDiagnostics(entries);
  assert.equal(diagnostics.summary.published, 3);
  assert.equal(diagnostics.summary.ready, 1);
  assert.equal(diagnostics.summary.warnings, 1);
  assert.equal(diagnostics.summary.excluded, 1);

  const xmlItems = entries.flatMap((e) =>
    e.result.status !== "excluded" ? e.result.items : [],
  );
  const xml = formatGoogleShoppingFeedXml(xmlItems, { siteOrigin: market.siteOrigin });
  assert.match(xml, /<g:id>ready-1<\/g:id>/);
  assert.match(xml, /<g:id>warn-1<\/g:id>/);
  assert.doesNotMatch(xml, /quote-1/);
});
