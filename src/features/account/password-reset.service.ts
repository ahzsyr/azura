import "server-only";

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { EmailOtpPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/features/email/email.service";
import { resolveAuthEmailSender } from "@/features/email/auth-email-sender";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { clearUserMfa } from "@/features/auth/mfa-totp.service";
import { generateEmailOtpCode, hashEmailOtp } from "@/features/auth/email-otp.helpers";
import {
  PASSWORD_RESET_OTP_TTL_MINUTES,
  PASSWORD_RESET_OTP_TTL_MS,
  PASSWORD_RESET_TICKET_TTL_MS,
  maskResetHint,
  normalizePasswordResetCode,
} from "@/features/account/password-reset-otp.helpers";
import { enforceRateLimit } from "@/lib/rate-limit";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { bumpUserSessionVersion } from "@/lib/session-version";
import { PASSWORD_REUSE_ERROR, isPasswordReused } from "@/lib/security/password-reuse.server";

/**
 * Password reset for every eligible account — customers, Admins and the Super
 * Admin alike — without an account-enumeration oracle.
 *
 * Flow
 * 1. `requestPasswordReset(email)` mails a 6-digit code to the address and
 *    always answers the same way, whether or not an account exists, is
 *    disabled, or delivery failed.
 * 2. `verifyPasswordResetCode({ ticket, code })` exchanges the code for a
 *    short-lived, single-use **ticket**. The client never learns the user id.
 * 3. `completePasswordReset({ ticket, password })` sets the password, revokes
 *    sessions and clears the user's MFA enrollment so the next sign-in has to
 *    enroll a fresh factor.
 *
 * Codes and tickets are bound to one user id each, so a reset can only ever
 * affect the account the code was mailed to.
 */

const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const VERIFY_LIMIT = 10;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;
const COMPLETE_LIMIT = 10;
const COMPLETE_WINDOW_MS = 15 * 60 * 1000;

/** The legacy link-based tokens stay redeemable so in-flight links keep working. */
export const PASSWORD_RESET_TTL_MS = 5 * 60 * 1000;
export const PASSWORD_RESET_TTL_MINUTES = 5;

const RESET_OTP_PURPOSE = "PASSWORD_RESET" as EmailOtpPurpose;

export const RESET_TICKET_INVALID =
  "This reset session is invalid or has expired. Request a new code.";
export const RESET_CODE_INVALID = "Invalid or expired code.";

function hashTicket(ticket: string): string {
  return createHash("sha256").update(ticket.trim()).digest("hex");
}

function ticketExpiresAt(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TICKET_TTL_MS);
}

/**
 * The ticket lives in the existing `PasswordResetToken` table (hashed) instead
 * of a new table, so the flow needs no table creation to deploy. Reset codes
 * live in `EmailOtpToken` under the `PASSWORD_RESET` purpose.
 */
async function createResetTicket(userId: string): Promise<string> {
  const ticket = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hashTicket(ticket), expiresAt: ticketExpiresAt() },
  });
  return ticket;
}

