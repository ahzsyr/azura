import "server-only";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueEmailVerification } from "@/features/account/email-verification.service";
import { sendEmail } from "@/features/email/email.service";
import { writeSecurityAuditLog } from "@/lib/security-audit";

export async function startEmailChange(input: {
  userId: string;
  currentPassword: string;
  newEmail: string;
  locale: string;
}): Promise<{ ok: true; pendingEmail: string } | { error: string }> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return { error: "User not found" };

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect" };

  const newEmail = input.newEmail.trim().toLowerCase();
  if (newEmail === user.email.toLowerCase()) {
    return { error: "New email must be different" };
  }

  const taken = await prisma.user.findUnique({ where: { email: newEmail } });
  if (taken) return { error: "Email is already in use" };

  await prisma.user.update({
    where: { id: user.id },
    data: { pendingEmail: newEmail },
  });

  await issueEmailVerification({
    userId: user.id,
    purpose: "EMAIL_CHANGE",
    locale: input.locale,
    toEmail: newEmail,
  });

  await sendEmail({
    to: user.email,
    subject: "Email change requested",
    html: `<p>A request was made to change your account email to <strong>${newEmail}</strong>. If this was not you, sign in and secure your account.</p>`,
    text: `A request was made to change your account email to ${newEmail}. If this was not you, sign in and secure your account.`,
  });

  await writeSecurityAuditLog({
    action: "auth.email.verify.sent",
    actorId: user.id,
    actorRole: user.role,
    meta: { purpose: "EMAIL_CHANGE", notifyOld: true },
  });

  return { ok: true, pendingEmail: newEmail };
}
