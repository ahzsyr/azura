import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createExecutionContext } from "@/features/seo/platform/execution-context";
import { freezeContentSnapshot, emptyDraft } from "@/features/seo/platform/layers/content/snapshot-builder";
import { buildMetaDescriptionFromSnapshot } from "@/features/seo/platform/layers/content/page-text";
import {
  enrichFocusKeywords,
  enrichMetaDescription,
  enrichMetaTitle,
} from "@/features/seo/platform/layers/intelligence/meta-enrichment";
import { normalizeSeoSuggestionWithContext } from "@/features/seo/platform/layers/quality/seo-normalizer-core";
import {
  SEO_DESCRIPTION_LENGTH,
  SEO_TITLE_LENGTH,
} from "@/features/seo/scoring/seo-scoring.service";
import type { SeoSuggestion } from "@/features/seo/platform/types";

describe("buildMetaDescriptionFromSnapshot", () => {
  it("augments short excerpt with H1 heading text for a valid-length meta description", () => {
    const ctx = createExecutionContext({
      entityType: "CmsPage",
      entityId: "page-short-excerpt",
      locale: "en",
      source: "autofill",
      trigger: "autofill",
      mode: "preview",
    });

    const longHeading =
      "Enterprise wireless networking solutions for offices, campuses, and industrial sites with dual-band coverage";

    const draft = emptyDraft("Wireless Networking");
    draft.paragraphs = ["Short page blurb."];
    draft.headings = [{ level: 1, text: longHeading }];

    const snapshot = freezeContentSnapshot(ctx, draft);
    const rawDescription = buildMetaDescriptionFromSnapshot(snapshot);

    assert.ok(rawDescription.includes("wireless"), "description should include heading content");
    assert.ok(
      rawDescription.length >= SEO_DESCRIPTION_LENGTH.min,
      `expected at least ${SEO_DESCRIPTION_LENGTH.min} chars, got ${rawDescription.length}`,
    );
    assert.notEqual(rawDescription.trim(), "Short page blurb.");

    const generated: SeoSuggestion = Object.freeze({
      metaTitle: "Wireless Networking | Example",
      metaDescription: rawDescription,
      source: "rule-based",
      provenance: Object.freeze({}),
    });

    const normalized = normalizeSeoSuggestionWithContext(ctx, snapshot, generated, {
      siteUrl: "https://example.com",
      siteLogo: null,
    });

    const desc = normalized.metaDescription ?? "";
    assert.ok(desc.includes("wireless"));
    assert.ok(desc.length >= SEO_DESCRIPTION_LENGTH.min);
    assert.ok(desc.length <= SEO_DESCRIPTION_LENGTH.max);
  });
});

describe("post canonical URL normalization", () => {
  it("fills locale-prefixed canonical from publicPath metadata", () => {
    const ctx = createExecutionContext({
      entityType: "Post",
      entityId: "post-uuid-not-a-slug",
      locale: "en",
      source: "autofill",
      trigger: "autofill",
      mode: "preview",
      metadata: { publicPath: "/blog/wireless-tips" },
    });

    const snapshot = freezeContentSnapshot(ctx, emptyDraft("Wireless Tips"));
    const generated: SeoSuggestion = Object.freeze({
      metaTitle: "Wireless Tips | Example Brand Site Name",
      metaDescription:
        "Visit the Wireless Tips page on Example Brand for inquiries, support, and more information about our products and services today.",
      focusKeywords: "wireless, tips",
      source: "rule-based",
      provenance: Object.freeze({}),
    });

    const normalized = normalizeSeoSuggestionWithContext(ctx, snapshot, generated, {
      siteUrl: "https://brt-me.com",
      siteLogo: null,
    });

    assert.equal(normalized.canonicalUrl, "https://brt-me.com/en/blog/wireless-tips");
  });

  it("rewrites localhost absolute canonicals to the public site origin", () => {
    const ctx = createExecutionContext({
      entityType: "Post",
      entityId: "post-1",
      locale: "en",
      source: "autofill",
      trigger: "autofill",
      mode: "preview",
    });

    const snapshot = freezeContentSnapshot(ctx, emptyDraft("Post"));
    const generated: SeoSuggestion = Object.freeze({
      metaTitle: "Post Title Long Enough For SEO Score",
      metaDescription:
        "Visit the Post page on Example Brand for inquiries, support, and more information about our products and services with details.",
      canonicalUrl: "http://localhost:3000/en/blog/my-post",
      source: "rule-based",
      provenance: Object.freeze({}),
    });

    const normalized = normalizeSeoSuggestionWithContext(ctx, snapshot, generated, {
      siteUrl: "https://brt-me.com",
      siteLogo: null,
    });

    assert.equal(normalized.canonicalUrl, "https://brt-me.com/en/blog/my-post");
  });
});

describe("meta enrichment for thin Contact page", () => {
  const brand = "B R T Trading LLC";

  it("produces valid-length title, description, and focus keywords after enrich + normalize", () => {
    const ctx = createExecutionContext({
      entityType: "StaticPage",
      entityId: "contact",
      locale: "en",
      source: "autofill",
      trigger: "autofill",
      mode: "preview",
      metadata: { routingKey: "contact" },
    });

    const draft = emptyDraft("Contact");
    const snapshot = freezeContentSnapshot(ctx, draft);

    // Mirrors rule-based generation for sparse pages: template title + empty body fallback.
    const shortTitle = `Contact | ${brand}`;
    const fromContent = buildMetaDescriptionFromSnapshot(snapshot);
    const shortDesc = fromContent || `Contact — ${brand}`;

    assert.ok(shortTitle.length < SEO_TITLE_LENGTH.min, "fixture title should start too short");
    assert.ok(
      shortDesc.length < SEO_DESCRIPTION_LENGTH.min,
      "fixture description should start too short",
    );

    const metaTitle = enrichMetaTitle(shortTitle, snapshot, brand, "");
    const metaDescription = enrichMetaDescription(shortDesc, snapshot, brand, "");
    const focusKeywords = enrichFocusKeywords("", snapshot, brand);

    const generated: SeoSuggestion = Object.freeze({
      metaTitle,
      metaDescription,
      focusKeywords,
      source: "rule-based",
      provenance: Object.freeze({}),
    });

    const normalized = normalizeSeoSuggestionWithContext(ctx, snapshot, generated, {
      siteUrl: "https://example.com",
      siteLogo: null,
    });

    const title = normalized.metaTitle ?? "";
    const description = normalized.metaDescription ?? "";
    const keywords = normalized.focusKeywords ?? "";

    assert.ok(
      title.length >= SEO_TITLE_LENGTH.min && title.length <= SEO_TITLE_LENGTH.max,
      `title length ${title.length}: ${title}`,
    );
    assert.ok(
      description.length >= SEO_DESCRIPTION_LENGTH.min &&
        description.length <= SEO_DESCRIPTION_LENGTH.max,
      `description length ${description.length}: ${description}`,
    );
    assert.ok(keywords.includes("contact"), `expected contact in keywords: ${keywords}`);
  });
});
