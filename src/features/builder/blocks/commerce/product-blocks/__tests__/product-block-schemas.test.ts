import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  productGridPropsSchema,
  productCarouselPropsSchema,
  productComparisonPropsSchema,
  productFaqPropsSchema,
  relatedProductsPropsSchema,
} from "@/features/builder/blocks/commerce/product-blocks/schemas/product-blocks";
import { parseProductSelection } from "@/features/builder/blocks/commerce/product-blocks/lib/parse-block-props";

describe("product-block schemas", () => {
  it("parses product grid defaults", () => {
    const p = productGridPropsSchema.parse({});
    assert.equal(p.source, "collection");
    assert.equal(p.limit, 8);
    assert.equal(p.columns, 3);
    assert.equal(p.orderingProfileId, "");
  });

  it("parses carousel autoplay settings", () => {
    const p = productCarouselPropsSchema.parse({ autoplay: true, slidesPerView: 2 });
    assert.equal(p.autoplay, true);
    assert.equal(p.slidesPerView, 2);
  });

  it("limits comparison slugs via schema consumption", () => {
    const p = productComparisonPropsSchema.parse({
      productSlugs: ["a", "b", "c", "d", "e"],
    });
    assert.equal(p.productSlugs.length, 5);
  });

  it("parses FAQ source modes", () => {
    const p = productFaqPropsSchema.parse({ source: "productSections" });
    assert.equal(p.source, "productSections");
  });

  it("parses related products rule", () => {
    const p = relatedProductsPropsSchema.parse({ rule: "anchor", layout: "carousel" });
    assert.equal(p.rule, "anchor");
    assert.equal(p.layout, "carousel");
  });

  it("parseProductSelection normalizes manual slugs", () => {
    const sel = parseProductSelection({
      source: "manual",
      productSlugs: ["foo", "bar"],
      limit: 12,
    });
    assert.deepEqual(sel.productSlugs, ["foo", "bar"]);
    assert.equal(sel.limit, 12);
    assert.equal(sel.orderingProfileId, "");
  });

  it("parseProductSelection keeps orderingProfileId", () => {
    const sel = parseProductSelection({
      source: "collection",
      orderingProfileId: "po_abc",
    });
    assert.equal(sel.orderingProfileId, "po_abc");
  });
});
