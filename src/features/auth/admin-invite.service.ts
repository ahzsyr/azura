import "server-only";

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/features/email/email.service";
import { enforceRateLimit } from "@/lib/rate-limit";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { bumpUserSessionVersion } from "@/lib/session-version";
import { passwordPolicySchema } from "@/schemas/password-policy";

const INVITE_EXPIRY_HOURS = 24;

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

export async function inviteAdmin(input: {
  email: string;
  name: string;
  invitedBy: { id: string; role: string };
  locale?: string;
  ip?: string | null;
}): Promise<{ ok: true; userId: string } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name || name.length < 1) return { error: "Name is required" };

  const rl = await enforceRateLimit({
    key: `admin-invite:${input.invitedBy.id}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) return { error: "Too many invite attempts" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email is already in use" };

  const unusableHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  const created = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: unusableHash,
      role: "ADMIN",
      mustChangePassword: true,
      totpEnabled: false,
      emailVerifiedAt: new Date(),
    },
    select: { id: true },
  });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.adminInviteToken.deleteMany({
    where: { userId: created.id, usedAt: null },
  });
  await prisma.adminInviteToken.create({
    data: {
      userId: created.id,
      tokenHash,
      expiresAt,
      invitedById: input.invitedBy.id,
    },
  });

  const locale = input.locale?.trim() || "en";
  const inviteLink = `${getSiteBaseUrl()}/${locale}/account/accept-invite?token=${encodeURIComponent(rawToken)}`;

  await sendEmail({
    to: email,
    subject: "You are invited to the admin panel",
    html: `<p>Hello ${name},</p><p>You have been invited as an administrator. Set your password using this link (expires in ${INVITE_EXPIRY_HOURS} hours):</p><p><a href="${inviteLink}">${inviteLink}</a></p>`,
    text: `Hello ${name},\n\nYou have been invited as an administrator. Set your password:\n${inviteLink}\n`,
  });

  await writeSecurityAuditLog({
    action: "admin.invite.sent",
    actorId: input.invitedBy.id,
    actorRole: input.invitedBy.role,
    ip: input.ip,
    meta: { targetUserId: created.id },
  });

  return { ok: true, userId: created.id };
}

export async function acceptAdminInvite(input: {
  token: string;
  password: string;
}): Promise<{ ok: true } | { error: string }> {
  const parsedPassword = passwordPolicySchema.safeParse(input.password);
  if (!parsedPassword.success) {
    return { error: parsedPassword.error.issues[0]?.message ?? "Invalid password" };
  }

  const tokenHash = hashToken(input.token.trim());
  const record = await prisma.adminInviteToken.findFirst({
    where: { tokenHash, usedAt: null },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    return { error: "Invalid or expired invite link" };
  }
  if (record.user.role !== "ADMIN") {
    return { error: "Invalid or expired invite link" };
  }

  const passwordHash = await bcrypt.hash(parsedPassword.data, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    }),
    prisma.adminInviteToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
  await bumpUserSessionVersion(record.userId);
  await writeSecurityAuditLog({
    action: "admin.invite.accepted",
    actorId: record.userId,
    actorRole: record.user.role,
    meta: { invitedById: record.invitedById },
  });

  return { ok: true };
}

export async function listStaffUsers() {
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      totpEnabled: true,
      mustChangePassword: true,
      disabledAt: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: [{ role: "desc" }, { name: "asc" }],
  });
}

export async function disableAdminAccount(input: {
  targetUserId: string;
  actor: { id: string; role: string };
  ip?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  if (input.targetUserId === input.actor.id) {
    return { error: "Cannot disable your own account" };
  }
  const target = await prisma.user.findUnique({ where: { id: input.targetUserId } });
  if (!target || target.role !== "ADMIN") {
    return { error: "Only ADMIN staff can be disabled" };
  }
  await prisma.user.update({
    where: { id: target.id },
    data: { disabledAt: new Date() },
  });
  await bumpUserSessionVersion(target.id);
  await writeSecurityAuditLog({
    action: "admin.account.disabled",
    actorId: input.actor.id,
    actorRole: input.actor.role,
    ip: input.ip,
    meta: { targetUserId: target.id },
  });
  await writeSecurityAuditLog({
    action: "auth.session.revoked",
    actorId: input.actor.id,
    actorRole: input.actor.role,
    ip: input.ip,
    meta: { targetUserId: target.id, reason: "ADMIN_DISABLED" },
  });
  return { ok: true };
}

export async function enableAdminAccount(input: {
  targetUserId: string;
  actor: { id: string; role: string };
  ip?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const target = await prisma.user.findUnique({ where: { id: input.targetUserId } });
  if (!target || target.role !== "ADMIN") {
    return { error: "Only ADMIN staff can be enabled" };
  }
  await prisma.user.update({
    where: { id: target.id },
    data: { disabledAt: null, failedLoginCount: 0, lockedUntil: null },
  });
  await writeSecurityAuditLog({
    action: "admin.account.enabled",
    actorId: input.actor.id,
    actorRole: input.actor.role,
    ip: input.ip,
    meta: { targetUserId: target.id },
  });
  return { ok: true };
}

export async function forceAdminPasswordChange(input: {
  targetUserId: string;
  actor: { id: string; role: string };
  ip?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const target = await prisma.user.findUnique({ where: { id: input.targetUserId } });
  if (!target || target.role !== "ADMIN") {
    return { error: "Only ADMIN staff can be forced to change password" };
  }
  await prisma.user.update({
    where: { id: target.id },
    data: { mustChangePassword: true },
  });
  await bumpUserSessionVersion(target.id);
  await writeSecurityAuditLog({
    action: "admin.password.forced",
    actorId: input.actor.id,
    actorRole: input.actor.role,
    ip: input.ip,
    meta: { targetUserId: target.id },
  });
  await writeSecurityAuditLog({
    action: "auth.session.revoked",
    actorId: input.actor.id,
    actorRole: input.actor.role,
    ip: input.ip,
    meta: { targetUserId: target.id, reason: "ADMIN_PASSWORD_FORCED" },
  });
  return { ok: true };
}

export async function revokeAdminSessions(input: {
  targetUserId: string;
  actor: { id: string; role: string };
  ip?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const target = await prisma.user.findUnique({ where: { id: input.targetUserId } });
  if (!target || target.role !== "ADMIN") {
    return { error: "Only ADMIN staff sessions can be revoked this way" };
  }
  await bumpUserSessionVersion(target.id);
  await writeSecurityAuditLog({
    action: "auth.session.revoked",
    actorId: input.actor.id,
    actorRole: input.actor.role,
    ip: input.ip,
    meta: { targetUserId: target.id, reason: "ADMIN_REVOKED_BY_SUPER" },
  });
  return { ok: true };
}
