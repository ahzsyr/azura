import test from "node:test";
import assert from "node:assert/strict";
import { mergeJsonLd, parsePageJsonLdNodes, normalizeGraph } from "../merge-jsonld";
import { SchemaPipeline } from "../index";
import { createHomeContextFixture } from "./fixtures";

test("parsePageJsonLdNodes supports object and @graph array", () => {
  const nodes = parsePageJsonLdNodes({
    "@context": "https://schema.org",
    "@graph": [{ "@type": "WebPage", "@id": "https://example.com/#custom", name: "Custom" }],
  });
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0]?.["@type"], "WebPage");
  assert.equal(nodes[0]?.["@context"], undefined);
});

test("mergeJsonLd merges same @id with merged policy for organization", () => {
  const generated = [
    {
      "@type": "Organization",
      "@id": "https://example.com/#organization",
      name: "BRT Trading",
      url: "https://example.com",
    },
  ];
  const manual = [
    {
      "@type": "Organization",
      "@id": "https://example.com/#organization",
      legalName: "B R T Trading LLC",
    },
  ];
  const merged = mergeJsonLd(generated, manual);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.name, "BRT Trading");
  assert.equal(merged[0]?.legalName, "B R T Trading LLC");
});

test("SchemaPipeline merges page SeoMeta.jsonLd into final graph", () => {
  const ctx = createHomeContextFixture();
  ctx.page.pageJsonLd = {
    "@type": "WebPage",
    "@id": "https://example.com/en/#webpage",
    name: "Homepage override",
  };
  const result = SchemaPipeline.build(ctx);
  const webpage = result.graph["@graph"].find((node) => node["@id"] === "https://example.com/en/#webpage");
  assert.equal(webpage?.name, "Homepage override");
});

test("home graph does not include SearchAction nodes", () => {
  const result = SchemaPipeline.build(createHomeContextFixture());
  const searchActions = result.graph["@graph"].filter((node) => node["@type"] === "SearchAction");
  assert.equal(searchActions.length, 0);
});

test("normalizeGraph removes empty sameAs arrays", () => {
  const normalized = normalizeGraph([
    { "@type": "Organization", "@id": "https://example.com/#organization", sameAs: [] },
  ]);
  assert.equal(normalized[0]?.sameAs, undefined);
});
