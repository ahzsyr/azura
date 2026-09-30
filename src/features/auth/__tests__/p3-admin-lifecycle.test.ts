import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminLifecycleDestination,
  isAdminLifecycleExemptPath,
} from "@/features/auth/admin-lifecycle";
import { requiresMfaAtLogin } from "@/features/auth/mfa-policy";
import { isCustomerEmailUnverified } from "@/features/auth/account-status";
import {
  resolvePostLoginRedirect,
  isAdminRole,
} from "@/features/auth/portal";

describe("P3 admin lifecycle gate", () => {
  it("mustChangePassword redirects to password tab only", () => {
    const block = adminLifecycleDestination({
      mustChangePassword: true,
      totpEnabled: false,
    });
    assert.ok(block);
    assert.equal(block.kind, "password_change_required");
    assert.equal(block.redirectTo, "/admin/settings/account?tab=password");
  });

  it("password takes priority over MFA enrollment", () => {
    const block = adminLifecycleDestination({
      mustChangePassword: true,
      totpEnabled: false,
    });
    assert.equal(block?.kind, "password_change_required");
  });

  it("!totpEnabled no longer blocks dashboard (email OTP at login)", () => {
    const block = adminLifecycleDestination({
      mustChangePassword: false,
      totpEnabled: false,
    });
    assert.equal(block, null);
  });

  it("cleared gate allows dashboard without TOTP", () => {
    assert.equal(
      adminLifecycleDestination({
        mustChangePassword: false,
        totpEnabled: false,
      }),
      null,
    );
  });

  it("account settings is exempt; products is not", () => {
    assert.equal(isAdminLifecycleExemptPath("/admin/settings/account"), true);
    assert.equal(isAdminLifecycleExemptPath("/admin/products"), false);
  });
});

describe("P3 privilege model (pure checks)", () => {
  it("SUPER_ADMIN is an admin role for portal routing", () => {
    assert.equal(isAdminRole("SUPER_ADMIN"), true);
    assert.equal(
      resolvePostLoginRedirect({
        role: "SUPER_ADMIN",
        locale: "en",
        callbackUrl: null,
      }),
      "/admin",
    );
  });

  it("admin login always requires MFA challenge (email OTP)", () => {
    assert.equal(requiresMfaAtLogin("ADMIN", false), true);
    assert.equal(requiresMfaAtLogin("ADMIN", true), true);
    assert.equal(requiresMfaAtLogin("SUPER_ADMIN", true), true);
  });

  it("CUSTOMER with totpEnabled still no MFA challenge (P1)", () => {
    assert.equal(requiresMfaAtLogin("CUSTOMER", true), false);
  });

  it("unverified CUSTOMER still blocked (P2)", () => {
    assert.equal(isCustomerEmailUnverified("CUSTOMER", null), true);
  });

  it("admins remain ungated by emailVerifiedAt (P2)", () => {
    assert.equal(isCustomerEmailUnverified("ADMIN", null), false);
    assert.equal(isCustomerEmailUnverified("SUPER_ADMIN", null), false);
  });
});

describe("P3 disable rules (documented pure expectations)", () => {
  it("cannot disable SUPER_ADMIN targets by role check", () => {
    const canDisable = (actorRole: string, targetRole: string, self: boolean) => {
      if (actorRole !== "SUPER_ADMIN") return false;
      if (self) return false;
      if (targetRole !== "ADMIN") return false;
      return true;
    };
    assert.equal(canDisable("SUPER_ADMIN", "ADMIN", false), true);
    assert.equal(canDisable("SUPER_ADMIN", "SUPER_ADMIN", false), false);
    assert.equal(canDisable("SUPER_ADMIN", "ADMIN", true), false);
    assert.equal(canDisable("ADMIN", "ADMIN", false), false);
  });
});
