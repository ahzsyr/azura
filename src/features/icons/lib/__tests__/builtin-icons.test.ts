import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveBuiltinLucideIcon } from "../builtin-icons";

describe("builtin icon registry", () => {
  it("resolves known builtin ids", () => {
    assert.ok(resolveBuiltinLucideIcon("chevron-right"));
    assert.ok(resolveBuiltinLucideIcon("arrow-right"));
    assert.ok(resolveBuiltinLucideIcon("search"));
  });

  it("fails safely for unknown ids", () => {
    assert.equal(resolveBuiltinLucideIcon("not-a-real-icon-id"), null);
  });
});

