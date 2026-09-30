import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  graphHasIndexingApiEligibleType,
  IndexingApiNotEligibleError,
} from "@/features/seo/google-live/indexing-api-eligibility";
import type { SchemaGraph } from "@/features/seo/platform/schema-pipeline/types";

function graph(types: Array<string | string[]>): SchemaGraph {
  return {
    "@context": "https://schema.org",
    "@graph": types.map((type, index) => ({
      "@type": type,
      "@id": `https://example.com/#n${index}`,
    })),
  };
}

describe("graphHasIndexingApiEligibleType", () => {
  it("allows JobPosting", () => {
    assert.equal(graphHasIndexingApiEligibleType(graph(["JobPosting"])), true);
  });

  it("allows BroadcastEvent", () => {
    assert.equal(graphHasIndexingApiEligibleType(graph(["BroadcastEvent"])), true);
  });

  it("rejects product, article, and website graphs", () => {
    assert.equal(graphHasIndexingApiEligibleType(graph(["Product", "WebPage", "WebSite"])), false);
    assert.equal(graphHasIndexingApiEligibleType(graph(["Article"])), false);
    assert.equal(graphHasIndexingApiEligibleType(null), false);
  });

  it("accepts JobPosting in a multi-type node", () => {
    assert.equal(graphHasIndexingApiEligibleType(graph([["Thing", "JobPosting"]])), true);
  });
});

describe("IndexingApiNotEligibleError", () => {
  it("names the skip reason", () => {
    const error = new IndexingApiNotEligibleError("https://example.com/");
    assert.equal(error.code, "INDEXING_API_NOT_ELIGIBLE");
    assert.match(error.message, /JobPosting and BroadcastEvent/);
  });
});
