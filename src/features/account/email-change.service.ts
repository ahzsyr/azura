import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  NOT_CONFIGURED_MESSAGE,
  issueEmailVerification,
} from "@/features/account/email-verification.service";
import {
  resolveSendProviderConfig,
  sendEmail,
} from "@/features/email/email.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { normalizeEmail } from "@/lib/security/email-input";
import { verifyEmailDomain } from "@/lib/security/email-domain.server";

export type StartEmailChangeResult =
  | { ok: true; pendingEmail: string; warning?: string }
  | { error: string; deliveryFailed: true };

export async function startEmailChange(input: {
  userId: string;
  currentPassword: string;
  newEmail: string;
  locale: string;
}): Promise<StartEmailChangeResult> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { error: "User not found", deliveryFailed: true };

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect", deliveryFailed: true };

  const newEmail = normalizeEmail(input.newEmail);
  const domain = await verifyEmailDomain(newEmail);
  if (!domain.ok) return { error: domain.message, deliveryFailed: true };
  if (newEmail === user.email.toLowerCase()) {
    // Owning this address is not a disclosure, so this specific error stays.
    return { error: "New email must be different", deliveryFailed: true };
  }

  const taken = await prisma.user.findUnique({ where: { email: newEmail } });
  if (taken) {
    // The caller already proved the current password, so a specific error is
    // recoverable and does not stage pendingEmail.
    return { error: "Email is already in use", deliveryFailed: true };
  }

  const settings = await accountSettingsService.get();
  const emailAccountId = settings.emailVerification.emailAccountId || null;
  const providerConfig = await resolveSendProviderConfig(emailAccountId);
  if (!providerConfig) {
    // Refuse up front instead of staging a pending email whose confirmation
    // email can never be delivered (this is what produced "Confirmation sent"
    // with nothing in the inbox).
    await writeSecurityAuditLog({
      action: "auth.email.verify.failed",
      actorId: user.id,
      actorRole: user.role,
      meta: { purpose: "EMAIL_CHANGE", reason: "NOT_CONFIGURED" },
    });
    return { error: NOT_CONFIGURED_MESSAGE, deliveryFailed: true };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { pendingEmail: newEmail },
  });

  const verification = await issueEmailVerification({
    userId: user.id,
    purpose: "EMAIL_CHANGE",
    locale: input.locale,
    toEmail: newEmail,
  });

  if ("error" in verification) {
    // Confirmation never left, so the staged address must not linger as
    // "pending" — otherwise a later unrelated save re-announces it.
    await prisma.user.update({
      where: { id: user.id },
      data: { pendingEmail: null },
    });
    return { error: verification.error, deliveryFailed: true };
  }

  // Notify the current address. This is a courtesy alert, so a failure here
  // must not claim the change was rejected — but it is surfaced as a warning
  // and audited rather than silently swallowed.
  let warning: string | undefined;
  try {
    const { renderTransactionalEmail } = await import(
      "@/features/email/react-templates"
    );
    const rendered = await renderTransactionalEmail({
      preview: "Email change requested",
      heading: "Email change requested",
      paragraphs: [
        `A request was made to change your account email to ${newEmail}. If this was not you, sign in and secure your account.`,
      ],
    });
    const notify = await sendEmail({
      to: user.email,
      subject: "Email change requested",
      html: rendered.html,
      text:
        rendered.text ??
        `A request was made to change your account email to ${newEmail}. If this was not you, sign in and secure your account.`,
      providerConfig,
    });
    if (!notify.sent) {
      warning = `The confirmation email was sent to ${newEmail}, but the security notice to ${user.email} could not be delivered.`;
      await writeSecurityAuditLog({
        action: "auth.email.change_notice.failed",
        actorId: user.id,
        actorRole: user.role,
        meta: { errorCode: notify.errorCode ?? "unknown" },
      });
    }
  } catch (error) {
    warning = `The confirmation email was sent to ${newEmail}, but the security notice to ${user.email} could not be delivered.`;
    await writeSecurityAuditLog({
      action: "auth.email.change_notice.failed",
      actorId: user.id,
      actorRole: user.role,
      meta: { errorCode: "exception", detail: error instanceof Error ? error.message.slice(0, 200) : "unknown" },
    });
  }

  await writeSecurityAuditLog({
    action: "auth.email.verify.sent",
    actorId: user.id,
    actorRole: user.role,
    meta: { purpose: "EMAIL_CHANGE", notifyOld: true },
  });

  return warning
    ? { ok: true, pendingEmail: newEmail, warning }
    : { ok: true, pendingEmail: newEmail };
}
