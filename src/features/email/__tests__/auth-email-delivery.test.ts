/**
 * Authentication email delivery — the reported failure and its fix.
 *
 * Reported: no OTP arrived for sign-in or password reset; "Email me a code"
 * and "Reset code" did nothing; the sign-in screen said "Your sign-in session
 * expired"; the sender was configured in an admin-only place even though a
 * test email from the Email Account worked.
 *
 * Behaviours pinned here (they all run against the real resolvers/services,
 * an in-memory Prisma stand-in and a recording mailer):
 * - every code (sign-in, reset, signup) leaves through the one Email Account
 *   saved as Email delivery — from the same `From` address the test uses;
 * - the sender is a site setting, not a privilege: an Admin's choice applies
 *   to customers and the Super Admin too, and it is not tied to who saved it;
 * - a legacy "Admin account → Email delivery" selection is honoured on upgrade;
 * - a single sendable account is used without an explicit selection;
 * - with several accounts and no choice, nothing is sent and the failure is
 *   reported instead of the code vanishing;
 * - a code is never sent from a mailbox nobody configured (env fallback is
 *   for sites with no account at all).
 */
import "server-only";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { __resetFakePrisma, __table } from "@/lib/prisma";
import { __resetJsonStore } from "@/features/storage/json-store.service";
import { sentEmails, resetSentEmails } from "@/features/email/email.service";
import type { EmailAccountRecord } from "@/features/email/email-accounts.types";
import { __setEmailAccountsForTests } from "@/features/email/email-accounts.service";

const FROM = "noreply@brt-me.com";

function account(id: string, overrides: Partial<EmailAccountRecord> = {}): EmailAccountRecord {
  const now = new Date().toISOString();
  return {
    id,
    name: id,
    provider: "smtp",
    from: FROM,
    smtp: { host: "smtp.hostinger.com", port: 465, secure: true, userSealed: "user", passSealed: "pass" },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const OTP_ACCOUNT = account("acc-otp");
const FORM_ACCOUNT = account("acc-forms", { from: "forms@brt-me.com" });

function seedUser(input: {
  id: string;
  email: string;
  role?: "ADMIN" | "SUPER_ADMIN" | "CUSTOMER";
  mfaMethod?: "AUTHENTICATOR" | "EMAIL_OTP" | null;
  totpEnabled?: boolean;
}) {
  const row = {
    name: "Test User",
    role: "CUSTOMER",
    passwordHash: "test$hash",
    disabledAt: null,
    mfaMethod: null,
    totpEnabled: false,
    totpSecret: null,
    mfaDisabledByAdminAt: null,
    sessionVersion: 0,
    ...input,
  };
  __table("user").push(row);
  return row;
}

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
  // Site-wide sender selection starts empty, like a fresh install.
  __setEmailAccountsForTests([OTP_ACCOUNT, FORM_ACCOUNT]);
  // An env fallback exists: if a code goes out from it, that is the bug.
  process.env.RESEND_API_KEY = "re_env_fallback";
});

afterEach(() => {
  __setEmailAccountsForTests(null);
  if (savedResend === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = savedResend;
});

async function saveDelivery(emailAccountId: string, fromName?: string) {
  const { accountSettingsService } = await import("@/features/account/account-settings.service");
  await accountSettingsService.saveEmailDelivery({ emailAccountId, fromName });
}

describe("sign-in codes use the configured Email delivery sender", () => {
  it("emails the sign-in code from that account to the user — any role", async () => {
    await saveDelivery(OTP_ACCOUNT.id);
    const { issueAdminLoginOtp } = await import("@/features/auth/admin-login-otp.service");
    seedUser({ id: "u-admin", email: "admin@example.com", role: "ADMIN" });
    seedUser({ id: "u-customer", email: "customer@example.com", mfaMethod: "EMAIL_OTP" });

    for (const user of [
      { id: "u-admin", name: "Admin", role: "ADMIN", email: "admin@example.com", phone: null },
      {
        id: "u-customer",
        name: "Customer",
        role: "CUSTOMER",
        email: "customer@example.com",
        phone: null,
      },
    ]) {
      const result = await issueAdminLoginOtp({ user, channel: "email" });
      assert.deepEqual(result, { ok: true, sentTo: user.email });
    }

    assert.deepEqual(
      sentEmails.map((mail) => mail.to).sort(),
      ["admin@example.com", "customer@example.com"],
    );
    assert.ok(
      sentEmails.every((mail) => mail.from === FROM),
      "every code leaves from the configured account, not the env fallback",
    );
    // A 6-digit code is in each message and stored hashed for the right user.
    assert.match(codeFromEmail(0), /^\d{6}$/);
    assert.equal(__table("emailOtpToken").filter((row) => row.purpose === "ADMIN_LOGIN").length, 2);
  });

  it("the issued code verifies", async () => {
    await saveDelivery(OTP_ACCOUNT.id);
    const { issueAdminLoginOtp, consumeAdminLoginOtp } = await import(
      "@/features/auth/admin-login-otp.service"
    );
    seedUser({ id: "u-admin", email: "admin@example.com", role: "ADMIN" });
    await issueAdminLoginOtp({
      user: { id: "u-admin", name: "Admin", role: "ADMIN", email: "admin@example.com", phone: null },
      channel: "email",
    });
    const consumed = await consumeAdminLoginOtp("u-admin", codeFromEmail());
    assert.ok("ok" in consumed);
  });

  it("the email-code switch reports available without any Super-Admin-only step", async () => {
    await saveDelivery(OTP_ACCOUNT.id);
    const { isAdminEmailMfaConfigured } = await import("@/features/auth/admin-auth-delivery");
    assert.equal(await isAdminEmailMfaConfigured(), true);
  });
});

describe("the sender is a site setting, not a personal privilege", () => {
  it("a selection saved by an Admin applies to customers and the Super Admin", async () => {
    // Anyone with admin access can save it — the same service the action calls.
    await saveDelivery(OTP_ACCOUNT.id, "BRT");
    const { getAuthEmailDeliveryState } = await import("@/features/email/auth-email-sender");
    const state = await getAuthEmailDeliveryState();
    assert.equal(state.account?.id, OTP_ACCOUNT.id);
    assert.equal(state.reason, "ready");

    // And it is used by a customer's reset, not just by admins.
    const { requestPasswordReset } = await import("@/features/account/password-reset.service");
    seedUser({ id: "u-customer", email: "customer@example.com" });
    await requestPasswordReset({ email: "customer@example.com" });
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].from, FROM);
  });

  it("carries the From name saved with it", async () => {
    await saveDelivery(OTP_ACCOUNT.id, "BRT Support");
    const { resolveAuthEmailSender } = await import("@/features/email/auth-email-sender");
    const sender = await resolveAuthEmailSender("PASSWORD_RESET");
    assert.equal(sender.fromName, "BRT Support");
    assert.equal(sender.from, FROM);
  });
});

