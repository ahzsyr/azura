import assert from "node:assert/strict";
import test from "node:test";
import { isIndexableLinkTarget } from "../index";

test("isIndexableLinkTarget rejects parameterized crawl traps", () => {
  assert.equal(isIndexableLinkTarget("entity://product/access-point"), true);
  assert.equal(isIndexableLinkTarget("entity://webpage/search?q=wifi" as never), false);
  assert.equal(isIndexableLinkTarget("entity://category/filter/color" as never), false);
});
