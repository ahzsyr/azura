import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseBytesRange } from "@/app/api/local-uploads/parse-bytes-range";

describe("parseBytesRange", () => {
  it("returns null when Range header is absent", () => {
    assert.equal(parseBytesRange(null, 1000), null);
  });

  it("parses inclusive start-end ranges", () => {
    assert.deepEqual(parseBytesRange("bytes=0-1023", 5000), { start: 0, end: 1023 });
  });

  it("parses open-ended ranges", () => {
    assert.deepEqual(parseBytesRange("bytes=100-", 5000), { start: 100, end: 4999 });
  });

  it("parses suffix ranges", () => {
    assert.deepEqual(parseBytesRange("bytes=-500", 5000), { start: 4500, end: 4999 });
  });

  it("clamps end to file size", () => {
    assert.deepEqual(parseBytesRange("bytes=0-99999", 1000), { start: 0, end: 999 });
  });

  it("rejects ranges past EOF", () => {
    assert.equal(parseBytesRange("bytes=1000-1001", 1000), "invalid");
  });

  it("rejects malformed ranges", () => {
    assert.equal(parseBytesRange("bytes=", 1000), "invalid");
    assert.equal(parseBytesRange("bytes=abc-def", 1000), "invalid");
  });
});
