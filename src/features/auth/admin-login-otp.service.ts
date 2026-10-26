import "server-only";

import type { EmailOtpPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import {
  EMAIL_OTP_TTL_MS,
  emailOtpExpiresAt,
  generateEmailOtpCode,
  hashEmailOtp,
  isEmailOtpFormat,
  type EmailOtpPurposeValue,
} from "@/features/auth/email-otp.helpers";
import {
  isLoginOtpChannelConfigured,
  isUsablePhoneNumber,
  getLoginOtpTransport,
} from "@/features/auth/login-otp-delivery";

const ISSUE_LIMIT = 5;
const ISSUE_WINDOW_MS = 15 * 60 * 1000;
const CONSUME_LIMIT = 10;
const CONSUME_WINDOW_MS = 15 * 60 * 1000;

const EXPIRES_IN_MINUTES = Math.round(EMAIL_OTP_TTL_MS / 60000);

/** Send the admin sign-in code by email using the Master Admin's OTP account. */
export async function sendAdminLoginOtpEmail(input: {
  userId: string;
  user: { name: string; role: string };
  toEmail: string;
  code: string;
  providerConfig: Awaited<
    ReturnType<typeof import("@/features/auth/admin-auth-delivery").resolveAdminOtpProviderConfig>
  >;
}): Promise<{ sent: boolean; errorCode?: string }> {
  const { sendEmail } = await import("@/features/email/email.service");
  const { accountSettingsService } = await import("@/features/account/account-settings.service");
  const settings = await accountSettingsService.get();
  const fromName =
    settings.emailVerification.fromName?.trim() || settings.passwordReset.fromName?.trim() || undefined;

  const subject = "Your admin sign-in code";
  const heading = "Admin verification code";
  const bodyLines = `Hello ${input.user.name},\n\nYour one-time sign-in code expires in ${EXPIRES_IN_MINUTES} minutes.\n\nEnter this code to continue.`;

  const { renderTransactionalEmail } = await import("@/features/email/react-templates");
  const rendered = await renderTransactionalEmail({
    preview: subject,
    heading,
    code: input.code,
    paragraphs: [bodyLines],
  });

  const result = await sendEmail({
    to: input.toEmail.trim().toLowerCase(),
    subject,
    html: rendered.html,
    text: rendered.text ?? `${heading}\n\nCode: ${input.code}\n\n${bodyLines}`,
    providerConfig: input.providerConfig,
    fromName,
  });

  if (!result.sent) {
    await writeSecurityAuditLog({
      action: "auth.email_otp.send_failed",
      actorId: input.userId,
      actorRole: input.user.role,
      meta: { purpose: "ADMIN_LOGIN", errorCode: result.errorCode ?? "unknown" },
    });
    return { sent: false, errorCode: result.errorCode ?? "unknown" };
  }
  await writeSecurityAuditLog({
    action: "auth.email_otp.sent",
    actorId: input.userId,
    actorRole: input.user.role,
    meta: { purpose: "ADMIN_LOGIN" },
  });
  return { sent: true };
}

export type AdminLoginOtpDeliveryResult =
  | { ok: true; sentTo: string }
  | { ok: false; reason: "rate_limited" | "not_configured" | "invalid_recipient" | "delivery_failed" };

export type AdminLoginOtpUser = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
};

/**
 * Issue a fresh `ADMIN_LOGIN` code bound to the chosen channel and deliver it.
 *
 * At most one code is valid at a time: issuing replaces any unused token, so
 * "resend on email" invalidates an outstanding WhatsApp code. That prevents an
 * attacker-triggered code from staying usable after the owner asked for their
 * own.
 */
