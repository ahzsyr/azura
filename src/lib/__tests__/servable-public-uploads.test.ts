import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dropUnservableUploadUrl,
  normalizedUploadUrl,
  uniqueNormalizedUploadUrls,
} from "@/lib/servable-public-uploads";

describe("servable public uploads", () => {
  it("normalizes local upload paths and ignores remote urls", () => {
    assert.equal(
      normalizedUploadUrl("https://brt-me.com/uploads/images/1782830232745-MikroTik_Profile.webp"),
      "/uploads/images/1782830232745-MikroTik_Profile.webp",
    );
    assert.equal(normalizedUploadUrl("https://cdn.example/logo.webp"), null);
    assert.equal(normalizedUploadUrl("  "), null);
  });

  it("drops upload urls that the public route will not serve", () => {
    const servable = new Set(["/uploads/images/ok.webp"]);
    assert.equal(dropUnservableUploadUrl("/uploads/images/ok.webp", servable), "/uploads/images/ok.webp");
    assert.equal(
      dropUnservableUploadUrl("/uploads/images/1782830233334-Alfa_Network_Profile.webp", servable),
      undefined,
    );
    assert.equal(
      dropUnservableUploadUrl("https://images.example/logo.webp", servable),
      "https://images.example/logo.webp",
    );
  });

  it("dedupes upload urls", () => {
    assert.deepEqual(
      uniqueNormalizedUploadUrls([
        "/uploads/images/a.webp",
        "https://brt-me.com/uploads/images/a.webp",
        "/uploads/images/b.webp",
        "not-an-upload",
      ]),
      ["/uploads/images/a.webp", "/uploads/images/b.webp"],
    );
  });
});
