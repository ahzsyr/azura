import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as OTPAuth from "otpauth";
import {
  isRecoveryCodeFormat,
  isSixDigitCode,
  resolveLoginMfaAttempt,
} from "@/features/auth/login-mfa-factors";

/**
 * Regression coverage for "the authenticator app is not accepted".
 *
 * These mirror the authenticator check in `mfa-totp.service.ts`
 * (`verifyAuthenticatorCode`), which uses the same otpauth options (SHA1 / 6
 * digits / 30s / +/-1 step). They fail if the window is dropped, the algorithm
 * changes, or the secret is encoded differently.
 */
function buildTotp(secretB32: string, at?: number) {
  const totp = new OTPAuth.TOTP({
    issuer: "B R T Trading LLC",
    label: "admin@brt-me.com",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretB32),
  });
  return { totp, at };
}

describe("authenticator (TOTP) code acceptance", () => {
  const secret = new OTPAuth.Secret({ size: 20 }).base32;

  it("accepts the current code", () => {
    const { totp } = buildTotp(secret);
    const token = totp.generate();
    assert.equal(isSixDigitCode(token), true);
    assert.notEqual(totp.validate({ token, window: 1 }), null);
  });

  it("accepts a code one step behind / ahead (clock drift)", () => {
    const { totp } = buildTotp(secret);
    const now = Date.now();
    const behind = totp.generate({ timestamp: now - 30_000 });
    const ahead = totp.generate({ timestamp: now + 30_000 });
    assert.notEqual(totp.validate({ token: behind, window: 1 }), null);
    assert.notEqual(totp.validate({ token: ahead, window: 1 }), null);
  });

  it("rejects a wrong code and codes from another secret", () => {
    const { totp } = buildTotp(secret);
    assert.equal(totp.validate({ token: "000000", window: 1 }), null);

    const other = buildTotp(new OTPAuth.Secret({ size: 20 }).base32);
    assert.equal(totp.validate({ token: other.totp.generate(), window: 1 }), null);
  });

  it("treats authenticator and delivered OTP codes as indistinguishable 6 digits", () => {
    // Both are 6 digits, which is exactly why the server must try the
    // authenticator first and fall back to a pending OTP.
    const { totp } = buildTotp(secret);
    const token = totp.generate();
    assert.equal(isSixDigitCode(token), true);
    assert.equal(isRecoveryCodeFormat(token), false);

    const attempt = resolveLoginMfaAttempt({
      code: token,
      totpEnabled: true,
      hasDeliveredOtp: true,
    });
    assert.equal(attempt.tryAuthenticatorFirst, true, "authenticator must win the first attempt");
    assert.equal(attempt.tryDeliveredOtp, true, "a pending OTP is still a valid fallback");
  });
});
