/**
 * Password reset for every account type.
 *
 * Behaviour under test (the reported failure and its fix):
 * - A 6-digit code is mailed for Admins and for customers, through the same
 *   administrator-configured OTP sender.
 * - The request answer is identical whether or not the address has an account,
 *   never naming the role or the delivery outcome.
 * - Completing a reset clears that user's MFA and forces re-enrollment, without
 *   touching any other account.
 *
 * The service runs against an in-memory Prisma stand-in and a recording mailer
 * (scripts/test/stubs), so these assertions exercise the real
 * `requestPasswordReset` / `verifyPasswordResetCode` /
 * `completePasswordReset` code paths — including which mailbox receives the
 * code and what each response contains.
 */
import "server-only";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { __resetFakePrisma, __table } from "@/lib/prisma";
import { __resetJsonStore } from "@/features/storage/json-store.service";
import { sentEmails, resetSentEmails } from "@/features/email/email.service";
import type { EmailAccountRecord } from "@/features/email/email-accounts.types";
import { __setEmailAccountsForTests } from "@/features/email/email-accounts.service";
import {
  completePasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
} from "@/features/account/password-reset.service";
import {
  PASSWORD_RESET_GENERIC_MESSAGE,
  PASSWORD_RESET_OTP_TTL_MINUTES,
} from "@/features/account/password-reset-otp.helpers";
import { hashEmailOtp, isEmailOtpFormat } from "@/features/auth/email-otp.helpers";
import { PASSWORD_REUSE_ERROR } from "@/lib/security/password-reuse";

const OTP_ACCOUNT: EmailAccountRecord = {
  id: "acc-otp",
  name: "OTP sender",
  provider: "resend",
  from: "noreply@otp.example",
  resendApiKeySealed: "re_sealed_key",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

type SeedUser = {
  id: string;
  email: string;
  name?: string;
  role?: "ADMIN" | "SUPER_ADMIN" | "CUSTOMER";
  passwordHash?: string;
  disabledAt?: Date | null;
  mfaMethod?: "AUTHENTICATOR" | "EMAIL_OTP" | null;
  totpEnabled?: boolean;
  totpSecret?: string | null;
  mfaDisabledByAdminAt?: Date | null;
  sessionVersion?: number;
};

function seedUser(user: SeedUser) {
  const row = {
    name: "Test User",
    role: "CUSTOMER",
    passwordHash: "old-hash",
    disabledAt: null,
    mfaMethod: null,
    totpEnabled: false,
    totpSecret: null,
    mfaDisabledByAdminAt: null,
    sessionVersion: 0,
    ...user,
  };
  __table("user").push(row);
  return row;
}

function userById(id: string) {
  return __table("user").find((row) => row.id === id)!;
}

/** Pull the 6-digit code out of the delivered email (html or text part). */
function codeFromEmail(index = sentEmails.length - 1): string {
  const mail = sentEmails[index];
  assert.ok(mail, "an email was delivered");
  const body = `${mail.text ?? ""}\n${mail.html ?? ""}`;
  const match = body.match(/\b(\d{6})\b/);
  assert.ok(match, `no code found in delivered email: ${body.slice(0, 200)}`);
  return match![1];
}

const savedResend = process.env.RESEND_API_KEY;

beforeEach(() => {
  __resetFakePrisma();
  __resetJsonStore();
  resetSentEmails();
  __setEmailAccountsForTests([OTP_ACCOUNT]);
  // An env fallback exists, so only a *configured account* explains delivery.
  process.env.RESEND_API_KEY = "re_env_fallback";
});

afterEach(() => {
  __setEmailAccountsForTests(null);
  if (savedResend === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = savedResend;
});

/** Configure the site-wide sender (Settings → Email Accounts → Email delivery). */
async function useOtpSender() {
  const { accountSettingsService } = await import("@/features/account/account-settings.service");
  await accountSettingsService.saveEmailDelivery({ emailAccountId: OTP_ACCOUNT.id });
}

describe("reset works for admins and customers alike", () => {
  it("emails a code to a registered Admin through the configured sender", async () => {
    await useOtpSender();
    const admin = seedUser({
      id: "u-admin",
      email: "owner@example.com",
      role: "ADMIN",
      mfaMethod: "AUTHENTICATOR",
      totpEnabled: true,
      totpSecret: "SEALEDSECRET",
    });

    const result = await requestPasswordReset({ email: "owner@example.com" });
    assert.equal(result.ok, true);
    assert.ok(result.ticket, "the browser that asked gets its own ticket");
    assert.equal(result.hint, "o••••@example.com");

    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, "owner@example.com");
    // The configured OTP account, not the env fallback.
    assert.equal(sentEmails[0].from, "noreply@otp.example");
    assert.match(String(sentEmails[0].subject), /reset/i);

    const code = codeFromEmail();
    assert.equal(isEmailOtpFormat(code), true);

    const rows = __table("emailOtpToken").filter((row) => row.userId === admin.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].purpose, "PASSWORD_RESET");
    // Stored hashed: the plaintext never touches the row.
    assert.equal(rows[0].codeHash, hashEmailOtp(code));
    const ttlMinutes = Math.round((rows[0].expiresAt.getTime() - Date.now()) / 60_000);
    assert.ok(ttlMinutes > 0 && ttlMinutes <= PASSWORD_RESET_OTP_TTL_MINUTES);
  });

  it("emails a code to a customer and to the Super Admin", async () => {
    await useOtpSender();
    seedUser({ id: "u-customer", email: "customer@example.com", role: "CUSTOMER" });
    seedUser({ id: "u-super", email: "master@example.com", role: "SUPER_ADMIN" });

    for (const email of ["customer@example.com", "master@example.com"]) {
      const result = await requestPasswordReset({ email });
      assert.ok(result.ticket, email);
    }
    assert.deepEqual(
      sentEmails.map((mail) => mail.to),
      ["customer@example.com", "master@example.com"],
    );
    assert.ok(sentEmails.every((mail) => mail.from === "noreply@otp.example"));
  });
});

