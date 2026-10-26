import "server-only";

import { createHash, randomBytes } from "crypto";
import type { EmailVerificationPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getEmailDeliveryStatusForAccount,
  resolveSendProviderConfig,
  sendEmail,
} from "@/features/email/email.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { bumpUserSessionVersion } from "@/lib/session-version";
import { accountPublicPath } from "@/features/account/account-public-path";

export const NOT_CONFIGURED_MESSAGE =
  "No email provider is configured, so the confirmation could not be sent. Configure Settings → Email Accounts (or RESEND_API_KEY) and try again.";
export const SEND_FAILED_MESSAGE =
  "The confirmation email could not be sent. Check the email provider settings and try again.";
export const RATE_LIMITED_MESSAGE =
  "Too many verification emails were requested recently. Try again in about an hour.";

/**
 * Verification links are single-use and short-lived: a link that sits in an
 * inbox for a day is a long-lived credential for taking over an address.
 * Every issue/consume/expiry/invalidation is recorded in the security audit log.
 */
export const TOKEN_EXPIRY_MINUTES = 30;
const RESEND_LIMIT = 3;
const RESEND_WINDOW_MS = 60 * 60 * 1000;

export type EmailVerificationFailureReason =
  | "INVALID"
  | "EXPIRED"
  | "ALREADY_USED"
  | "NO_PENDING_EMAIL"
  | "EMAIL_TAKEN"
  | "RATE_LIMITED";

/** Reason-specific copy so the user knows whether to resend or redo the change. */
export function verificationFailureMessage(reason: EmailVerificationFailureReason): string {
  switch (reason) {
    case "EXPIRED":
      return `This confirmation link has expired. Confirmation links are valid for ${TOKEN_EXPIRY_MINUTES} minutes — request a new one.`;
    case "ALREADY_USED":
      return "This confirmation link was already used. If your email did not change, request a new confirmation email.";
    case "NO_PENDING_EMAIL":
      return "There is no pending email change for this account. Start the change again.";
    case "EMAIL_TAKEN":
      return "That email address is no longer available. Start the change again with a different address.";
    case "RATE_LIMITED":
      return RATE_LIMITED_MESSAGE;
    default:
      return "This confirmation link is invalid. Request a new confirmation email.";
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export type IssueEmailVerificationResult =
  | { ok: true }
  /** `deliveryFailed` means nothing was sent, so callers must not claim it was. */
  | { error: string; deliveryFailed: boolean };

export async function issueEmailVerification(input: {
  userId: string;
  purpose: EmailVerificationPurpose;
  locale: string;
  /** Destination inbox — pending email for EMAIL_CHANGE, else current email. */
  toEmail?: string;
}): Promise<IssueEmailVerificationResult> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { error: "User not found", deliveryFailed: true };

  const rl = await enforceRateLimit({
    key: `verify-resend:${user.id}:${input.purpose}`,
    limit: RESEND_LIMIT,
    windowMs: RESEND_WINDOW_MS,
  });
  if (!rl.allowed) {
    // Callers are authenticated flows that report delivery, so "silently
    // pretend we sent it" is wrong here: say so instead of returning ok.
    await writeSecurityAuditLog({
      action: "auth.email.verify.failed",
      actorId: user.id,
      actorRole: user.role,
      meta: { purpose: input.purpose, reason: "RATE_LIMITED" },
    });
    return { error: RATE_LIMITED_MESSAGE, deliveryFailed: true };
  }

  const toEmail = (input.toEmail ?? user.email).trim().toLowerCase();
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  // Supersede any outstanding link for this purpose so exactly one is live.
  const superseded = await prisma.emailVerificationToken.deleteMany({
    where: { userId: user.id, purpose: input.purpose, usedAt: null },
  });

  const token = await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      purpose: input.purpose,
      tokenHash,
      expiresAt,
    },
  });

  await writeSecurityAuditLog({
    action: "auth.email.verify.issued",
    actorId: user.id,
    actorRole: user.role,
    meta: {
      purpose: input.purpose,
      toEmail,
      tokenId: token.id,
      expiresAt: expiresAt.toISOString(),
      supersededCount: superseded.count,
    },
  });

  const settings = await accountSettingsService.get();
  const verifyLink = `${getSiteBaseUrl()}${accountPublicPath(input.locale, "verify-email")}?token=${encodeURIComponent(rawToken)}`;
  const vars = {
    name: user.name,
    verifyLink,
    email: toEmail,
    expiryMinutes: String(TOKEN_EXPIRY_MINUTES),
    // Kept for custom templates that still reference the old placeholder.
    expiryHours: String(TOKEN_EXPIRY_MINUTES / 60),
  };

  const subject = applyTemplate(settings.emailVerification.emailSubject, vars);
  const heading = applyTemplate(settings.emailVerification.emailHeading, vars);
  const bodyText = applyTemplate(settings.emailVerification.emailBody, vars);
  const { renderTransactionalEmail } = await import(
    "@/features/email/react-templates"
  );
  const rendered = await renderTransactionalEmail({
    preview: subject,
    heading,
    paragraphs: [bodyText],
    linkUrl: verifyLink,
    linkLabel: verifyLink,
  });

  const emailAccountId = settings.emailVerification.emailAccountId || null;
  const delivery = await getEmailDeliveryStatusForAccount(emailAccountId);
  if (!delivery.configured) {
    // Never report success when no provider can deliver: the caller would
    // otherwise show "confirmation sent" for an email that never left.
    await prisma.emailVerificationToken.delete({ where: { id: token.id } });
    await writeSecurityAuditLog({
      action: "auth.email.verify.failed",
      actorId: user.id,
      actorRole: user.role,
      meta: { purpose: input.purpose, reason: "NOT_CONFIGURED" },
    });
    return { error: NOT_CONFIGURED_MESSAGE, deliveryFailed: true };
  }

  const result = await sendEmail({
    to: toEmail,
    subject,
    html: rendered.html,
    text: rendered.text ?? `${heading}\n\n${bodyText}\n\n${verifyLink}`,
    providerConfig: await resolveSendProviderConfig(emailAccountId),
    fromName: settings.emailVerification.fromName?.trim() || undefined,
  });

  if (!result.sent) {
    // The token is useless without a delivered link — drop it so a retry
    // starts clean instead of leaving an unreachable pending invite.
    await prisma.emailVerificationToken.delete({ where: { id: token.id } });
    await writeSecurityAuditLog({
      action: "auth.email.verify.failed",
      actorId: user.id,
      actorRole: user.role,
      meta: { purpose: input.purpose, errorCode: result.errorCode ?? "unknown" },
    });
    return { error: result.errorMessage ?? SEND_FAILED_MESSAGE, deliveryFailed: true };
  }

  await writeSecurityAuditLog({
    action: "auth.email.verify.sent",
    actorId: user.id,
    actorRole: user.role,
    meta: { purpose: input.purpose },
  });

  return { ok: true };
}

