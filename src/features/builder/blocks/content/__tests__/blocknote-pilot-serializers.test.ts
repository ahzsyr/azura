import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isBlockNoteDocument,
  isBlockNoteEnvelope,
  isTipTapDoc,
  parseStoredContent,
} from "@/features/builder/blocks/content/admin/blocknote-pilot/format";
import { stableStringify } from "@/features/builder/blocks/content/admin/blocknote-pilot/stable-json";

describe("blocknote-pilot stable JSON", () => {
  it("sorts object keys deterministically", () => {
    assert.equal(
      stableStringify({ b: 1, a: { d: 2, c: 3 } }),
      '{"a":{"c":3,"d":2},"b":1}'
    );
  });
});

describe("blocknote-pilot format detectors", () => {
  it("detects TipTap docs", () => {
    assert.equal(isTipTapDoc({ type: "doc", content: [] }), true);
    assert.equal(isTipTapDoc([{ type: "paragraph" }]), false);
  });

  it("detects BlockNote documents and envelopes", () => {
    const blocks = [{ type: "paragraph", content: [] }];
    assert.equal(isBlockNoteDocument(blocks), true);
    assert.equal(isBlockNoteEnvelope({ format: "blocknote", version: 1, blocks }), true);
    assert.equal(isBlockNoteEnvelope({ type: "doc" }), false);
  });

  it("parses stored JSON or returns null", () => {
    assert.deepEqual(parseStoredContent('{"type":"doc","content":[]}'), {
      type: "doc",
      content: [],
    });
    assert.equal(parseStoredContent("not-json"), null);
    assert.equal(parseStoredContent(""), null);
  });
});
