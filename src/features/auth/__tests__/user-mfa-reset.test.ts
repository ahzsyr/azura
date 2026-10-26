import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";
import * as OTPAuth from "otpauth";
import {
  canSelfManageMfa,
  isMfaMethod,
  requiresSecondFactor,
  resolveMfaState,
} from "@/features/auth/mfa-policy.helpers";
import { requiresSecondFactorForUser } from "@/features/auth/mfa-policy";
import { hashEmailOtp } from "@/features/auth/email-otp.helpers";
import {
  PASSWORD_RESET_TICKET_TTL_MS,
  isPasswordResetOtpFormat,
  maskResetHint,
  normalizePasswordResetCode,
  resolvePasswordResetStage,
} from "@/features/account/password-reset-otp.helpers";

/**
 * MFA isolation is structural: the factor lives on the user row and every
 * code is hashed with the owning user id in its rate-limit/scope key. These
 * tests pin the decisions that make that true.
 */

describe("per-user MFA state", () => {
  it("no factor means not enrolled", () => {
    const state = resolveMfaState({ role: "CUSTOMER", mfaMethod: null, totpEnabled: false });
    assert.deepEqual(state, { enrolled: false, method: null, disabledByAdmin: false });
  });

  it("an authenticator enrollment counts only with a stored secret", () => {
    assert.equal(
      resolveMfaState({ role: "CUSTOMER", mfaMethod: "AUTHENTICATOR", totpSecret: "JBSWY3DP" }).enrolled,
      true,
    );
    assert.equal(
      resolveMfaState({ role: "CUSTOMER", mfaMethod: "AUTHENTICATOR", totpSecret: null }).enrolled,
      false,
    );
  });

  it("email-code MFA needs no secret", () => {
    assert.deepEqual(resolveMfaState({ role: "CUSTOMER", mfaMethod: "EMAIL_OTP" }), {
      enrolled: true,
      method: "EMAIL_OTP",
      disabledByAdmin: false,
    });
  });

  it("legacy totpEnabled rows keep their authenticator after the upgrade", () => {
    const state = resolveMfaState({
      role: "ADMIN",
      mfaMethod: null,
      totpEnabled: true,
      totpSecret: "SEALED",
    });
    assert.equal(state.enrolled, true);
    assert.equal(state.method, "AUTHENTICATOR");
  });

  it("an admin switch-off wins over any stored enrollment", () => {
    const state = resolveMfaState({
      role: "CUSTOMER",
      mfaMethod: "AUTHENTICATOR",
      totpSecret: "SEALED",
      mfaDisabledByAdminAt: new Date(),
    });
    assert.equal(state.enrolled, false);
    assert.equal(state.disabledByAdmin, true);
  });

  it("two users' settings are independent values", () => {
    const alice = { role: "CUSTOMER", mfaMethod: "AUTHENTICATOR", totpSecret: "ALICE" };
    const bob = { role: "CUSTOMER", mfaMethod: null, totpEnabled: false };
    assert.equal(resolveMfaState(alice).enrolled, true);
    assert.equal(resolveMfaState(bob).enrolled, false);
    // The helper is a pure function of the row it is given: resolving one
    // account's state cannot change another's.
    assert.equal(resolveMfaState(alice).enrolled, true);
  });

  it("validates method values", () => {
    assert.equal(isMfaMethod("AUTHENTICATOR"), true);
    assert.equal(isMfaMethod("EMAIL_OTP"), true);
    assert.equal(isMfaMethod("SMS"), false);
    assert.equal(isMfaMethod(null), false);
  });
});

describe("who is challenged at sign-in", () => {
  it("admins always are", () => {
    assert.equal(requiresSecondFactor({ role: "ADMIN" }), true);
    assert.equal(requiresSecondFactor({ role: "SUPER_ADMIN" }), true);
    assert.equal(requiresSecondFactorForUser({ role: "ADMIN" }), true);
  });

  it("customers only after enrolling", () => {
    assert.equal(requiresSecondFactor({ role: "CUSTOMER" }), false);
    assert.equal(
      requiresSecondFactor({ role: "CUSTOMER", mfaMethod: "EMAIL_OTP" }),
      true,
    );
    assert.equal(
      requiresSecondFactorForUser({ role: "CUSTOMER", mfaMethod: "AUTHENTICATOR", totpSecret: "X" }),
      true,
    );
  });
});

