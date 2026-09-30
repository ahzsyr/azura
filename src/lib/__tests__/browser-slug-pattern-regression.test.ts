import { describe, it } from "node:test";
import assert from "node:assert/strict";

const slugPattern = "[-a-z0-9]+";
const anchoredPattern = `^(?:${slugPattern})$`;

describe("browser-friendly slug html pattern", () => {
  it("keeps the hyphen first so the browser accepts the character class", () => {
    assert.doesNotThrow(() => new RegExp(slugPattern));
    const regex = new RegExp(anchoredPattern);
    assert.equal(regex.test("customers-02"), true);
    assert.equal(regex.test("CUSTOMERS"), false);
    assert.equal(regex.test("customers_02"), false);
  });
});
