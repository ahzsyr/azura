import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateTopicEvidence,
  softIncludesPhrase,
} from "../topic-evidence";
import type { ContentSnapshot } from "../../types";

function snapshot(partial: Partial<ContentSnapshot>): ContentSnapshot {
  return {
    id: "snap-1",
    entityType: "CMS_PAGE",
    entityId: "page-1",
    localeCode: "en",
    title: "",
    headings: [],
    paragraphs: [],
    tables: [],
    images: [],
    links: { internal: [], external: [] },
    faq: [],
    products: [],
    language: "en",
    signals: {
      h1Count: 0,
      h2Count: 0,
      wordCount: 0,
      paragraphCount: 0,
      imageCount: 0,
      imagesMissingAlt: 0,
      internalLinkCount: 0,
      externalLinkCount: 0,
      hasFaq: false,
      hasCta: false,
      hasTable: false,
      hasList: false,
    },
    capturedAt: new Date().toISOString(),
    ...partial,
  };
}

test("softIncludesPhrase matches phrase and token soft match", () => {
  assert.equal(softIncludesPhrase("Wireless Networking UAE", "wireless networking"), true);
  assert.equal(softIncludesPhrase("Buy access points online", "access point"), true);
  assert.equal(softIncludesPhrase("About our team", "wireless networking"), false);
});

test("evaluateTopicEvidence checks title H1 and opening only", () => {
  const report = evaluateTopicEvidence({
    primaryTopic: "wireless networking",
    supportingTopics: ["wifi 6"],
    snapshot: snapshot({
      title: "Wireless networking solutions",
      headings: [{ level: 1, text: "Enterprise Wi‑Fi" }],
      paragraphs: [
        "We design wireless networking for campuses. Wifi 6 upgrades included.",
      ],
      signals: {
        h1Count: 1,
        h2Count: 0,
        wordCount: 12,
        paragraphCount: 1,
        imageCount: 0,
        imagesMissingAlt: 0,
        internalLinkCount: 0,
        externalLinkCount: 0,
        hasFaq: false,
        hasCta: false,
        hasTable: false,
        hasList: false,
      },
    }),
  });

  assert.equal(report.matches.find((m) => m.surface === "title")?.matched, true);
  assert.equal(report.matches.find((m) => m.surface === "opening")?.matched, true);
  assert.ok(report.supportingInOpening >= 1);
});
