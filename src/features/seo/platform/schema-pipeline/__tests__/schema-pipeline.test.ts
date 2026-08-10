import test from "node:test";
import assert from "node:assert/strict";
import { SchemaPipeline } from "../index";
import { dedupeFaqItems } from "../context/collect-faq-from-blocks";
import {
  createCmsFaqBlocksContextFixture,
  createFaqContextFixture,
  createHomeContextFixture,
  createProductContextFixture,
} from "./fixtures";
import { assertGraphSnapshot } from "./snapshot-helper";

function graphTypes(result: ReturnType<typeof SchemaPipeline.build>) {
  return result.graph["@graph"].map((node) => node["@type"]);
}

test("home graph includes Organization, WebSite, WebPage", () => {
  const result = SchemaPipeline.build(createHomeContextFixture());
  const types = graphTypes(result);
  assert.ok(types.includes("Organization"));
  assert.ok(types.includes("WebSite"));
  assert.ok(types.includes("WebPage"));
  assert.ok(types.includes("ImageObject"));
});

test("home graph snapshot", () => {
  const result = SchemaPipeline.build(createHomeContextFixture());
  assertGraphSnapshot("home.graph", result.graph);
});

test("product graph includes Product", () => {
  const result = SchemaPipeline.build(createProductContextFixture());
  const types = graphTypes(result);
  assert.ok(types.includes("Product"));
  assert.ok(types.includes("BreadcrumbList"));
});

test("product graph snapshot", () => {
  const result = SchemaPipeline.build(createProductContextFixture());
  assertGraphSnapshot("product.graph", result.graph);
});

test("faq graph includes single FAQPage", () => {
  const result = SchemaPipeline.build(createFaqContextFixture());
  const faqPages = result.graph["@graph"].filter((node) => node["@type"] === "FAQPage");
  assert.equal(faqPages.length, 1);
});

test("faq graph snapshot", () => {
  const result = SchemaPipeline.build(createFaqContextFixture());
  assertGraphSnapshot("faq.graph", result.graph);
});

test("cms faq blocks dedupe questions before pipeline FAQRule", () => {
  const deduped = dedupeFaqItems(createCmsFaqBlocksContextFixture().page.faqItems);
  assert.equal(deduped.length, 2);
});

test("disabled faqBuilder excludes FAQPage", () => {
  const ctx = createFaqContextFixture();
  ctx.site.structuredConfig = {
    ...ctx.site.structuredConfig,
    builderFlags: { faqBuilder: false },
  };
  const result = SchemaPipeline.build(ctx);
  const faqPages = result.graph["@graph"].filter((node) => node["@type"] === "FAQPage");
  assert.equal(faqPages.length, 0);
});

test("validation reports missing sameAs as WARNING", () => {
  const ctx = createHomeContextFixture();
  if (ctx.site.company) ctx.site.company.socialLinks = {};
  const result = SchemaPipeline.build(ctx);
  assert.ok(result.issues.some((issue) => issue.code === "missing-same-as"));
});
