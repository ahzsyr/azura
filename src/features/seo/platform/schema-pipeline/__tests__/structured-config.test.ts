import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStructuredConfig } from "../structured-config";

test("normalizeStructuredConfig - migration rules", async (t) => {
  await t.test("strips legacy faqBuilder: true when version < 4 and updates version to 4", () => {
    const normalized = normalizeStructuredConfig({
      version: 3,
      builderFlags: { faqBuilder: true, productBuilder: true },
    });

    assert.equal(normalized.version, 4);
    assert.equal(normalized.builderFlags?.faqBuilder, undefined);
    assert.equal(normalized.builderFlags?.productBuilder, true);
  });

  await t.test("preserves explicit faqBuilder: true when version >= 4", () => {
    const normalized = normalizeStructuredConfig({
      version: 4,
      builderFlags: { faqBuilder: true, productBuilder: true },
    });

    assert.equal(normalized.version, 4);
    assert.equal(normalized.builderFlags?.faqBuilder, true);
    assert.equal(normalized.builderFlags?.productBuilder, true);
  });
});
