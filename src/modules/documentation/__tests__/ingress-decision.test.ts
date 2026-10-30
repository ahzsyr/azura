import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideDocumentationMutation } from "@/modules/documentation/ingress-decision";

describe("decideDocumentationMutation", () => {
  it("allows when access is active", () => {
    assert.deepEqual(decideDocumentationMutation("active"), { allow: true });
  });

  it("refuses profile_omitted", () => {
    assert.deepEqual(decideDocumentationMutation("profile_omitted"), {
      allow: false,
      reason: "profile_omitted",
    });
  });

  it("refuses runtime_inactive", () => {
    assert.deepEqual(decideDocumentationMutation("runtime_inactive"), {
      allow: false,
      reason: "runtime_inactive",
    });
  });

  it("refuses ledger_unavailable (fail-closed)", () => {
    assert.deepEqual(decideDocumentationMutation("ledger_unavailable"), {
      allow: false,
      reason: "ledger_unavailable",
    });
  });
});