export async function issueAdminLoginOtp(input: {
  user: AdminLoginOtpUser;
  channel: "email" | "sms" | "whatsapp";
}): Promise<AdminLoginOtpDeliveryResult> {
  const { user, channel } = input;

  // Email reuses the Master Admin's OTP Email Account; phone channels need a
  // wired transport. Resolve both up front so phone-only deployments still work.
  const { isAdminEmailMfaConfigured, resolveAdminOtpProviderConfig } = await import(
    "@/features/auth/admin-auth-delivery"
  );
  const emailAvailable = await isAdminEmailMfaConfigured().catch(() => false);
  const emailProviderConfig = emailAvailable
    ? await resolveAdminOtpProviderConfig().catch(() => null)
    : null;

  const rl = await enforceRateLimit({
    key: `admin-login-otp:issue:${user.id}:${channel}`,
    limit: ISSUE_LIMIT,
    windowMs: ISSUE_WINDOW_MS,
  });
  if (!rl.allowed) return { ok: false, reason: "rate_limited" };

  const configured = await isLoginOtpChannelConfigured(channel, {
    emailConfigured: emailAvailable && emailProviderConfig != null,
  });
  if (!configured) return { ok: false, reason: "not_configured" };

  let sentTo: string;
  if (channel === "email") {
    sentTo = user.email;
  } else {
    if (!isUsablePhoneNumber(user.phone)) return { ok: false, reason: "invalid_recipient" };
    sentTo = user.phone!.trim();
  }

  const code = generateEmailOtpCode();
  const codeHash = hashEmailOtp(code);
  const purpose = "ADMIN_LOGIN" as EmailOtpPurpose;

  // Invalidate previously issued codes before creating the new one.
  await prisma.emailOtpToken.deleteMany({
    where: { userId: user.id, purpose, usedAt: null },
  });
  await prisma.emailOtpToken.create({
    data: { userId: user.id, purpose, channel, codeHash, expiresAt: emailOtpExpiresAt() },
  });

  let delivery: { sent: boolean; errorCode?: string };
  try {
    if (channel === "email") {
      delivery = await sendAdminLoginOtpEmail({
        userId: user.id,
        user,
        toEmail: sentTo,
        code,
        providerConfig: emailProviderConfig,
      });
    } else {
      const transport = getLoginOtpTransport(channel);
      if (!transport) throw new Error("transport missing");
      delivery = await transport.send({
        channel,
        to: sentTo,
        code,
        expiresInMinutes: EXPIRES_IN_MINUTES,
      });
    }
  } catch (error) {
    console.error(
      "[auth] login OTP delivery threw",
      channel,
      error instanceof Error ? error.name : "unknown",
    );
    delivery = { sent: false, errorCode: "transport_error" };
  }

  if (!delivery.sent) {
    // Never leave a live token the user cannot read.
    await prisma.emailOtpToken.deleteMany({
      where: { userId: user.id, purpose, usedAt: null },
    });
    await writeSecurityAuditLog({
      action: "auth.mfa.delivery_failed",
      actorId: user.id,
      actorRole: user.role,
      meta: { channel, errorCode: delivery.errorCode ?? "unknown" },
    });
    return { ok: false, reason: "delivery_failed" };
  }

  await writeSecurityAuditLog({
    action: "auth.mfa.challenge",
    actorId: user.id,
    actorRole: user.role,
    meta: { channel },
  });
  return { ok: true, sentTo };
}

/** Whether any unexpired `ADMIN_LOGIN` OTP exists (so a 6-digit code can match one). */
export async function hasPendingAdminLoginOtp(userId: string): Promise<boolean> {
  const count = await prisma.emailOtpToken.count({
    where: {
      userId,
      purpose: "ADMIN_LOGIN" as EmailOtpPurpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  return count > 0;
}

/**
 * Check a delivered login OTP. Stored digests are channel-agnostic: a correct
 * code works regardless of which channel displayed it, and using it revokes
 * every sibling token so it cannot be replayed.
 */
export async function consumeAdminLoginOtp(
  userId: string,
  code: string,
): Promise<{ ok: true; channel: string } | { error: string }> {
  const trimmed = code.trim();
  if (!isEmailOtpFormat(trimmed)) return { error: "Invalid or expired code" };

  const rl = await enforceRateLimit({
    key: `email-otp:consume:${userId}:ADMIN_LOGIN`,
    limit: CONSUME_LIMIT,
    windowMs: CONSUME_WINDOW_MS,
  });
  if (!rl.allowed) return { error: "Too many attempts. Try again later." };

  const codeHash = hashEmailOtp(trimmed);
  const purpose = "ADMIN_LOGIN" as EmailOtpPurpose;
  const record = await prisma.emailOtpToken.findFirst({
    where: { userId, purpose, codeHash, usedAt: null },
  });

  if (!record || record.expiresAt < new Date()) {
    await writeSecurityAuditLog({
      action: "auth.email_otp.failure",
      actorId: userId,
      meta: { purpose: "ADMIN_LOGIN", reason: "INVALID_OR_EXPIRED" },
    });
    return { error: "Invalid or expired code" };
  }

  await prisma.emailOtpToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  await prisma.emailOtpToken.deleteMany({ where: { userId, purpose, usedAt: null } });

  await writeSecurityAuditLog({
    action: "auth.email_otp.consumed",
    actorId: userId,
    meta: { purpose: "ADMIN_LOGIN", channel: record.channel },
  });

  return { ok: true, channel: record.channel };
}

/** Backwards-compatible wrapper used by non-login flows. */
export type { EmailOtpPurposeValue };
