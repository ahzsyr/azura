import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldMintChallengeAfterPassword } from "@/features/auth/mfa-challenge-cookie.helpers";
import {
  isEmailOtpChannelColumnError,
  isEmailOtpPurposeEnumError,
} from "@/features/auth/email-otp-token.helpers";
import {
  PASSWORD_RESET_GENERIC_MESSAGE,
  PASSWORD_RESET_NO_DELIVERY_CONFIRMATION,
  passwordResetVerifyDescription,
} from "@/features/account/password-reset-otp.helpers";

describe("MFA challenge cookie after password", () => {
  it("mints when the cookie is missing so Email me a code can run", () => {
    assert.equal(shouldMintChallengeAfterPassword(false), true);
  });

  it("does not remint when the challenge is already valid", () => {
    assert.equal(shouldMintChallengeAfterPassword(true), false);
  });
});

describe("password reset verify copy", () => {
  it("keeps anti-enumeration wording when no ticket was issued", () => {
    const copy = passwordResetVerifyDescription({ hasTicket: false });
    assert.equal(copy, PASSWORD_RESET_NO_DELIVERY_CONFIRMATION);
    assert.equal(copy.includes("account exists"), false);
    assert.equal(PASSWORD_RESET_GENERIC_MESSAGE.includes("account exists"), true);
  });

  it("confirms delivery when a ticket is present", () => {
    const copy = passwordResetVerifyDescription({
      hasTicket: true,
      hint: "a••••@example.com",
    });
    assert.match(copy, /We emailed a 6-digit code to a••••@example\.com/);
    assert.match(copy, /10 minutes/);
  });

  it("confirms delivery without a hint when ticket exists", () => {
    const copy = passwordResetVerifyDescription({ hasTicket: true, hint: "" });
    assert.equal(copy.startsWith("We emailed a 6-digit code."), true);
  });
});

describe("EmailOtpToken schema errors", () => {
  it("detects a missing PASSWORD_RESET enum value", () => {
    assert.equal(
      isEmailOtpPurposeEnumError(new Error("Data truncated for column 'purpose' at row 1")),
      true,
    );
  });

  it("detects a missing channel column", () => {
    assert.equal(
      isEmailOtpChannelColumnError(new Error("Unknown column 'channel' in 'field list'")),
      true,
    );
    assert.equal(isEmailOtpChannelColumnError({ code: "P2022", message: "x" }), true);
  });
});
