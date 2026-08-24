import "server-only";

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail, resolveSendProviderConfig } from "@/features/email/email.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { resolveAdminPasswordResetProviderConfig } from "@/features/auth/admin-auth-delivery";
import { isAdminRole } from "@/features/auth/portal";
import { enforceRateLimit } from "@/lib/rate-limit";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { bumpUserSessionVersion } from "@/lib/session-version";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

/** Password reset links are single-use and expire after 5 minutes. */
export const PASSWORD_RESET_TTL_MS = 5 * 60 * 1000;
export const PASSWORD_RESET_TTL_MINUTES = 5;

const ADMIN_RESET_NOT_CONFIGURED =
  "Admin email delivery is not configured. Configure an Email Account in Account Settings before sending an administrator password reset.";

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

export async function requestPasswordReset(input: {
  email: string;
  locale: string;
}): Promise<{ ok: true; sent?: boolean }> {
  const email = input.email.toLowerCase().trim();
  const rl = await enforceRateLimit({
    key: `password-reset:email:${email}`,
    limit: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rl.allowed) {
    return { ok: true };
  }

  const settings = await accountSettingsService.get();
  if (!settings.passwordReset.enabled) {
    return { ok: true };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "CUSTOMER") {
    return { ok: true };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetLink = `${getSiteBaseUrl()}/${input.locale}/account/reset-password?token=${encodeURIComponent(rawToken)}`;
  const vars = {
    name: user.name,
    resetLink,
    expiryHours: String(PASSWORD_RESET_TTL_MINUTES / 60),
    expiryMinutes: String(PASSWORD_RESET_TTL_MINUTES),
    email: user.email,
  };

  const subject = applyTemplate(settings.passwordReset.emailSubject, vars);
  const heading = applyTemplate(settings.passwordReset.emailHeading, vars);
  const bodyText = applyTemplate(
    settings.passwordReset.emailBody.includes("{{expiryMinutes}}")
      ? settings.passwordReset.emailBody
      : settings.passwordReset.emailBody.replace(
          /\{\{expiryHours\}\}\s*hour\(s\)/gi,
          `${PASSWORD_RESET_TTL_MINUTES} minutes`,
        ),
    vars,
  );
  const html = `<div style="font-family:sans-serif;line-height:1.5"><h2>${heading}</h2><pre style="white-space:pre-wrap;font-family:inherit">${bodyText}</pre><p><a href="${resetLink}">${resetLink}</a></p></div>`;

  const replyTo = settings.passwordReset.replyToEmail?.trim() || undefined;
  const fromName = settings.passwordReset.fromName?.trim() || undefined;
  const providerConfig = await resolveSendProviderConfig(
    settings.passwordReset.emailAccountId || null,
  );

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    text: `${heading}\n\n${bodyText}\n\n${resetLink}`,
    replyTo,
    fromName,
    providerConfig,
  });

  if (!result.sent) {
    await writeSecurityAuditLog({
      action: "auth.password_reset.email_failed",
      actorId: user.id,
      actorRole: user.role,
      meta: { errorCode: result.errorCode ?? "unknown" },
    });
  }

  const notify = settings.passwordReset.notifyReceiverEmail?.trim();
  if (notify) {
    await sendEmail({
      to: notify,
      subject: `[Password reset requested] ${user.email}`,
      html: `<p>A password reset was requested for <strong>${user.email}</strong> at ${new Date().toISOString()}.</p>`,
      text: `Password reset requested for ${user.email} at ${new Date().toISOString()}`,
      fromName,
      providerConfig,
    });
  }

  return { ok: true, sent: result.sent };
}

/** Admin password reset — uses adminAuth.passwordResetEmailAccountId only (never customer portal sender). */
export async function requestAdminPasswordReset(input: {
  userId: string;
  locale?: string;
}): Promise<{ ok: true; sent: boolean } | { error: string }> {
  const locale = input.locale ?? "en";
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || !isAdminRole(user.role)) {
    return { error: "Administrator not found" };
  }

  const providerConfig = await resolveAdminPasswordResetProviderConfig();
  if (!providerConfig) {
    return { error: ADMIN_RESET_NOT_CONFIGURED };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetLink = `${getSiteBaseUrl()}/${locale}/account/reset-password?token=${encodeURIComponent(rawToken)}`;
  const subject = "Reset your administrator password";
  const heading = "Administrator password reset";
  const bodyText = `Hello ${user.name},\n\nUse the link below within ${PASSWORD_RESET_TTL_MINUTES} minutes to reset your administrator password:\n\n${resetLink}\n\nThis link can only be used once.`;
  const html = `<div style="font-family:sans-serif;line-height:1.5"><h2>${heading}</h2><pre style="white-space:pre-wrap;font-family:inherit">${bodyText}</pre><p><a href="${resetLink}">${resetLink}</a></p></div>`;

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    text: `${heading}\n\n${bodyText}`,
    providerConfig,
  });

  if (!result.sent) {
    await writeSecurityAuditLog({
      action: "auth.password_reset.email_failed",
      actorId: user.id,
      actorRole: user.role,
      meta: { errorCode: result.errorCode ?? "unknown", audience: "admin" },
    });
    return { error: result.errorMessage ?? "Could not send reset email" };
  }

  return { ok: true, sent: true };
}

export async function consumePasswordResetToken(input: {
  token: string;
  password: string;
}): Promise<{ ok: true } | { error: string }> {
  const tokenHash = hashToken(input.token.trim());
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }
  // Allow CUSTOMER and admin roles (admin reset links use the same token table)
  const role = record.user.role;
  if (role !== "CUSTOMER" && !isAdminRole(role)) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
  await bumpUserSessionVersion(record.userId);

  await writeSecurityAuditLog({
    action: "auth.password.reset",
    actorId: record.userId,
    actorRole: record.user.role,
  });
  await writeSecurityAuditLog({
    action: "auth.session.revoked",
    actorId: record.userId,
    actorRole: record.user.role,
    meta: { reason: "PASSWORD_RESET" },
  });

  return { ok: true };
}

export async function sendPasswordResetForUser(
  userId: string,
  locale = "en",
): Promise<{ ok: true; sent?: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "CUSTOMER") {
    throw new Error("Customer not found");
  }
  return requestPasswordReset({ email: user.email, locale });
}

export async function sendAdminPasswordResetForUser(
  userId: string,
  locale = "en",
): Promise<{ ok: true; sent: boolean } | { error: string }> {
  return requestAdminPasswordReset({ userId, locale });
}
