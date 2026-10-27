import assert from "node:assert/strict";
import test from "node:test";
import {
  buildKeywordAssignmentFindings,
  normalizeKeyword,
  normalizeKeywordCluster,
  normalizeKeywordRecord,
  validateKeywordClusterInput,
  validateKeywordRecordInput,
} from "../keyword-registry";
import { PAGE_TARGET_ENTITY_TYPES } from "../page-search-target";

test("CATEGORY and BRAND are allowed page target entity types", () => {
  assert.ok(PAGE_TARGET_ENTITY_TYPES.includes("CATEGORY"));
  assert.ok(PAGE_TARGET_ENTITY_TYPES.includes("BRAND"));
});

test("normalizeKeyword collapses whitespace and case", () => {
  assert.equal(normalizeKeyword("  Wi‑Fi  Router  "), normalizeKeyword("wi‑fi router"));
});

test("validateKeywordClusterInput rejects mismatched siteKey", () => {
  const errors = validateKeywordClusterInput(
    {
      siteKey: "https://other.example",
      name: "routers",
      primaryTopic: "routers",
      contentType: "category",
    },
    "https://example.com",
  );
  assert.ok(errors.some((e) => e.field === "siteKey"));
});

test("normalizeKeywordCluster and KeywordRecord round-trip basics", () => {
  const cluster = normalizeKeywordCluster({
    siteKey: "https://example.com",
    name: "routers",
    primaryTopic: "business routers",
    contentType: "category",
    synonyms: ["wifi routers", "access points"],
  });
  assert.equal(cluster.contentType, "category");
  assert.equal(cluster.synonyms.length, 2);

  const errors = validateKeywordRecordInput(
    {
      siteKey: "https://example.com",
      keyword: "business routers UAE",
      locale: "en",
      intent: "commercial",
      clusterId: cluster.id,
      assignedEntity: { type: "CATEGORY", id: "routers" },
    },
    {
      currentSiteKey: "https://example.com",
      enabledLocales: ["en"],
      clusterIds: new Set([cluster.id]),
    },
  );
  assert.equal(errors.length, 0);

  const kw = normalizeKeywordRecord({
    siteKey: "https://example.com",
    keyword: "business routers UAE",
    locale: "en",
    intent: "commercial",
    clusterId: cluster.id,
    assignedEntity: { type: "CATEGORY", id: "routers" },
  });
  assert.equal(kw.status, "assigned");
  assert.equal(kw.normalizedKeyword, normalizeKeyword("business routers UAE"));
});

test("keyword assignment findings flag multi-entity collisions", () => {
  const siteKey = "https://example.com";
  const findings = buildKeywordAssignmentFindings({
    siteKey,
    keywords: [
      {
        id: "1",
        siteKey,
        keyword: "routers",
        normalizedKeyword: "routers",
        locale: "en",
        intent: "commercial",
        clusterId: "c1",
        assignedEntity: { type: "CATEGORY", id: "routers" },
        status: "active",
        updatedAt: new Date().toISOString(),
      },
      {
        id: "2",
        siteKey,
        keyword: "Routers",
        normalizedKeyword: "routers",
        locale: "en",
        intent: "commercial",
        clusterId: "c1",
        assignedEntity: { type: "PRODUCT", id: "router-pro" },
        status: "assigned",
        updatedAt: new Date().toISOString(),
      },
    ],
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.keywords.length, 2);
});