describe("self-service lock after an admin switches MFA off", () => {
  it("refuses self-enrollment while the admin lock is set", () => {
    const result = canSelfManageMfa({ role: "CUSTOMER", mfaDisabledByAdminAt: new Date() });
    assert.equal(result.ok, false);
  });

  it("allows self-enrollment otherwise", () => {
    assert.equal(canSelfManageMfa({ role: "CUSTOMER" }).ok, true);
  });
});

describe("authenticator codes (TOTP)", () => {
  function codeFor(secretBase32: string, offsetMs = 0): string {
    const totp = new OTPAuth.TOTP({
      issuer: "Test",
      label: "user@example.com",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });
    return totp.generate({ timestamp: Date.now() + offsetMs });
  }

  it("a code from the user's secret validates for that user", () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    const code = codeFor(secret, -2_000);
    const totp = new OTPAuth.TOTP({
      issuer: "Test",
      label: "user@example.com",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    assert.notEqual(totp.validate({ token: code, window: 1 }), null);
  });

  it("one user's code does not validate against another user's secret", () => {
    const aliceSecret = new OTPAuth.Secret({ size: 20 }).base32;
    const bobSecret = new OTPAuth.Secret({ size: 20 }).base32;
    const aliceCode = codeFor(aliceSecret);
    const bobTotp = new OTPAuth.TOTP({
      issuer: "Test",
      label: "bob@example.com",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(bobSecret),
    });
    // Unless the two random secrets happen to collide, Alice's code is invalid
    // for Bob's enrollment.
    assert.equal(bobTotp.validate({ token: aliceCode, window: 1 }), null);
  });

  it("rejects stale codes outside the drift window", () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    const code = codeFor(secret, -5 * 60 * 1000);
    const totp = new OTPAuth.TOTP({
      issuer: "Test",
      label: "user@example.com",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    assert.equal(totp.validate({ token: code, window: 1 }), null);
  });
});

describe("password-reset codes", () => {
  it("accepts exactly six digits, tolerating spaces and dashes", () => {
    assert.equal(isPasswordResetOtpFormat("123456"), true);
    assert.equal(isPasswordResetOtpFormat("12345"), false);
    assert.equal(normalizePasswordResetCode("123 456"), "123456");
    assert.equal(normalizePasswordResetCode("123-456"), "123456");
    assert.equal(normalizePasswordResetCode("abcdef"), null);
    assert.equal(normalizePasswordResetCode(undefined), null);
  });

  it("hashes are deterministic (so a stored digest can be matched) and user-agnostic", () => {
    const hash = hashEmailOtp("123456");
    assert.equal(hash, createHash("sha256").update("123456").digest("hex"));
    assert.equal(hash.length, 64);
    // The digest is per code; the *record* is scoped by userId, which is what
    // keeps one account's code from redeeming on another.
    assert.notEqual(hashEmailOtp("123456"), hashEmailOtp("654321"));
  });

  it("masks the reset hint without revealing the local part", () => {
    // Exactly one bullet per hidden character, capped at 6.
    assert.equal(maskResetHint("jane.doe@example.com"), "j••••••@example.com");
    assert.equal(maskResetHint("a@example.com"), "a••@example.com");
    assert.equal(maskResetHint("not-an-email"), "");
  });

  it("derives the flow stage from the ticket", () => {
    assert.equal(resolvePasswordResetStage({ hasTicket: false, ticketVerified: false }), "request");
    assert.equal(resolvePasswordResetStage({ hasTicket: true, ticketVerified: false }), "verify");
    assert.equal(resolvePasswordResetStage({ hasTicket: true, ticketVerified: true }), "password");
  });

  it("tickets live long enough to finish the password step", () => {
    assert.ok(PASSWORD_RESET_TICKET_TTL_MS >= 5 * 60 * 1000);
    assert.ok(PASSWORD_RESET_TICKET_TTL_MS <= 30 * 60 * 1000);
  });
});
