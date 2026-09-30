import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCustomerEmailUnverified } from "@/features/auth/account-status";
import { requiresMfaAtLogin } from "@/features/auth/mfa-policy";
import { registerSchema } from "@/features/setup/setup-complete.schema";
import {
  resolvePostLoginRedirect,
  sanitizeInternalPath,
} from "@/features/auth/portal";
import { passwordPolicySchema } from "@/schemas/password-policy";

describe("P2 email verification gate", () => {
  it("unverified CUSTOMER is blocked", () => {
    assert.equal(isCustomerEmailUnverified("CUSTOMER", null), true);
    assert.equal(isCustomerEmailUnverified("CUSTOMER", undefined), true);
  });

  it("verified CUSTOMER is allowed", () => {
    assert.equal(isCustomerEmailUnverified("CUSTOMER", new Date()), false);
  });

  it("ADMIN / SUPER_ADMIN never gated by emailVerifiedAt", () => {
    assert.equal(isCustomerEmailUnverified("ADMIN", null), false);
    assert.equal(isCustomerEmailUnverified("SUPER_ADMIN", null), false);
  });

  it("grandfathered timestamp means verified", () => {
    const createdAt = new Date("2024-01-01T00:00:00.000Z");
    assert.equal(isCustomerEmailUnverified("CUSTOMER", createdAt), false);
  });
});

describe("P2 slim registerSchema", () => {
  it("accepts name/email/password only", () => {
    const parsed = registerSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "Correct-Horse-Battery",
    });
    assert.equal(parsed.success, true);
  });

  it("does not require profile fields", () => {
    const parsed = registerSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      password: "Correct-Horse-Battery",
      phone: undefined,
    });
    assert.equal(parsed.success, true);
  });

  it("rejects weak passwords", () => {
    assert.equal(
      registerSchema.safeParse({
        name: "Ada",
        email: "ada@example.com",
        password: "short",
      }).success,
      false,
    );
    assert.equal(passwordPolicySchema.safeParse("password1234").success, false);
  });
});

describe("P2 MFA policy unchanged (P1)", () => {
  it("customers still never MFA-challenged", () => {
    assert.equal(requiresMfaAtLogin("CUSTOMER", true), false);
  });
});

describe("P2 portal destination regression (P0)", () => {
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
  });
});
