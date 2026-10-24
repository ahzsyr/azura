import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeVisitorToken,
  visitorLinkSessionError,
} from "@/features/account/admin/visitor-link-policy";
import { canToggleAccount } from "@/features/account/admin/user-portal-access";

describe("visitor link session", () => {
  it("rejects a visitor link without a session", () => {
    assert.equal(visitorLinkSessionError(null), "unauthorized");
    assert.equal(visitorLinkSessionError("  "), "unauthorized");
    assert.equal(visitorLinkSessionError("user_1"), null);
  });

  it("accepts only a stored visitor token", () => {
    assert.equal(normalizeVisitorToken("short"), null);
    assert.equal(normalizeVisitorToken("visitor token"), null);
    assert.equal(normalizeVisitorToken("visitor-token-1"), "visitor-token-1");
  });
});

describe("account enable and disable", () => {
  it("blocks self, super admin, and staff changes by a normal admin", () => {
    assert.equal(
      canToggleAccount({
        actorId: "a",
        actorRole: "SUPER_ADMIN",
        targetId: "a",
        targetRole: "SUPER_ADMIN",
      }),
      false,
    );
    assert.equal(
      canToggleAccount({
        actorId: "super",
        actorRole: "SUPER_ADMIN",
        targetId: "other",
        targetRole: "SUPER_ADMIN",
      }),
      false,
    );
    assert.equal(
      canToggleAccount({
        actorId: "admin",
        actorRole: "ADMIN",
        targetId: "staff",
        targetRole: "ADMIN",
      }),
      false,
    );
    assert.equal(
      canToggleAccount({
        actorId: "admin",
        actorRole: "ADMIN",
        targetId: "customer",
        targetRole: "CUSTOMER",
      }),
      true,
    );
  });
});
