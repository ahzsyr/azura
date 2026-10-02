import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mimeTypeForUpload,
  resolveMediaType,
  validateUploadFile,
} from "@/lib/local-media-storage";

describe("resolveMediaType", () => {
  it("classifies .svg as SVG even when the browser MIME is text/plain", () => {
    assert.equal(resolveMediaType("UniFi.svg", "text/plain"), "SVG");
    assert.equal(resolveMediaType("logo.SVG", "application/octet-stream"), "SVG");
    assert.equal(resolveMediaType("mark.svg", ""), "SVG");
  });

  it("classifies image/svg+xml as SVG regardless of filename quirks", () => {
    assert.equal(resolveMediaType("logo", "image/svg+xml"), "SVG");
  });

  it("does not treat generic XML documents as SVG", () => {
    assert.equal(resolveMediaType("data.xml", "application/xml"), "DOCUMENT");
  });

  it("still classifies raster images from MIME", () => {
    assert.equal(resolveMediaType("hero.webp", "image/webp"), "IMAGE");
  });
});

describe("mimeTypeForUpload", () => {
  it("stores SVG as image/svg+xml even when the browser lies", () => {
    assert.equal(mimeTypeForUpload("UniFi.svg", "text/plain", "SVG"), "image/svg+xml");
    assert.equal(mimeTypeForUpload("logo.svg", "application/octet-stream"), "image/svg+xml");
  });
});

describe("validateUploadFile", () => {
  it("accepts SVG uploads whose MIME is text/plain", () => {
    const result = validateUploadFile({
      name: "UniFi.svg",
      type: "text/plain",
      size: 1024,
    });
    assert.equal("error" in result, false);
    if (!("error" in result)) assert.equal(result.mediaType, "SVG");
  });
});
