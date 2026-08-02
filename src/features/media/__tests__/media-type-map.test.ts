import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cmsMediaTypesToCatalog } from "@/features/media/lib/media-type-map";

describe("cmsMediaTypesToCatalog", () => {
  it("maps CMS image and svg types to catalog types", () => {
    assert.deepEqual(cmsMediaTypesToCatalog(["IMAGE", "SVG"]), ["image", "svg"]);
  });

  it("returns undefined when types is empty", () => {
    assert.equal(cmsMediaTypesToCatalog([]), undefined);
  });

  it("returns undefined when types is undefined", () => {
    assert.equal(cmsMediaTypesToCatalog(undefined), undefined);
  });

  it("maps video and document types", () => {
    assert.deepEqual(cmsMediaTypesToCatalog(["VIDEO", "DOCUMENT"]), ["video", "document"]);
  });
});
