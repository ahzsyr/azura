import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requiresMfaAtLogin } from "@/features/auth/mfa-policy";
import {
  isAccountDisabled,
  isAccountTemporarilyLocked,
  LOGIN_LOCKOUT_THRESHOLD,
} from "@/features/auth/account-status";
import { passwordPolicySchema } from "@/schemas/password-policy";
import { loginSchema } from "@/schemas/auth";
import {
  resolvePostLoginRedirect,
  sanitizeInternalPath,
} from "@/features/auth/portal";

describe("P1 MFA login policy", () => {
  it("CUSTOMER never challenged (even if totpEnabled)", () => {
    assert.equal(requiresMfaAtLogin("CUSTOMER", true), false);
  });

  it("ADMIN always challenged via email OTP (totpEnabled irrelevant)", () => {
    assert.equal(requiresMfaAtLogin("ADMIN", false), true);
    assert.equal(requiresMfaAtLogin("ADMIN", true), true);
  });

  it("SUPER_ADMIN always challenged via email OTP", () => {
    assert.equal(requiresMfaAtLogin("SUPER_ADMIN", false), true);
    assert.equal(requiresMfaAtLogin("SUPER_ADMIN", true), true);
  });
  it("MfaRequiredError / MfaInvalidError expose CredentialsSignin codes", async () => {
    const { MfaInvalidError, MfaRequiredError } = await import("@/lib/auth-errors");
    assert.equal(new MfaRequiredError().code, "mfa_required");
    assert.equal(new MfaInvalidError().code, "mfa_invalid");
  });
});

describe("P1 lockout predicates", () => {
  it("disabledAt blocks login-eligible check", () => {
    assert.equal(isAccountDisabled(new Date()), true);
    assert.equal(isAccountDisabled(null), false);
  });

  it("lockedUntil in the future locks; past does not", () => {
    assert.equal(isAccountTemporarilyLocked(new Date(Date.now() + 60_000)), true);
    assert.equal(isAccountTemporarilyLocked(new Date(Date.now() - 60_000)), false);
    assert.equal(isAccountTemporarilyLocked(null), false);
  });

  it("lockout threshold is 5", () => {
    assert.equal(LOGIN_LOCKOUT_THRESHOLD, 5);
  });
});

describe("P1 password policy", () => {
  it("rejects short passwords for create/change/reset", () => {
    assert.equal(passwordPolicySchema.safeParse("shortpass").success, false);
    assert.equal(passwordPolicySchema.safeParse("12345678901").success, false);
  });

  it("rejects common denylist passwords even if long enough", () => {
    assert.equal(passwordPolicySchema.safeParse("password1234").success, false);
    assert.equal(passwordPolicySchema.safeParse("welcome1234").success, false);
  });

  it("accepts a strong new password", () => {
    assert.equal(passwordPolicySchema.safeParse("Correct-Horse-Battery").success, true);
  });

  it("loginSchema still accepts existing ≥8 passwords", () => {
    assert.equal(
      loginSchema.safeParse({
        email: "a@b.com",
        password: "Admin123",
      }).success,
      true,
    );
  });
});

describe("P0 portal destination regression (post-P1)", () => {
  it("admin destination unchanged", () => {
    assert.equal(
      resolvePostLoginRedirect({
        role: "ADMIN",
        callbackUrl: "/admin/products",
        locale: "en",
      }),
      "/admin/products",
    );
  });

  it("customer cannot use admin callback", () => {
    const dest = resolvePostLoginRedirect({
      role: "CUSTOMER",
      callbackUrl: "/admin/products",
      locale: "en",
    });
    assert.ok(!dest.startsWith("/admin"));
  });

  it("sanitize still blocks open redirects", () => {
    assert.equal(sanitizeInternalPath("https://evil.example"), null);
    assert.equal(sanitizeInternalPath("//evil.example"), null);
  });
});
