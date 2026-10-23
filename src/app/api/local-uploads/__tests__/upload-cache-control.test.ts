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

  it("serves non-icon SVG uploads as attachments without a response CSP", () => {
    // Known public icon paths still render inline; every other SVG is forced
    // to download so direct navigation cannot execute script.
    const metadata = resolveUploadContentMetadata(".svg", "/uploads/svg/uploaded-diagram.svg");

    assert.equal(metadata.contentType, "image/svg+xml");
    assert.equal(metadata.forceAttachment, true);
    assert.equal(metadata.contentSecurityPolicy, undefined);
  });

  it("serves known public icon SVG inline without a response CSP", () => {
    const metadata = resolveUploadContentMetadata(".svg", "/uploads/svg/favicon.svg");

    assert.equal(metadata.forceAttachment, false);
    assert.equal(metadata.contentSecurityPolicy, undefined);
  });
});
