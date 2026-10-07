import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ContentCardData } from "@/features/content/types";
import {
  excludeCurrentRelatedContentItem,
  filterRelatedContentByTaxonomy,
  relatedContentItemPath,
} from "@/features/builder/blocks/discovery/lib/related-content-helpers";

function card(
  partial: Partial<ContentCardData> & Pick<ContentCardData, "id">,
): ContentCardData {
  return {
    contentTypeSlug: "solutions",
    title: partial.title ?? partial.id,
    titleEn: partial.titleEn ?? partial.title ?? partial.id,
    titleAr: partial.titleAr ?? "",
    attributes: {},
    images: [],
    ...partial,
  };
}

describe("related-content-helpers", () => {
  it("builds content-item paths with route prefix and type slug", () => {
    assert.equal(
      relatedContentItemPath("hotels-transport", "offerings", "indoor-coverage"),
      "/services/indoor-coverage",
    );
    assert.equal(
      relatedContentItemPath(null, "solutions", "enterprise-wireless"),
      "/solutions/enterprise-wireless",
    );
    assert.equal(relatedContentItemPath(null, null, "x"), null);
  });

  it("filters taxonomy results by categories and tags only", () => {
    const items = [
      card({
        id: "1",
        attributes: { categories: ["Outdoor"], tags: ["wifi"] },
      }),
      card({
        id: "2",
        attributes: { categories: ["Indoor"], tags: ["wifi"] },
      }),
      card({
        id: "3",
        attributes: { categories: ["Outdoor"], tags: ["cellular"] },
      }),
    ];
    const filtered = filterRelatedContentByTaxonomy(items, ["Outdoor"], ["wifi"]);
    assert.deepEqual(
      filtered.map((item) => item.id),
      ["1"],
    );
  });

  it("excludes the current anchor content item when configured", () => {
    const items = [
      card({ id: "keep", slug: "keep" }),
      card({ id: "current", slug: "current-slug" }),
    ];
    const excluded = excludeCurrentRelatedContentItem(items, true, {
      context: "contentItem",
      id: "current",
      slug: "current-slug",
    });
    assert.deepEqual(
      excluded.map((item) => item.id),
      ["keep"],
    );

    const kept = excludeCurrentRelatedContentItem(items, false, {
      context: "contentItem",
      id: "current",
    });
    assert.equal(kept.length, 2);
  });

  it("does not exclude items for non-content-item anchors", () => {
    const items = [card({ id: "a", slug: "a" })];
    const result = excludeCurrentRelatedContentItem(items, true, {
      context: "product",
      id: "a",
    });
    assert.equal(result.length, 1);
  });
});
