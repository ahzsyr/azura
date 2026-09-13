import test from "node:test";
import assert from "node:assert/strict";
import { validate } from "../validate";
import type { SchemaGraph } from "../types";
import { createProductContextFixture } from "./fixtures";

function graphOf(nodes: SchemaGraph["@graph"]): SchemaGraph {
  return { "@context": "https://schema.org", "@graph": nodes };
}

test("validate - structural checks", async (t) => {
  const ctx = createProductContextFixture();

  await t.test("flags relative @id as ERROR relative-id", () => {
    const issues = validate(
      graphOf([{ "@type": "WebPage", "@id": "/#webpage" }]),
      ctx,
    );
    const relativeIdIssue = issues.find((i) => i.code === "relative-id");
    assert.ok(relativeIdIssue, "Expected relative-id issue");
    assert.equal(relativeIdIssue.level, "ERROR");
  });

  await t.test("flags broken Product <-> WebPage reciprocity as ERROR product-webpage-reciprocity", () => {
    const issues = validate(
      graphOf([
        {
          "@type": "Organization",
          "@id": "https://example.com/#organization",
        },
        {
          "@type": "WebPage",
          "@id": "https://example.com/product-1/#webpage",
          mainEntity: { "@id": "https://example.com/product-1/#wrong" },
        },
        {
          "@type": "Product",
          "@id": "https://example.com/product-1/#product",
          mainEntityOfPage: { "@id": "https://example.com/product-1/#webpage" },
        },
      ]),
      ctx,
    );
    const reciprocityIssue = issues.find((i) => i.code === "product-webpage-reciprocity");
    assert.ok(reciprocityIssue, "Expected product-webpage-reciprocity issue");
    assert.equal(reciprocityIssue.level, "ERROR");
  });

  await t.test("passes when Product and WebPage reciprocally reference each other", () => {
    const issues = validate(
      graphOf([
        {
          "@type": "Organization",
          "@id": "https://example.com/#organization",
        },
        {
          "@type": "WebPage",
          "@id": "https://example.com/product-1/#webpage",
          mainEntity: { "@id": "https://example.com/product-1/#product" },
        },
        {
          "@type": "Product",
          "@id": "https://example.com/product-1/#product",
          mainEntityOfPage: { "@id": "https://example.com/product-1/#webpage" },
        },
      ]),
      ctx,
    );
    const reciprocityIssue = issues.find((i) => i.code === "product-webpage-reciprocity");
    assert.equal(reciprocityIssue, undefined);
  });
});