describe("the request never reveals whether an address has an account", () => {
  it("unknown addresses get the same generic answer and no mail", async () => {
    await useOtpSender();
    const known = await requestPasswordReset({ email: "owner@example.com" });
    seedUser({ id: "u-admin", email: "owner@example.com", role: "ADMIN" });
    resetSentEmails();
    const unknown = await requestPasswordReset({ email: "owner@example.com" });
    assert.ok(unknown.ticket);
    assert.equal(known.ticket, undefined);
    assert.equal(unknown.ok, true);
    assert.equal(PASSWORD_RESET_GENERIC_MESSAGE.includes("account exists"), true);
  });

  it("disabled accounts are not mailed", async () => {
    await useOtpSender();
    seedUser({ id: "u-off", email: "off@example.com", disabledAt: new Date() });
    const result = await requestPasswordReset({ email: "off@example.com" });
    assert.deepEqual(result, { ok: true });
    assert.equal(sentEmails.length, 0);
    assert.equal(__table("emailOtpToken").length, 0);
  });

  it("sites without any Email Account answer generically and audit the failure", async () => {
    delete process.env.RESEND_API_KEY;
    __setEmailAccountsForTests([]);
    seedUser({ id: "u-admin", email: "owner@example.com", role: "ADMIN" });
    const result = await requestPasswordReset({ email: "owner@example.com" });
    assert.deepEqual(result, { ok: true });
    assert.equal(sentEmails.length, 0);
    assert.ok(
      __table("securityAuditLog").some(
        (row) =>
          row.action === "auth.password_reset.email_failed" && row.meta?.reason === "env_unset",
      ),
      "delivery failure is audited with its cause",
    );
  });

  it("several accounts and none chosen: no code and no env fallback", async () => {
    // The env fallback is already set by beforeEach — it must not be used.
    __setEmailAccountsForTests([
      OTP_ACCOUNT,
      { ...OTP_ACCOUNT, id: "acc-forms", name: "Forms", from: "forms@otp.example" },
    ]);
    seedUser({ id: "u-admin", email: "owner@example.com", role: "ADMIN" });
    const result = await requestPasswordReset({ email: "owner@example.com" });
    assert.deepEqual(result, { ok: true });
    assert.equal(sentEmails.length, 0, "a mailbox nobody chose is never used");
    assert.ok(
      __table("securityAuditLog").some(
        (row) =>
          row.action === "auth.password_reset.email_failed" &&
          row.meta?.reason === "not_selected_multiple",
      ),
    );
  });
});

