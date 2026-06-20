import assert from "node:assert/strict";
import test from "node:test";

import {
  SEARCH_SEMANTICS_CONTRACT,
  normalizeToken,
  tokenize,
  tokenizeForSearch,
} from "@/features/search/core/text";

test("tokenizeForSearch applies the shared semantics contract", () => {
  assert.deepEqual(tokenizeForSearch(" Cisco  Switch-9000 (PoE) "), [
    "cisco",
    "switch",
    "9000",
    "poe",
  ]);
});

test("legacy tokenize delegates to the shared tokenizer", () => {
  assert.deepEqual(tokenize("Cisco Switch-9000"), tokenizeForSearch("Cisco Switch-9000"));
});

test("normalizeToken uses contract normalization", () => {
  assert.equal(normalizeToken("Switch-9000"), "switch");
});

test("prefix tokens are bounded by the search contract", () => {
  const tokens = tokenizeForSearch("networking", { includePrefixes: true });

  assert(tokens.includes("ne"));
  assert(tokens.includes("network"));
  assert(tokens.includes("networki"));
  assert(tokens.includes("networking"));
  assert(!tokens.includes("n"));
  assert(!tokens.includes("networkin"));
  assert.equal(SEARCH_SEMANTICS_CONTRACT.prefixBehavior.maxPrefixLength, 8);
});
