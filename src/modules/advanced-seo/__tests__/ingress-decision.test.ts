import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideAdvancedSeoMutation } from "@/modules/advanced-seo/ingress-decision";

describe("decideAdvancedSeoMutation", () => {
  it("allows when access is active", () => {
    assert.deepEqual(decideAdvancedSeoMutation("active"), { allow: true });
  });

  it("refuses profile_omitted", () => {
    assert.deepEqual(decideAdvancedSeoMutation("profile_omitted"), {
      allow: false,
      reason: "profile_omitted",
    });
  });

  it("refuses runtime_inactive", () => {
    assert.deepEqual(decideAdvancedSeoMutation("runtime_inactive"), {
      allow: false,
      reason: "runtime_inactive",
    });
  });

  it("refuses ledger_unavailable (fail-closed)", () => {
    assert.deepEqual(decideAdvancedSeoMutation("ledger_unavailable"), {
      allow: false,
      reason: "ledger_unavailable",
    });
  });
});