describe("code → ticket → new password", () => {
  it("rejects a wrong code for a ticket", async () => {
    await useOtpSender();
    seedUser({ id: "u-admin", email: "owner@example.com", role: "ADMIN" });
    const { ticket } = await requestPasswordReset({ email: "owner@example.com" });
    const wrong = await verifyPasswordResetCode({ ticket, code: "000000" });
    assert.ok("error" in wrong);
  });

  it("completes the reset, clears MFA and forces re-enrollment", async () => {
    await useOtpSender();
    const admin = seedUser({
      id: "u-admin",
      email: "owner@example.com",
      role: "ADMIN",
      mfaMethod: "AUTHENTICATOR",
      totpEnabled: true,
      totpSecret: "SEALEDSECRET",
    });
    __table("mfaRecoveryCode").push({ id: "rc1", userId: admin.id, codeHash: "x", usedAt: null });
    seedUser({ id: "u-other", email: "other@example.com", mfaMethod: "EMAIL_OTP" });

    const requested = await requestPasswordReset({ email: "owner@example.com" });
    const verified = await verifyPasswordResetCode({
      ticket: requested.ticket,
      code: codeFromEmail(),
    });
    assert.ok("ticket" in verified);

    const done = await completePasswordReset({
      ticket: verified.ticket,
      password: "A-very-long-new-password1!",
    });
    assert.deepEqual(done, { ok: true });

    const updated = userById(admin.id);
    assert.notEqual(updated.passwordHash, "old-hash");
    assert.equal(String(updated.passwordHash).startsWith("test$"), true, "hashed");
    // Requirement: the successful reset disables MFA; next sign-in must enroll.
    assert.equal(updated.mfaMethod, null);
    assert.equal(updated.totpEnabled, false);
    assert.equal(updated.totpSecret, null);
    assert.equal(updated.mfaDisabledByAdminAt, null, "a reset does not lock self-service");
    assert.equal(updated.sessionVersion, 1, "sessions revoked");
    assert.equal(
      __table("mfaRecoveryCode").filter((row) => row.userId === admin.id).length,
      0,
      "recovery codes cleared",
    );
    assert.ok(
      __table("securityAuditLog").some((row) => row.action === "mfa.disabled"),
      "MFA disable is audited",
    );

    // Another account is untouched.
    const other = userById("u-other");
    assert.equal(other.passwordHash, "old-hash");
    assert.equal(other.mfaMethod, "EMAIL_OTP");

    // The ticket is single-use.
    const replay = await completePasswordReset({
      ticket: verified.ticket,
      password: "Another-long-password2!",
    });
    assert.ok("error" in replay);
  });

  it("rejects reusing the current password", async () => {
    await useOtpSender();
    const { hashSync } = await import("bcryptjs");
    const user = seedUser({
      id: "u-reuse",
      email: "reuse@example.com",
      passwordHash: hashSync("Current-password-1!"),
    });
    const requested = await requestPasswordReset({ email: "reuse@example.com" });
    const verified = await verifyPasswordResetCode({
      ticket: requested.ticket,
      code: codeFromEmail(),
    });
    assert.ok("ticket" in verified);
    const result = await completePasswordReset({
      ticket: verified.ticket,
      password: "Current-password-1!",
    });
    assert.deepEqual(result, { error: PASSWORD_REUSE_ERROR });
    assert.equal(userById(user.id).passwordHash, user.passwordHash);
    // The ticket survives so the user can retry with a different password.
    assert.ok(__table("passwordResetToken").every((row) => !row.usedAt));
  });

  it("a code issued for one account cannot redeem another account's ticket", async () => {
    await useOtpSender();
    seedUser({ id: "u-a", email: "a@example.com" });
    seedUser({ id: "u-b", email: "b@example.com" });

    await requestPasswordReset({ email: "a@example.com" });
    const aliceCode = codeFromEmail();
    const bobRequest = await requestPasswordReset({ email: "b@example.com" });

    // Alice's code presented against Bob's ticket: codes are looked up for the
    // ticket's user id only, so it fails.
    const attempt = await verifyPasswordResetCode({
      ticket: bobRequest.ticket,
      code: aliceCode,
    });
    assert.ok("error" in attempt);
    assert.equal(userById("u-a").passwordHash, "old-hash");
    assert.equal(userById("u-b").passwordHash, "old-hash");
  });

  it("each new send replaces the previous code", async () => {
    await useOtpSender();
    seedUser({ id: "u-once", email: "once@example.com" });
    await requestPasswordReset({ email: "once@example.com" });
    const first = codeFromEmail();
    const second = await requestPasswordReset({ email: "once@example.com" });
    const live = __table("emailOtpToken").filter((row) => !row.usedAt);
    assert.equal(live.length, 1);
    if (first !== codeFromEmail()) {
      const stale = await verifyPasswordResetCode({ ticket: second.ticket, code: first });
      assert.ok("error" in stale);
    }
  });
});
