import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseShowFlag,
  resolveEditorialMetaDisplay,
} from "@/schemas/editorial-metadata";

describe("parseShowFlag", () => {
  it("defaults to true when missing", () => {
    assert.equal(parseShowFlag(undefined), true);
    assert.equal(parseShowFlag(null), true);
    assert.equal(parseShowFlag(""), true);
  });

  it("parses boolean and form string values", () => {
    assert.equal(parseShowFlag(true), true);
    assert.equal(parseShowFlag(false), false);
    assert.equal(parseShowFlag("true"), true);
    assert.equal(parseShowFlag("false"), false);
    assert.equal(parseShowFlag("on"), true);
    assert.equal(parseShowFlag("off"), false);
  });
});

describe("resolveEditorialMetaDisplay", () => {
  it("keeps author and date when flags are on or omitted", () => {
    assert.deepEqual(
      resolveEditorialMetaDisplay({
        author: "Ada",
        publishedAt: "2026-01-01",
      }),
      { author: "Ada", publishedAt: "2026-01-01" },
    );
  });

  it("hides author and date independently", () => {
    assert.deepEqual(
      resolveEditorialMetaDisplay({
        author: "Ada",
        publishedAt: "2026-01-01",
        showAuthor: false,
        showPublishedAt: true,
      }),
      { author: null, publishedAt: "2026-01-01" },
    );
    assert.deepEqual(
      resolveEditorialMetaDisplay({
        author: "Ada",
        publishedAt: "2026-01-01",
        showAuthor: true,
        showPublishedAt: false,
      }),
      { author: "Ada", publishedAt: null },
    );
  });
});
