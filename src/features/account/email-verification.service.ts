import "server-only";

import { createHash, randomBytes } from "crypto";
import type { EmailVerificationPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/features/email/email.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { bumpUserSessionVersion } from "@/lib/session-version";
import { accountPublicPath } from "@/features/account/account-public-path";

const TOKEN_EXPIRY_HOURS = 24;
const RESEND_LIMIT = 3;
const RESEND_WINDOW_MS = 60 * 60 * 1000;

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

export async function issueEmailVerification(input: {
  userId: string;
  purpose: EmailVerificationPurpose;
  locale: string;
  /** Destination inbox — pending email for EMAIL_CHANGE, else current email. */
  toEmail?: string;
}): Promise<{ ok: true } | { error: string }> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { error: "User not found" };

  const rl = await enforceRateLimit({
    key: `verify-resend:${user.id}:${input.purpose}`,
    limit: RESEND_LIMIT,
    windowMs: RESEND_WINDOW_MS,
  });
  if (!rl.allowed) return { ok: true };

  const toEmail = (input.toEmail ?? user.email).trim().toLowerCase();
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.deleteMany({
    where: { userId: user.id, purpose: input.purpose, usedAt: null },
  });

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      purpose: input.purpose,
      tokenHash,
      expiresAt,
    },
  });

  const settings = await accountSettingsService.get();
  const verifyLink = `${getSiteBaseUrl()}${accountPublicPath(input.locale, "verify-email")}?token=${encodeURIComponent(rawToken)}`;
  const vars = {
    name: user.name,
    verifyLink,
    email: toEmail,
    expiryHours: String(TOKEN_EXPIRY_HOURS),
  };

  const subject = applyTemplate(settings.emailVerification.emailSubject, vars);
  const heading = applyTemplate(settings.emailVerification.emailHeading, vars);
  const bodyText = applyTemplate(settings.emailVerification.emailBody, vars);
  const html = `<div style="font-family:sans-serif;line-height:1.5"><h2>${heading}</h2><pre style="white-space:pre-wrap;font-family:inherit">${bodyText}</pre><p><a href="${verifyLink}">${verifyLink}</a></p></div>`;

  await sendEmail({
    to: toEmail,
    subject,
    html,
    text: `${heading}\n\n${bodyText}\n\n${verifyLink}`,
  });

  await writeSecurityAuditLog({
    action: "auth.email.verify.sent",
    actorId: user.id,
    actorRole: user.role,
    meta: { purpose: input.purpose },
  });

  return { ok: true };
}

export async function consumeEmailVerification(
  rawToken: string,
): Promise<{ ok: true; purpose: EmailVerificationPurpose } | { error: string }> {
  const tokenHash = hashToken(rawToken.trim());
  const record = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash, usedAt: null },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    await writeSecurityAuditLog({
      action: "auth.email.verify.failure",
      meta: { reason: "INVALID_OR_EXPIRED" },
    });
    return { error: "Invalid or expired verification link" };
  }

  const user = record.user;

  if (record.purpose === "SIGNUP_VERIFY") {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    await writeSecurityAuditLog({
      action: "auth.email.verify.success",
      actorId: user.id,
      actorRole: user.role,
      meta: { purpose: "SIGNUP_VERIFY" },
    });
    return { ok: true, purpose: "SIGNUP_VERIFY" };
  }

  // EMAIL_CHANGE
  const pending = user.pendingEmail?.trim().toLowerCase();
  if (!pending) {
    await writeSecurityAuditLog({
      action: "auth.email.verify.failure",
      actorId: user.id,
      actorRole: user.role,
      meta: { reason: "NO_PENDING_EMAIL" },
    });
    return { error: "Invalid or expired verification link" };
  }

  const taken = await prisma.user.findUnique({ where: { email: pending } });
  if (taken && taken.id !== user.id) {
    await writeSecurityAuditLog({
      action: "auth.email.verify.failure",
      actorId: user.id,
      actorRole: user.role,
      meta: { reason: "EMAIL_TAKEN" },
    });
    return { error: "Email is already in use" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        email: pending,
        pendingEmail: null,
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
  await bumpUserSessionVersion(user.id);
  await writeSecurityAuditLog({
    action: "auth.email.verify.success",
    actorId: user.id,
    actorRole: user.role,
    meta: { purpose: "EMAIL_CHANGE" },
  });
  await writeSecurityAuditLog({
    action: "auth.email.changed",
    actorId: user.id,
    actorRole: user.role,
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
  const { accountSettingsService } = await import("@/features/account/account-settings.service");
  const settings = await accountSettingsService.get();
  await issueEmailOtp({
    userId: user.id,
    purpose: "SIGNUP_VERIFY",
    toEmail: email,
    emailAccountId: settings.emailVerification.emailAccountId || null,
  });
  return { ok: true };
}
