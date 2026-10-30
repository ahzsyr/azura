import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideStatusPageMutation } from "@/modules/status-page/ingress-decision";

describe("decideStatusPageMutation", () => {
  it("allows when access is active", () => {
    assert.deepEqual(decideStatusPageMutation("active"), { allow: true });
  });

  it("refuses profile_omitted", () => {
    assert.deepEqual(decideStatusPageMutation("profile_omitted"), {
      allow: false,
      reason: "profile_omitted",
    });
  });

  it("refuses runtime_inactive", () => {
    assert.deepEqual(decideStatusPageMutation("runtime_inactive"), {
      allow: false,
      reason: "runtime_inactive",
    });
  });

  it("refuses ledger_unavailable (fail-closed)", () => {
    assert.deepEqual(decideStatusPageMutation("ledger_unavailable"), {
      allow: false,
      reason: "ledger_unavailable",
    });
  });
});
