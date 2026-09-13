import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filenameFromMediaUrl,
  isPersistableMediaUrl,
  mediaTypeForLinkedUrl,
} from "@/features/media/ensure-media-asset-by-url.utils";

describe("ensureMediaAssetByUrl helpers", () => {
  it("accepts http(s) and site-relative URLs", () => {
    assert.equal(isPersistableMediaUrl("https://cdn.example.com/a.jpg"), true);
    assert.equal(isPersistableMediaUrl("http://example.com/a.jpg"), true);
    assert.equal(isPersistableMediaUrl("/uploads/images/a.jpg"), true);
    assert.equal(isPersistableMediaUrl("javascript:alert(1)"), false);
    assert.equal(isPersistableMediaUrl("not a url"), false);
  });

  it("derives a safe filename and image media type from the URL", () => {
    const filename = filenameFromMediaUrl("https://cdn.example.com/photos/Hero%20Shot.png?w=800");
    assert.equal(filename, "Hero_Shot.png");
    assert.equal(mediaTypeForLinkedUrl("https://cdn.example.com/photos/Hero%20Shot.png?w=800"), "IMAGE");
  });
});
