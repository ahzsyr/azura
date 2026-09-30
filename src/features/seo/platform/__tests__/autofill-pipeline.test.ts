import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freezeContentSnapshot, emptyDraft } from "@/features/seo/platform/layers/content/snapshot-builder";
import { createExecutionContext } from "@/features/seo/platform/execution-context";
import { extractPageText } from "@/features/seo/platform/layers/content/page-text";
import { normalizeSeoSuggestionWithContext } from "@/features/seo/platform/layers/quality/seo-normalizer-core";
import { runValidation } from "@/features/seo/platform/capabilities/validation";
import { scoreSeoInput } from "@/features/seo/scoring/seo-scoring.service";
import { selectPrimaryContentImage } from "@/features/seo/platform/layers/intelligence/image-selector";
import type { SeoSuggestion } from "@/features/seo/platform/types";

describe("SEO autofill pipeline invariant", () => {
  it("same ContentSnapshot produces deterministic normalized output, validation, and score", async () => {
    const ctx = createExecutionContext({
      entityType: "CmsPage",
      entityId: "page-1",
      locale: "en",
      source: "autofill",
      trigger: "autofill",
      mode: "preview",
    });

    const draft = emptyDraft("Indoor Antenna Guide");
    draft.paragraphs = [
      "The Alfa 2.4V/5GHz indoor antenna delivers reliable wireless coverage for home and office networks with simple RP-SMA installation.",
      "It supports dual-band connectivity and includes mounting hardware for flexible placement near routers and access points.",
    ];
    draft.images = [{ src: "/uploads/antenna-hero.jpg", alt: "Antenna product photo" }];

    const snapshot = freezeContentSnapshot(ctx, draft);
    const pageText = extractPageText(snapshot);
    assert.ok(pageText.length > 80);
    assert.ok(!pageText.startsWith("Indoor Antenna Guide —"));
    assert.equal(selectPrimaryContentImage(snapshot), "/uploads/antenna-hero.jpg");

    const generated: SeoSuggestion = Object.freeze({
      metaTitle: "Alfa 2.4V/5GHz Indoor Antenna 5V/7dBi RP-SMA Male",
      metaDescription: pageText,
      focusKeywords: "antenna, wireless, indoor, coverage, installation",
      ogTitle: "Alfa 2.4V/5GHz Indoor Antenna 5V/7dBi RP-SMA Male",
      ogImageUrl: "/uploads/antenna-hero.jpg",
      robots: "index, follow",
      twitterCard: "summary_large_image",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Alfa 2.4V/5GHz Indoor Antenna 5V/7dBi RP-SMA Male",
      },
      source: "rule-based",
      provenance: Object.freeze({}),
    });

    const normalize = () =>
      normalizeSeoSuggestionWithContext(ctx, snapshot, generated, {
        siteUrl: "https://example.com",
        siteLogo: null,
      });

    const normalized = normalize();
    assert.ok((normalized.metaTitle?.length ?? 0) <= 60);
    assert.ok((normalized.metaDescription?.length ?? 0) <= 160);
    assert.equal(normalized.ogImageUrl, "https://example.com/uploads/antenna-hero.jpg");
    assert.ok(normalized.jsonLd != null);

    const validation = await runValidation(ctx, { snapshot, suggestion: normalized });
    const score = scoreSeoInput({
      titleEn: normalized.metaTitle,
      descriptionEn: normalized.metaDescription,
      focusKeywords: normalized.focusKeywords,
      ogImageUrl: normalized.ogImageUrl,
      robots: normalized.robots,
      jsonLd: JSON.stringify(normalized.jsonLd),
    });

    const secondPass = normalize();
    assert.equal(secondPass.metaTitle, normalized.metaTitle);
    assert.equal(secondPass.metaDescription, normalized.metaDescription);
    assert.equal(secondPass.ogImageUrl, normalized.ogImageUrl);
    assert.deepEqual(secondPass.jsonLd, normalized.jsonLd);

    const validationAgain = await runValidation(ctx, { snapshot, suggestion: secondPass });
    assert.equal(validationAgain.score, validation.score);
    assert.ok(score.score >= 0);
  });
});
