import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isIconPickResult,
  isMediaPickResult,
  type ResourcePickResult,
} from "../components/unified-resource-picker-dialog";

describe("ResourcePickResult discrimination", () => {
  it("icon results cannot be treated as media results", () => {
    const result: ResourcePickResult = { type: "icon", iconId: "chevron-right", source: "builtin" };
    assert.equal(isMediaPickResult(result), false);
    assert.equal(isIconPickResult(result), true);
  });

  it("media results satisfy media guard", () => {
    const result: ResourcePickResult = {
      type: "media",
      mediaId: "asset-123",
      url: "/uploads/images/a.jpg",
      source: "cms",
      filename: "a.jpg",
    };
    assert.equal(isMediaPickResult(result), true);
    assert.equal(isIconPickResult(result), false);
  });
});