async function issuePasswordResetCode(input: {
  email: string;
  ip?: string | null;
}): Promise<{ ticket: string; hint: string } | null> {
  const email = input.email.trim().toLowerCase();

  const account = await accountSettingsService.get();
  if (!account.passwordReset.enabled) return null;

  const emailRl = await enforceRateLimit({
    key: `password-reset:email:${email}`,
    limit: REQUEST_LIMIT,
    windowMs: REQUEST_WINDOW_MS,
  });
  if (!emailRl.allowed) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  // Every role is eligible; a disabled account is simply never mailed.
  if (!user || user.disabledAt) return null;

  // Resolve the site-wide sender (Settings → Email Accounts → Email delivery)
  // *before* minting a token: no sender means no code, and an honest audit
  // entry instead of a token the user can never redeem.
  const sender = await resolveAuthEmailSender("PASSWORD_RESET", account);
  if (!sender.providerConfig) {
    await writeSecurityAuditLog({
      action: "auth.password_reset.email_failed",
      actorId: user.id,
      actorRole: user.role,
      ip: input.ip,
      meta: {
        errorCode: "not_configured",
        reason: sender.reason,
        accountId: sender.accountId,
        audience: user.role,
      },
    });
    return null;
  }

  const code = generateEmailOtpCode();
  // One live code per account: the new code replaces any previous one.
  await prisma.emailOtpToken.deleteMany({
    where: { userId: user.id, purpose: RESET_OTP_PURPOSE, usedAt: null },
  });
  await prisma.emailOtpToken.create({
    data: {
      userId: user.id,
      purpose: RESET_OTP_PURPOSE,
      codeHash: hashEmailOtp(code),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS),
    },
  });

  const subject = "Your password reset code";
  const heading = "Reset your password";
  const paragraphs = [
    `Hello ${user.name},`,
    `Enter this code where you asked to reset your password. It expires in ${PASSWORD_RESET_OTP_TTL_MINUTES} minutes and can be used once.`,
    "If you did not request a password reset, you can ignore this email — your password has not changed.",
  ];
  const { renderTransactionalEmail } = await import("@/features/email/react-templates");
  const rendered = await renderTransactionalEmail({ preview: subject, heading, code, paragraphs });

  const result = await sendEmail({
    to: user.email,
    subject,
    html: rendered.html,
    text: rendered.text ?? `${heading}\n\nYour code: ${code}\n\n${paragraphs.join("\n\n")}`,
    fromName: sender.fromName,
    providerConfig: sender.providerConfig,
  });

  if (!result.sent) {
    // Never leave a live code the user cannot read.
    await prisma.emailOtpToken.deleteMany({
      where: { userId: user.id, purpose: RESET_OTP_PURPOSE, usedAt: null },
    });
    await writeSecurityAuditLog({
      action: "auth.password_reset.email_failed",
      actorId: user.id,
      actorRole: user.role,
      ip: input.ip,
      meta: {
        errorCode: result.errorCode ?? "unknown",
        sender: sender.source,
        accountId: sender.accountId,
        providerMessage: result.errorMessage,
        audience: user.role,
      },
    });
    return null;
  }

  await writeSecurityAuditLog({
    action: "auth.password_reset.otp_sent",
    actorId: user.id,
    actorRole: user.role,
    ip: input.ip,
    meta: { sender: sender.source, accountId: sender.accountId, from: sender.from },
  });

  const ticket = await createResetTicket(user.id);
  return { ticket, hint: maskResetHint(user.email) };
}

/**
 * Public "send me a reset code".
 *
 * The HTTP response must be identical for known and unknown addresses, so the
 * returned ticket is a capability for the browser that asked — never a signal
 * about whether the address exists (it is simply absent on the miss path).
 */
export async function requestPasswordReset(input: {
  email: string;
  ip?: string | null;
}): Promise<{ ok: true; ticket?: string; hint?: string }> {
  try {
    const issued = await issuePasswordResetCode({ email: input.email, ip: input.ip });
    return issued ? { ok: true, ticket: issued.ticket, hint: issued.hint } : { ok: true };
  } catch (error) {
    console.error(
      "[password-reset] request failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );
    return { ok: true };
  }
}

/** Admin-initiated reset; hierarchy is enforced by the calling action. */
export async function sendPasswordResetCodeToUser(
  userId: string,
  options: { ip?: string | null } = {},
): Promise<{ ok: true } | { error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, disabledAt: true },
  });
  if (!user || user.disabledAt) return { error: "This account is not eligible for a reset" };
  const issued = await issuePasswordResetCode({ email: user.email, ip: options.ip });
  if (!issued) return { error: "The reset code could not be sent. Check the OTP email account." };
  return { ok: true };
}

export type VerifyResetResult = { ok: true; ticket: string } | { error: string };