describe("upgrades keep sending from the mailbox that was already chosen", () => {
  it("a legacy Admin-account Email delivery selection is honoured", async () => {
    const { jsonStoreService } = await import("@/features/storage/json-store.service");
    await jsonStoreService.set("account", "settings", {
      passwordReset: {},
      emailVerification: {},
      adminAuth: { otpEmailAccountId: OTP_ACCOUNT.id },
    });
    const { resolveAuthEmailSender } = await import("@/features/email/auth-email-sender");
    const sender = await resolveAuthEmailSender("PASSWORD_RESET");
    assert.equal(sender.accountId, OTP_ACCOUNT.id);
    assert.equal(sender.source, "account");
  });

  it("a single sendable account needs no explicit selection", async () => {
    __setEmailAccountsForTests([OTP_ACCOUNT]);
    const { resolveAuthEmailSender } = await import("@/features/email/auth-email-sender");
    const sender = await resolveAuthEmailSender("SIGNUP_VERIFY");
    assert.equal(sender.accountId, OTP_ACCOUNT.id);
  });
});

describe("no silent wrong mailbox, no silent drop", () => {
  it("several accounts and no choice: nothing is sent and the reason is reported", async () => {
    const { getAuthEmailDeliveryState } = await import("@/features/email/auth-email-sender");
    const state = await getAuthEmailDeliveryState();
    assert.equal(state.account, null);
    assert.equal(state.reason, "not_selected_multiple");

    seedUser({ id: "u-customer", email: "customer@example.com" });
    const { requestPasswordReset } = await import("@/features/account/password-reset.service");
    const result = await requestPasswordReset({ email: "customer@example.com" });
    assert.equal(sentEmails.length, 0, "no code leaves from a mailbox nobody chose");
    assert.equal(result.ticket, undefined);
    assert.ok(
      __table("securityAuditLog").some(
        (row) =>
          row.action === "auth.password_reset.email_failed" &&
          row.meta?.reason === "not_selected_multiple",
      ),
      "the cause is audited",
    );
  });

  it("a selected but incomplete account is an error, not a fallback to env", async () => {
    __setEmailAccountsForTests([
      { ...OTP_ACCOUNT, smtp: { host: "smtp.hostinger.com", port: 465, secure: true } },
      FORM_ACCOUNT,
    ]);
    await saveDelivery(OTP_ACCOUNT.id);
    const { resolveAuthEmailSender } = await import("@/features/email/auth-email-sender");
    const sender = await resolveAuthEmailSender("PASSWORD_RESET");
    assert.equal(sender.providerConfig, null);
    assert.equal(sender.source, "none");
    assert.equal(sender.reason, "selected_incomplete");
  });

  it("a selected account that no longer exists is reported", async () => {
    await saveDelivery("acc-deleted");
    const { getAuthEmailDeliveryState } = await import("@/features/email/auth-email-sender");
    const state = await getAuthEmailDeliveryState();
    assert.equal(state.reason, "selected_missing");
  });
});

describe("signup verification uses the same sender", () => {
  it("issues the signup code through Email delivery, not a per-flow account", async () => {
    await saveDelivery(OTP_ACCOUNT.id);
    const { issueEmailOtp } = await import("@/features/auth/email-otp.service");
    seedUser({ id: "u-new", email: "new@example.com" });
    const result = await issueEmailOtp({
      userId: "u-new",
      purpose: "SIGNUP_VERIFY",
      toEmail: "new@example.com",
      // Per-flow selector is ignored on purpose.
      emailAccountId: FORM_ACCOUNT.id,
    });
    assert.deepEqual(result, { ok: true });
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].from, FROM);
  });

  it("a send failure leaves no live code and is audited with its cause", async () => {
    // No account, no env fallback: genuinely unconfigured.
    delete process.env.RESEND_API_KEY;
    __setEmailAccountsForTests([]);
    const { issueEmailOtp } = await import("@/features/auth/email-otp.service");
    seedUser({ id: "u-new", email: "new@example.com" });
    const result = await issueEmailOtp({ userId: "u-new", purpose: "SIGNUP_VERIFY" });
    assert.ok("error" in result);
    assert.equal(__table("emailOtpToken").length, 0);
    assert.ok(
      __table("securityAuditLog").some(
        (row) => row.action === "auth.email_otp.send_failed" && row.meta?.reason === "env_unset",
      ),
    );
  });
});
