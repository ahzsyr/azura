import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { uploadCacheControl } from "@/app/api/local-uploads/upload-cache-control";
import { resolveUploadContentMetadata } from "@/app/api/local-uploads/upload-content-metadata";

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

  it("serves SVG uploads as inline images without a response CSP", () => {
    const metadata = resolveUploadContentMetadata(".svg");

    assert.equal(metadata.contentType, "image/svg+xml");
    assert.equal(metadata.forceAttachment, false);
    assert.equal(metadata.contentSecurityPolicy, undefined);
  });
});