export async function verifyPasswordResetCode(input: {
  ticket?: string | null;
  email?: string | null;
  code: string;
  ip?: string | null;
}): Promise<VerifyResetResult> {
  const code = normalizePasswordResetCode(input.code);
  if (!code) return { error: "Enter the 6-digit code from the email." };

  let userId: string | null = null;
  if (input.ticket) {
    const ticketRow = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: hashTicket(input.ticket), usedAt: null },
      select: { userId: true, expiresAt: true },
    });
    if (!ticketRow || ticketRow.expiresAt < new Date()) return { error: RESET_TICKET_INVALID };
    userId = ticketRow.userId;
  } else if (input.email) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }
  if (!userId) return { error: RESET_CODE_INVALID };

  const rl = await enforceRateLimit({
    key: `password-reset:verify:${userId}`,
    limit: VERIFY_LIMIT,
    windowMs: VERIFY_WINDOW_MS,
  });
  if (!rl.allowed) return { error: "Too many attempts. Request a new code in a few minutes." };

  const record = await prisma.emailOtpToken.findFirst({
    where: {
      userId,
      purpose: RESET_OTP_PURPOSE,
      codeHash: hashEmailOtp(code),
      usedAt: null,
    },
  });
  if (!record || record.expiresAt < new Date()) {
    await writeSecurityAuditLog({
      action: "auth.password_reset.otp_failure",
      actorId: userId,
      ip: input.ip,
      meta: { reason: "INVALID_OR_EXPIRED" },
    });
    return { error: RESET_CODE_INVALID };
  }

  await prisma.emailOtpToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  await prisma.emailOtpToken.deleteMany({
    where: { userId, purpose: RESET_OTP_PURPOSE, usedAt: null },
  });

  // Fresh ticket with a full window from the moment the code was accepted.
  const ticket = await createResetTicket(userId);
  await writeSecurityAuditLog({
    action: "auth.password_reset.otp_verified",
    actorId: userId,
    ip: input.ip,
  });
  return { ok: true, ticket };
}

/**
 * Set the new password behind a verified ticket.
 *
 * On success: password replaced, all sessions revoked, MFA enrollment cleared
 * (including recovery codes) so the user must enroll a factor again, and any
 * forced password change satisfied.
 */
export async function completePasswordReset(input: {
  ticket: string;
  password: string;
  ip?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashTicket(input.ticket), usedAt: null },
    include: { user: { select: { id: true, role: true, passwordHash: true, disabledAt: true } } },
  });
  if (!record || record.expiresAt < new Date()) return { error: RESET_TICKET_INVALID };
  if (record.user.disabledAt) return { error: RESET_TICKET_INVALID };

  const rl = await enforceRateLimit({
    key: `password-reset:complete:${record.userId}`,
    limit: COMPLETE_LIMIT,
    windowMs: COMPLETE_WINDOW_MS,
  });
  if (!rl.allowed) return { error: "Too many attempts. Request a new code." };

  if (await isPasswordReused(input.password, record.user.passwordHash)) {
    return { error: PASSWORD_REUSE_ERROR };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const claimed = await prisma.$transaction(async (tx) => {
    // Conditional update: only one request can redeem a ticket.
    const claim = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claim.count === 0) return false;
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return true;
  });
  if (!claimed) return { error: RESET_TICKET_INVALID };

  await prisma.passwordResetToken.updateMany({
    where: { userId: record.userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await bumpUserSessionVersion(record.userId);
  // Requirement: a successful reset disables MFA; the next sign-in must
  // enroll a new factor.
  await clearUserMfa(record.userId, { reason: "PASSWORD_RESET" });

  await writeSecurityAuditLog({
    action: "auth.password.reset",
    actorId: record.userId,
    actorRole: record.user.role,
    ip: input.ip,
  });
  await writeSecurityAuditLog({
    action: "auth.session.revoked",
    actorId: record.userId,
    actorRole: record.user.role,
    ip: input.ip,
    meta: { reason: "PASSWORD_RESET" },
  });

  return { ok: true };
}

/**
 * Legacy link redemption. New reset requests issue codes instead, but a link
 * mailed before this change must still work exactly once — and it clears MFA
 * the same way the code flow does.
 */
export async function consumePasswordResetToken(input: {
  token: string;
  password: string;
}): Promise<{ ok: true } | { error: string }> {
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: createHash("sha256").update(input.token.trim()).digest("hex"), usedAt: null },
    include: { user: true },
  });
  if (!record || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }
  if (await isPasswordReused(input.password, record.user.passwordHash)) {
    return { error: PASSWORD_REUSE_ERROR };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claim.count === 0) return false;
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return true;
  });
  if (!claimed) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  await bumpUserSessionVersion(record.userId);
  await clearUserMfa(record.userId, { reason: "PASSWORD_RESET" });

  await writeSecurityAuditLog({
    action: "auth.password.reset",
    actorId: record.userId,
    actorRole: record.user.role,
    meta: { legacyLink: true },
  });
  await writeSecurityAuditLog({
    action: "auth.session.revoked",
    actorId: record.userId,
    actorRole: record.user.role,
    meta: { reason: "PASSWORD_RESET" },
  });

  return { ok: true };
}