export type ConsumeEmailVerificationResult =
  | { ok: true; purpose: EmailVerificationPurpose }
  | { error: string; reason: EmailVerificationFailureReason };

/**
 * Redeem a verification link.
 *
 * - Single use: the token is marked used inside the same transaction as the
 *   change, so a concurrent/repeat click cannot apply twice.
 * - Immediate invalidation: a link is retired as soon as it is redeemed,
 *   expires, or is found unusable — it never stays live afterwards.
 * - Every outcome is audited, including reuse attempts against a dead link.
 */
export async function consumeEmailVerification(
  rawToken: string,
): Promise<ConsumeEmailVerificationResult> {
  const tokenHash = hashToken(rawToken.trim());
  const now = new Date();

  // Look up even used tokens so a repeat click is reported as ALREADY_USED
  // instead of the misleading "invalid link".
  const record = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  if (!record) {
    await writeSecurityAuditLog({
      action: "auth.email.verify.failure",
      meta: { reason: "INVALID", tokenHashPrefix: tokenHash.slice(0, 12) },
    });
    return { error: verificationFailureMessage("INVALID"), reason: "INVALID" };
  }

  const user = record.user;

  if (record.usedAt) {
    await writeSecurityAuditLog({
      action: "auth.email.verify.reuse_blocked",
      actorId: user.id,
      actorRole: user.role,
      meta: {
        purpose: record.purpose,
        tokenId: record.id,
        usedAt: record.usedAt.toISOString(),
      },
    });
    return {
      error: verificationFailureMessage("ALREADY_USED"),
      reason: "ALREADY_USED",
    };
  }

  if (record.expiresAt <= now) {
    // Retire the expired link immediately instead of leaving it redeemable
    // forever (previously only a later resend swept it up).
    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    });
    await writeSecurityAuditLog({
      action: "auth.email.verify.expired",
      actorId: user.id,
      actorRole: user.role,
      meta: {
        purpose: record.purpose,
        tokenId: record.id,
        expiredAt: record.expiresAt.toISOString(),
      },
    });
    return { error: verificationFailureMessage("EXPIRED"), reason: "EXPIRED" };
  }

  const purpose = record.purpose;
  const failWithoutUse = async (
    reason: EmailVerificationFailureReason,
    tokenId: string,
  ): Promise<ConsumeEmailVerificationResult> => {
    await prisma.emailVerificationToken.update({
      where: { id: tokenId },
      data: { usedAt: now },
    });
    await writeSecurityAuditLog({
      action: "auth.email.verify.failure",
      actorId: user.id,
      actorRole: user.role,
      meta: { purpose, reason, tokenId },
    });
    return { error: verificationFailureMessage(reason), reason };
  };

  if (record.purpose === "SIGNUP_VERIFY") {
    // Conditional update: only the request that flips usedAt wins, so a race
    // cannot mark the address verified twice from two different sessions.
    const redeemed = await prisma.$transaction(async (tx) => {
      const claim = await tx.emailVerificationToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: now },
      });
      if (claim.count === 0) return false;
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: now },
      });
      return true;
    });
    if (!redeemed) {
      await writeSecurityAuditLog({
        action: "auth.email.verify.reuse_blocked",
        actorId: user.id,
        actorRole: user.role,
        meta: { purpose: "SIGNUP_VERIFY", tokenId: record.id, reason: "RACE" },
      });
      return { error: verificationFailureMessage("ALREADY_USED"), reason: "ALREADY_USED" };
    }
    await writeSecurityAuditLog({
      action: "auth.email.verify.success",
      actorId: user.id,
      actorRole: user.role,
      meta: { purpose: "SIGNUP_VERIFY", tokenId: record.id },
    });
    return { ok: true, purpose: "SIGNUP_VERIFY" };
  }

  // EMAIL_CHANGE
  const pending = user.pendingEmail?.trim().toLowerCase();
  if (!pending) {
    return failWithoutUse("NO_PENDING_EMAIL", record.id);
  }

  const taken = await prisma.user.findUnique({ where: { email: pending } });
  if (taken && taken.id !== user.id) {
    return failWithoutUse("EMAIL_TAKEN", record.id);
  }

  const redeemed = await prisma.$transaction(async (tx) => {
    const claim = await tx.emailVerificationToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claim.count === 0) return false;
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: pending,
        pendingEmail: null,
        emailVerifiedAt: now,
      },
    });
    return true;
  });

  if (!redeemed) {
    // Lost the race to another redemption of the same link.
    await writeSecurityAuditLog({
      action: "auth.email.verify.reuse_blocked",
      actorId: user.id,
      actorRole: user.role,
      meta: { purpose: "EMAIL_CHANGE", tokenId: record.id, reason: "RACE" },
    });
    return { error: verificationFailureMessage("ALREADY_USED"), reason: "ALREADY_USED" };
  }

  // Retire any other outstanding links for this user: the change is done and
  // stale links must not remain redeemable.
  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: now },
  });

  await bumpUserSessionVersion(user.id);
  await writeSecurityAuditLog({
    action: "auth.email.verify.success",
    actorId: user.id,
    actorRole: user.role,
    meta: { purpose: "EMAIL_CHANGE", tokenId: record.id, from: user.email, to: pending },
  });
  await writeSecurityAuditLog({
    action: "auth.email.changed",
    actorId: user.id,
    actorRole: user.role,
    meta: { from: user.email, to: pending },
  });
  await writeSecurityAuditLog({
    action: "auth.session.revoked",
    actorId: user.id,
    actorRole: user.role,
    meta: { reason: "EMAIL_CHANGED" },
  });

  return { ok: true, purpose: "EMAIL_CHANGE" };
}

/** Resend signup verification by email — never reveals whether the account exists. */
export async function resendSignupVerification(input: {
  email: string;
  locale: string;
  ip?: string | null;
}): Promise<{ ok: true }> {
  const email = input.email.trim().toLowerCase();
  const emailRl = await enforceRateLimit({
    key: `verify:email:${email}`,
    limit: RESEND_LIMIT,
    windowMs: RESEND_WINDOW_MS,
  });
  if (input.ip) {
    const ipRl = await enforceRateLimit({
      key: `verify:ip:${input.ip}`,
      limit: 10,
      windowMs: RESEND_WINDOW_MS,
    });
    if (!ipRl.allowed) return { ok: true };
  }
  if (!emailRl.allowed) return { ok: true };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "CUSTOMER" || user.emailVerifiedAt) {
    return { ok: true };
  }

  const { issueEmailOtp } = await import("@/features/auth/email-otp.service");
  // Same site-wide sender as the first signup code (Settings → Email Accounts
  // → Email delivery); a resend must not switch mailboxes.
  await issueEmailOtp({
    userId: user.id,
    purpose: "SIGNUP_VERIFY",
    toEmail: email,
  });
  return { ok: true };
}
