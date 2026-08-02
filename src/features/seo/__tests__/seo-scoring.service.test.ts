import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreSeoInput } from "@/features/seo/scoring/seo-scoring.service";

const GOOD_TITLE = "A well sized meta title for search engines";
const GOOD_DESCRIPTION =
  "A well sized meta description that is long enough to pass the minimum length requirement for search engine snippets and social previews in the admin SEO panel.";

describe("scoreSeoInput locale-aware checks", () => {
  it("generates only enabled locale checks for a single locale", () => {
    const result = scoreSeoInput({
      enabledLocales: ["en"],
      titlesByLocale: { en: GOOD_TITLE },
      descriptionsByLocale: { en: GOOD_DESCRIPTION },
      canonicalUrl: "https://example.com/en/page",
      focusKeywords: "umrah",
      ogImageUrl: "https://example.com/og.jpg",
      robots: "index, follow",
      jsonLd: { "@context": "https://schema.org" },
    });

    const localeLabels = result.checks
      .filter((check) => check.id.startsWith("title-") || check.id.startsWith("description-"))
      .map((check) => check.label);

    assert.deepEqual(localeLabels, ["Meta title (EN)", "Meta description (EN)"]);
    assert.equal(result.checks.some((check) => check.label.includes("(AR)")), false);
  });

  it("includes Arabic checks when Arabic is enabled", () => {
    const result = scoreSeoInput({
      enabledLocales: ["en", "ar"],
      titlesByLocale: { en: GOOD_TITLE, ar: "" },
      descriptionsByLocale: { en: GOOD_DESCRIPTION, ar: "" },
    });

    const localeLabels = result.checks
      .filter((check) => check.id.startsWith("title-") || check.id.startsWith("description-"))
      .map((check) => check.label);

    assert.deepEqual(localeLabels, [
      "Meta title (EN)",
      "Meta description (EN)",
      "Meta title (AR)",
      "Meta description (AR)",
    ]);
  });

  it("includes checks for additional enabled locales", () => {
    const result = scoreSeoInput({
      enabledLocales: ["en", "fr"],
      titlesByLocale: { en: GOOD_TITLE, fr: GOOD_TITLE },
      descriptionsByLocale: { en: GOOD_DESCRIPTION, fr: GOOD_DESCRIPTION },
    });

    const localeLabels = result.checks
      .filter((check) => check.id.startsWith("title-") || check.id.startsWith("description-"))
      .map((check) => check.label);

    assert.deepEqual(localeLabels, [
      "Meta title (EN)",
      "Meta description (EN)",
      "Meta title (FR)",
      "Meta description (FR)",
    ]);
  });

  it("evaluates OG title overrides across enabled locales only", () => {
    const withoutOg = scoreSeoInput({
      enabledLocales: ["en"],
      ogTitlesByLocale: { ar: "Arabic OG title" },
    });
    const withOg = scoreSeoInput({
      enabledLocales: ["en"],
      ogTitlesByLocale: { en: "English OG title", ar: "Arabic OG title" },
    });

    assert.equal(withoutOg.checks.find((check) => check.id === "og-titles")?.passed, false);
    assert.equal(withOg.checks.find((check) => check.id === "og-titles")?.passed, true);
  });

  it("computes score from generated checks only", () => {
    const singleLocale = scoreSeoInput({
      enabledLocales: ["en"],
      titlesByLocale: { en: GOOD_TITLE },
      descriptionsByLocale: { en: GOOD_DESCRIPTION },
      canonicalUrl: "https://example.com/en/page",
      focusKeywords: "umrah",
      ogImageUrl: "https://example.com/og.jpg",
      ogTitlesByLocale: { en: "Custom OG title" },
      robots: "index, follow",
      jsonLd: { "@context": "https://schema.org" },
    });

    const multiLocale = scoreSeoInput({
      enabledLocales: ["en", "ar"],
      titlesByLocale: { en: GOOD_TITLE, ar: "" },
      descriptionsByLocale: { en: GOOD_DESCRIPTION, ar: "" },
      canonicalUrl: "https://example.com/en/page",
      focusKeywords: "umrah",
      ogImageUrl: "https://example.com/og.jpg",
      ogTitlesByLocale: { en: "Custom OG title" },
      robots: "index, follow",
      jsonLd: { "@context": "https://schema.org" },
    });

    assert.equal(singleLocale.score, 100);
    assert.ok(multiLocale.score < singleLocale.score);
  });
});
