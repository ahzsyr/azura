import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultLoginMfaFactor,
  describeLoginChallenge,
  isLoginOtpChannel,
  isRecoveryCodeFormat,
  isSixDigitCode,
  otpChannelsFromFactors,
  rankLoginMfaFactors,
  resolveLoginMfaAttempt,
} from "@/features/auth/login-mfa-factors";
describe("login MFA factor ranking", () => {
  it("puts the authenticator app first whenever it is enrolled", () => {
    const factors = rankLoginMfaFactors({
      totpEnabled: true,
      emailDeliverable: true,
      phoneDeliverable: true,
      whatsappDeliverable: true,
    });
    assert.equal(factors[0], "totp");
    assert.deepEqual(factors, ["totp", "email_otp", "sms_otp", "whatsapp_otp"]);
    assert.equal(defaultLoginMfaFactor(factors), "totp");
  });

  it("drops channels that cannot deliver", () => {
    const factors = rankLoginMfaFactors({
      totpEnabled: false,
      emailDeliverable: false,
      phoneDeliverable: true,
      whatsappDeliverable: false,
    });
    assert.deepEqual(factors, ["sms_otp"]);
    assert.deepEqual(otpChannelsFromFactors(factors), ["sms"]);
  });

  it("returns no factors when nothing is available (password-only fallback)", () => {
    assert.deepEqual(
      rankLoginMfaFactors({
        totpEnabled: false,
        emailDeliverable: false,
        phoneDeliverable: false,
        whatsappDeliverable: false,
      }),
      [],
    );
    assert.equal(defaultLoginMfaFactor([]), null);
  });

  it("keeps the authenticator even when no OTP channel works", () => {
    const factors = rankLoginMfaFactors({
      totpEnabled: true,
      emailDeliverable: false,
      phoneDeliverable: false,
      whatsappDeliverable: false,
    });
    assert.deepEqual(factors, ["totp"]);
  });
});

describe("login challenge description", () => {
  it("does not send an OTP when an authenticator is available", () => {
    const described = describeLoginChallenge(["totp", "email_otp"]);
    assert.equal(described.primary, "totp");
    assert.equal(described.willSendOtpImmediately, false);
    assert.equal(described.offersAuthenticator, true);
    assert.equal(described.otpChannelCount, 1);
  });

  it("sends an OTP immediately when there is no authenticator", () => {
    const described = describeLoginChallenge(["email_otp", "sms_otp"]);
    assert.equal(described.primary, "email_otp");
    assert.equal(described.willSendOtpImmediately, true);
    assert.equal(described.otpChannelCount, 2);
  });
});

describe("code classification", () => {
  it("recognises 6-digit codes and recovery codes", () => {
    assert.equal(isSixDigitCode("123456"), true);
    assert.equal(isSixDigitCode(" 123456 "), true);
    assert.equal(isSixDigitCode("12345"), false);
    assert.equal(isSixDigitCode("ABC123"), false);
    // Shape of the codes issued by generateRecoveryCodes(): 4-4-2 hex.
    // NOTE: the class is [0-9A-F] — G/H/I are outside the hex range.
    assert.equal(isRecoveryCodeFormat("0123-4567-89"), true);
    assert.equal(isRecoveryCodeFormat("ABCD-ABCE-01"), true);
    assert.equal(isRecoveryCodeFormat("abcd-abcf-99"), true);
    assert.equal(isRecoveryCodeFormat("ABCD-EFGH-IJ"), false, "G/H/I are not hex");
    assert.equal(isRecoveryCodeFormat("ABC-EFGH-IJKL"), false);
    assert.equal(isRecoveryCodeFormat("123456"), false);
  });

  it("classifies fallback channels", () => {
    assert.equal(isLoginOtpChannel("email"), true);
    assert.equal(isLoginOtpChannel("whatsapp"), true);
    assert.equal(isLoginOtpChannel("pigeon"), false);
    assert.equal(isLoginOtpChannel(null), false);
  });
});

describe("resolveLoginMfaAttempt (authenticator first)", () => {
  it("tries the authenticator first when enrolled and a delivered OTP is pending", () => {
    const attempt = resolveLoginMfaAttempt({ code: "123456", totpEnabled: true, hasDeliveredOtp: true });
    assert.equal(attempt.kind, "authenticator");
    assert.equal(attempt.tryAuthenticatorFirst, true);
    assert.equal(attempt.tryDeliveredOtp, true);
  });

  it("fails fast on a wrong authenticator code when no OTP was issued", () => {
    const attempt = resolveLoginMfaAttempt({ code: "123456", totpEnabled: true, hasDeliveredOtp: false });
    assert.equal(attempt.tryAuthenticatorFirst, true);
    assert.equal(attempt.tryDeliveredOtp, false);
  });

  it("uses the delivered OTP when no authenticator is enrolled", () => {
    const attempt = resolveLoginMfaAttempt({ code: "123456", totpEnabled: false, hasDeliveredOtp: true });
    assert.equal(attempt.kind, "delivered_otp");
    assert.equal(attempt.tryAuthenticatorFirst, false);
    assert.equal(attempt.tryDeliveredOtp, true);
  });

  it("routes recovery-code shaped input to recovery verification only", () => {
    const attempt = resolveLoginMfaAttempt({
      code: "0123-4567-89",
      totpEnabled: true,
      hasDeliveredOtp: true,
    });
    assert.equal(attempt.kind, "recovery");
    assert.equal(attempt.tryAuthenticatorFirst, false);
    assert.equal(attempt.tryDeliveredOtp, false);
  });

  it("rejects junk input with no attempt", () => {
    const attempt = resolveLoginMfaAttempt({ code: "hello", totpEnabled: true, hasDeliveredOtp: true });
    assert.equal(attempt.kind, "none");
    assert.equal(attempt.tryAuthenticatorFirst, false);
    assert.equal(attempt.tryDeliveredOtp, false);
  });
});
