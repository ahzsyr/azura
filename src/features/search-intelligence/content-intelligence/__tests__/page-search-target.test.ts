import assert from "node:assert/strict";
import test from "node:test";
import {
  emptySiteConfig,
  normalizePageSearchTarget,
  normalizeSiteKey,
  targetIdentityKey,
  validatePageSearchTargetInput,
} from "../page-search-target";
import { buildOwnershipFindings, createOwnershipException } from "../ownership-findings";
import { listUnassignedPriorityEntities } from "../priority-entities";

test("normalizeSiteKey strips www and trailing slash", () => {
  assert.equal(normalizeSiteKey("https://www.Example.com/"), "https://example.com");
  assert.equal(normalizeSiteKey("https://example.com"), "https://example.com");
});

test("cross-site identity keys differ by siteKey with same entity id", () => {
  const a = targetIdentityKey({
    siteKey: "https://a.example",
    entity: { type: "pageKey", id: "home" },
    locale: "en",
  });
  const b = targetIdentityKey({
    siteKey: "https://b.example",
    entity: { type: "pageKey", id: "home" },
    locale: "en",
  });
  assert.notEqual(a, b);
});

test("validatePageSearchTargetInput rejects mismatched siteKey and disabled locale", () => {
  const errors = validatePageSearchTargetInput(
    {
      siteKey: "https://other.example",
      entity: { type: "pageKey", id: "home" },
      locale: "fr",
      primaryTopic: "wifi",
      intent: "informational",
    },
    { enabledLocales: ["en", "ar"], currentSiteKey: "https://example.com" },
  );
  assert.ok(errors.some((e) => e.field === "siteKey"));
  assert.ok(errors.some((e) => e.field === "locale"));
});

test("ownership findings are review-only and acknowledge via structured exception", () => {
  const siteKey = "https://example.com";
  const config = emptySiteConfig(siteKey);
  const shared = {
    siteKey,
    locale: "en",
    primaryTopic: "Wireless networking",
    supportingTopics: [] as string[],
    intent: "commercial" as const,
    status: "active" as const,
    updatedAt: new Date().toISOString(),
  };
  config.targets = [
    normalizePageSearchTarget({
      ...shared,
      entity: { type: "pageKey", id: "products" },
    }),
    normalizePageSearchTarget({
      ...shared,
      entity: { type: "pageKey", id: "services" },
    }),
  ];

  let findings = buildOwnershipFindings(config);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.status, "open");

  config.exceptions.push(
    createOwnershipException({
      siteKey,
      locale: "en",
      normalizedTopic: findings[0]!.normalizedTopic,
      entityIds: config.targets.map((t) => t.entity),
      reason: "Category and services hub intentionally share topic",
      reviewerId: "admin-1",
    }),
  );

  findings = buildOwnershipFindings(config);
  assert.equal(findings[0]?.status, "acknowledged");
});

test("unassigned priority entities use site priority list", () => {
  const siteKey = "https://example.com";
  const config = emptySiteConfig(siteKey);
  assert.ok(config.priorityEntities.length > 0);

  const unassignedBefore = listUnassignedPriorityEntities(config, "en");
  assert.ok(unassignedBefore.length > 0);

  config.targets.push(
    normalizePageSearchTarget({
      siteKey,
      entity: { type: "pageKey", id: "home" },
      locale: "en",
      primaryTopic: "Brand home",
      intent: "navigational",
      status: "active",
    }),
  );

  const unassignedAfter = listUnassignedPriorityEntities(config, "en");
  assert.ok(!unassignedAfter.some((e) => e.type === "pageKey" && e.id === "home"));
});
