import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMAIL_OTP_TTL_MS,
  emailOtpExpiresAt,
  generateEmailOtpCode,
  hashEmailOtp,
  isEmailOtpFormat,
} from "@/features/auth/email-otp.helpers";

describe("email OTP helpers", () => {
  it("generates 6-digit numeric codes", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateEmailOtpCode();
      assert.equal(code.length, 6);
      assert.equal(isEmailOtpFormat(code), true);
    }
  });

  it("hashes codes (SHA-256 hex) and never equals plaintext", () => {
    const code = "123456";
    const hash = hashEmailOtp(code);
    assert.equal(hash.length, 64);
    assert.notEqual(hash, code);
    assert.equal(hashEmailOtp(code), hash);
    assert.notEqual(hashEmailOtp("654321"), hash);
  });

  it("TTL is 5 minutes", () => {
    assert.equal(EMAIL_OTP_TTL_MS, 5 * 60 * 1000);
    const from = new Date("2026-01-01T00:00:00.000Z");
    const exp = emailOtpExpiresAt(from);
    assert.equal(exp.getTime() - from.getTime(), EMAIL_OTP_TTL_MS);
  });

  it("rejects non-6-digit formats", () => {
    assert.equal(isEmailOtpFormat("12345"), false);
    assert.equal(isEmailOtpFormat("1234567"), false);
    assert.equal(isEmailOtpFormat("abcdef"), false);
    assert.equal(isEmailOtpFormat(" 123456 "), true);
  });
});
