import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { uploadCacheControl } from "@/app/api/local-uploads/upload-cache-control";

describe("uploadCacheControl", () => {
  it("does not cache range responses", () => {
    assert.equal(uploadCacheControl("video/mp4", true), "private, no-store");
    assert.equal(uploadCacheControl("image/jpeg", true), "private, no-store");
  });

  it("does not cache QuickTime MOV even as a full response", () => {
    assert.equal(uploadCacheControl("video/quicktime", false), "private, no-store");
  });

  it("caches complete non-QuickTime uploads", () => {
    assert.equal(uploadCacheControl("video/mp4", false), "public, max-age=86400");
    assert.equal(uploadCacheControl("image/jpeg", false), "public, max-age=86400");
  });
});
