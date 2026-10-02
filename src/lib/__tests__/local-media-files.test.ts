import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { uploadFallbackUrls } from "@/lib/local-upload-urls";

describe("uploadFallbackUrls", () => {
  it("tries sibling upload folders for the same filename", () => {
    const urls = uploadFallbackUrls("/uploads/svg/1782896153077-BRT_Logo_svg.svg");
    assert.equal(urls[0], "/uploads/svg/1782896153077-BRT_Logo_svg.svg");
    assert.ok(urls.includes("/uploads/documents/1782896153077-BRT_Logo_svg.svg"));
    assert.ok(urls.includes("/uploads/images/1782896153077-BRT_Logo_svg.svg"));
  });

  it("ignores non-upload paths", () => {
    assert.deepEqual(uploadFallbackUrls("https://cdn.example/logo.svg"), []);
  });
});
