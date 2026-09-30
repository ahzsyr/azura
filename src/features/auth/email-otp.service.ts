import "server-only";

import type { EmailOtpPurpose } from "@prisma/client";
import type { EmailProviderConfig } from "@/features/email/email-accounts.types";
import { prisma } from "@/lib/prisma";
import { sendEmail, resolveSendProviderConfig } from "@/features/email/email.service";
import { resolveEmailProviderConfig } from "@/features/email/email-accounts.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import {
  emailOtpExpiresAt,
  generateEmailOtpCode,
  hashEmailOtp,
  isEmailOtpFormat,
  type EmailOtpPurposeValue,
} from "@/features/auth/email-otp.helpers";

const ISSUE_LIMIT = 5;
const ISSUE_WINDOW_MS = 15 * 60 * 1000;
const CONSUME_LIMIT = 10;
const CONSUME_WINDOW_MS = 15 * 60 * 1000;

/**
 * Issue a 6-digit email OTP (hashed at rest). Never logs or returns the plaintext code.
 */
export async function issueEmailOtp(input: {
  userId: string;
  purpose: EmailOtpPurposeValue;
  toEmail?: string;
  emailAccountId?: string | null;
  /** When set, used as-is (admin MFA path). */
  providerConfig?: EmailProviderConfig | null;
  /**
   * When false, do not fall back to env Resend/SMTP or portal customer accounts.
   * Admin login OTP must use only the Master-Admin-selected Email Account.
   */
  allowEnvFallback?: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { error: "User not found" };

  const rl = await enforceRateLimit({
    key: `email-otp:issue:${user.id}:${input.purpose}`,
    limit: ISSUE_LIMIT,
    windowMs: ISSUE_WINDOW_MS,
  });
  if (!rl.allowed) return { ok: true };

  const toEmail = (input.toEmail ?? user.email).trim().toLowerCase();
  const code = generateEmailOtpCode();
  const codeHash = hashEmailOtp(code);
  const expiresAt = emailOtpExpiresAt();
  const purpose = input.purpose as EmailOtpPurpose;

  await prisma.emailOtpToken.deleteMany({
    where: { userId: user.id, purpose, usedAt: null },
  });
  await prisma.emailOtpToken.create({
    data: { userId: user.id, purpose, codeHash, expiresAt },
  });

  const settings = await accountSettingsService.get();
  const allowEnvFallback = input.allowEnvFallback !== false && input.purpose !== "ADMIN_LOGIN";

  let providerConfig = input.providerConfig ?? null;
  if (!providerConfig) {
    if (input.purpose === "ADMIN_LOGIN") {
      const accountId = input.emailAccountId?.trim() || null;
      providerConfig = accountId ? await resolveEmailProviderConfig(accountId) : null;
    } else {
      const accountId =
        input.emailAccountId ??
        settings.emailVerification.emailAccountId ??
        settings.passwordReset.emailAccountId ??
        null;
      providerConfig = allowEnvFallback
        ? await resolveSendProviderConfig(accountId)
        : accountId
          ? await resolveEmailProviderConfig(accountId)
          : null;
    }
  }

  const fromName =
    settings.emailVerification.fromName?.trim() ||
    settings.passwordReset.fromName?.trim() ||
    undefined;

  const subject =
    input.purpose === "ADMIN_LOGIN"
      ? "Your admin sign-in code"
      : settings.emailVerification.emailSubject || "Verify your email";
  const heading =
    input.purpose === "ADMIN_LOGIN"
      ? "Admin verification code"
      : settings.emailVerification.emailHeading || "Confirm your email";
  const bodyLines =
    input.purpose === "ADMIN_LOGIN"
      ? `Hello ${user.name},\n\nYour one-time sign-in code expires in 5 minutes.\n\nEnter this code to continue.`
      : `Hello ${user.name},\n\nYour verification code expires in 5 minutes.\n\nEnter the code on the verification page to activate your account.`;

  const html = `<div style="font-family:sans-serif;line-height:1.5"><h2>${heading}</h2><p style="font-size:24px;letter-spacing:4px;font-weight:bold">${code}</p><pre style="white-space:pre-wrap;font-family:inherit">${bodyLines}</pre></div>`;
  const text = `${heading}\n\nCode: ${code}\n\n${bodyLines}`;

  const result = await sendEmail({
    to: toEmail,
    subject,
    html,
    text,
    providerConfig,
    fromName,
  });

  if (!result.sent) {
    await writeSecurityAuditLog({
      action: "auth.email_otp.send_failed",
      actorId: user.id,
      actorRole: user.role,
      meta: { purpose: input.purpose, errorCode: result.errorCode ?? "unknown" },
    });
  } else {
    await writeSecurityAuditLog({
      action: "auth.email_otp.sent",
      actorId: user.id,
      actorRole: user.role,
      meta: { purpose: input.purpose },
    });
  }

  return { ok: true };
}

export async function consumeEmailOtp(input: {
  userId: string;
  purpose: EmailOtpPurposeValue;
  code: string;
}): Promise<{ ok: true } | { error: string }> {
  const code = input.code.trim();
  if (!isEmailOtpFormat(code)) {
    return { error: "Invalid or expired code" };
  }

  const rl = await enforceRateLimit({
    key: `email-otp:consume:${input.userId}:${input.purpose}`,
    limit: CONSUME_LIMIT,
    windowMs: CONSUME_WINDOW_MS,
  });
  if (!rl.allowed) {
    return { error: "Too many attempts. Try again later." };
  }

  const codeHash = hashEmailOtp(code);
  const purpose = input.purpose as EmailOtpPurpose;
  const record = await prisma.emailOtpToken.findFirst({
    where: {
      userId: input.userId,
      purpose,
      codeHash,
      usedAt: null,
    },
  });

  if (!record || record.expiresAt < new Date()) {
    await writeSecurityAuditLog({
      action: "auth.email_otp.failure",
      actorId: input.userId,
      meta: { purpose: input.purpose, reason: "INVALID_OR_EXPIRED" },
    });
    return { error: "Invalid or expired code" };
  }

  await prisma.emailOtpToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  await prisma.emailOtpToken.deleteMany({
    where: { userId: input.userId, purpose, usedAt: null },
  });

  await writeSecurityAuditLog({
    action: "auth.email_otp.consumed",
    actorId: input.userId,
    meta: { purpose: input.purpose },
  });

  return { ok: true };
}

/** Signup verify: find user by email, consume OTP, set emailVerifiedAt. */
export async function consumeSignupEmailOtp(input: {
  email: string;
  code: string;
}): Promise<{ ok: true } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "CUSTOMER") {
    return { error: "Invalid or expired code" };
  }
  const consumed = await consumeEmailOtp({
    userId: user.id,
    purpose: "SIGNUP_VERIFY",
    code: input.code,
  });
  if ("error" in consumed) return consumed;

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });
  return { ok: true };
}
