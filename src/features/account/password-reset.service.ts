import "server-only";

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/features/email/email.service";
import { accountSettingsService } from "@/features/account/account-settings.service";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

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

function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

function checkRateLimit(email: string): boolean {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

export async function requestPasswordReset(input: {
  email: string;
  locale: string;
}): Promise<{ ok: true }> {
  const email = input.email.toLowerCase().trim();
  if (!checkRateLimit(email)) {
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
  const expiryHours = settings.passwordReset.tokenExpiryHours;
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

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
    expiryHours: String(expiryHours),
    email: user.email,
  };

  const subject = applyTemplate(settings.passwordReset.emailSubject, vars);
  const heading = applyTemplate(settings.passwordReset.emailHeading, vars);
  const bodyText = applyTemplate(settings.passwordReset.emailBody, vars);
  const html = `<div style="font-family:sans-serif;line-height:1.5"><h2>${heading}</h2><pre style="white-space:pre-wrap;font-family:inherit">${bodyText}</pre><p><a href="${resetLink}">${resetLink}</a></p></div>`;

  const fromName = settings.passwordReset.fromName?.trim();
  await sendEmail({
    to: user.email,
    subject,
    html,
    text: `${heading}\n\n${bodyText}\n\n${resetLink}`,
  });

  const notify = settings.passwordReset.notifyReceiverEmail?.trim();
  if (notify) {
    await sendEmail({
      to: notify,
      subject: `[Password reset requested] ${user.email}`,
      html: `<p>A password reset was requested for <strong>${user.email}</strong> at ${new Date().toISOString()}.</p>`,
      text: `Password reset requested for ${user.email} at ${new Date().toISOString()}`,
    });
  }

  return { ok: true };
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
    return { error: "Invalid or expired reset link" };
  }
  if (record.user.role !== "CUSTOMER") {
    return { error: "Invalid or expired reset link" };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

export async function sendPasswordResetForUser(userId: string, locale = "en") {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "CUSTOMER") {
    throw new Error("Customer not found");
  }
  return requestPasswordReset({ email: user.email, locale });
}
