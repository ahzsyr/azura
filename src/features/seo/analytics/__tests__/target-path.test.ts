import assert from "node:assert/strict";
import test from "node:test";
import { pathForPageSearchTarget } from "../target-path";
import type { PageSearchTarget } from "@/features/search-intelligence/content-intelligence/page-search-target";

function target(
  entity: PageSearchTarget["entity"],
): PageSearchTarget {
  return {
    id: "t1",
    siteKey: "https://example.com",
    entity,
    locale: "en",
    primaryTopic: "topic",
    supportingTopics: [],
    intent: "commercial",
    status: "active",
    updatedAt: new Date().toISOString(),
  };
}

test("CATEGORY and BRAND derive public catalog paths", () => {
  assert.equal(pathForPageSearchTarget(target({ type: "CATEGORY", id: "routers" })), "/categories/routers");
  assert.equal(pathForPageSearchTarget(target({ type: "BRAND", id: "cisco" })), "/brands/cisco");
});

test("PRODUCT and CMS paths remain stable", () => {
  assert.equal(pathForPageSearchTarget(target({ type: "PRODUCT", id: "ap-6" })), "/products/ap-6");
  assert.equal(pathForPageSearchTarget(target({ type: "CMS_PAGE", id: "about" })), "/pages/about");
});
