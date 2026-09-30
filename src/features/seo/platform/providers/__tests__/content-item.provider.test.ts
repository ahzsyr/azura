import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EntityTranslation } from "@prisma/client";
import {
  assembleContentItemDraft,
  resolveContentItemCoverImageUrl,
  resolveContentItemDescription,
  resolveContentItemTitle,
} from "../content-item-snapshot";
import { selectPrimaryContentImage } from "../../layers/intelligence/image-selector";
import { freezeContentSnapshot } from "../../layers/content/snapshot-builder";
import { createExecutionContext } from "../../execution-context";
import { entityKindFromContext } from "../../types/entity-descriptor";

function translation(
  field: string,
  localeCode: string,
  value: string
): EntityTranslation {
  return {
    id: `${field}-${localeCode}`,
    entityType: "ContentItem",
    entityId: "item-1",
    field,
    localeCode,
    value,
    status: "PUBLISHED",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as EntityTranslation;
}

describe("content item SEO provider", () => {
  it("maps ContentItem to content_item kind", () => {
    assert.equal(entityKindFromContext("ContentItem"), "content_item");
  });

  it("resolves title from seoTitle then title, never entity id alone", () => {
    const rows = [
      translation("title", "en", "Outdoor WiFi Antenna"),
      translation("seoTitle", "en", "Outdoor Antenna SEO Title"),
    ];
    assert.equal(resolveContentItemTitle(rows, "en"), "Outdoor Antenna SEO Title");

    const titleOnly = [translation("title", "en", "Outdoor WiFi Antenna")];
    assert.equal(resolveContentItemTitle(titleOnly, "en"), "Outdoor WiFi Antenna");
  });

  it("resolves description from seoDescription / shortDescription / description", () => {
    const rows = [
      translation(
        "description",
        "en",
        "Long page description with enough detail for meta description generation."
      ),
      translation("shortDescription", "en", "Short product blurb for cards."),
    ];
    assert.equal(resolveContentItemDescription(rows, "en"), "Short product blurb for cards.");
  });

  it("prefers isCover media over featuredImageUrl for OG image", () => {
    const cover = resolveContentItemCoverImageUrl({
      featuredImageUrl: "/uploads/featured.jpg",
      media: [
        { url: "/uploads/gallery-1.jpg", isCover: false },
        { url: "/uploads/cover.jpg", isCover: true },
      ],
    });
    assert.equal(cover, "/uploads/cover.jpg");
  });

  it("assembles draft with real title, description, blocks, and cover metadata", () => {
    const draft = assembleContentItemDraft({
      locale: "en",
      title: "Outdoor WiFi Antenna",
      description: "High-gain outdoor antenna for long-range wireless links.",
      blocks: [
        {
          id: "b1",
          type: "richText",
          props: {
            body: "The outdoor antenna delivers reliable coverage across rooftops and warehouses with weather-resistant housing.",
          },
        },
      ],
      featuredImageUrl: "/uploads/featured.jpg",
      media: [{ url: "/uploads/cover.jpg", isCover: true }],
    });

    assert.equal(draft.title, "Outdoor WiFi Antenna");
    assert.ok(!draft.title.includes("cmr1"));
    assert.ok(draft.paragraphs.some((p) => p.includes("High-gain outdoor antenna")));
    assert.ok(draft.paragraphs.some((p) => p.includes("reliable coverage")));
    assert.equal(draft.metadata?.featuredImage, "/uploads/cover.jpg");
    assert.equal(draft.images[0]?.src, "/uploads/cover.jpg");

    const ctx = createExecutionContext({
      entityType: "ContentItem",
      entityId: "cmr1rsjhu005x4xn65dppd9ub",
      locale: "en",
      source: "autofill",
      trigger: "autofill",
      mode: "preview",
    });
    const snapshot = freezeContentSnapshot(ctx, draft);
    assert.equal(selectPrimaryContentImage(snapshot), "/uploads/cover.jpg");
  });
});
