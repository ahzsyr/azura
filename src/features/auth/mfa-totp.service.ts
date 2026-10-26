import "server-only";

import { randomBytes } from "node:crypto";
import * as OTPAuth from "otpauth";
import { prisma } from "@/lib/prisma";
import { sealSecret, unsealSecret } from "@/features/seo/integrations/secret-seal.server";
import {
  MFA_METHOD_LABELS,
  canSelfManageMfa,
  isSixDigitOtp,
  resolveMfaState,
  type MfaMethod,
} from "@/features/auth/mfa-policy.helpers";
import { bumpUserSessionVersion } from "@/lib/session-version";
import { hashRecoveryCode, writeSecurityAuditLog } from "@/lib/security-audit";

/**
 * Per-account multi-factor authentication.
 *
 * The setting lives on the user row (`mfaMethod`, `totpSecret`,
 * `mfaDisabledByAdminAt`) and every write is scoped by user id, so one user's
 * enrollment cannot enable, replace or clear another user's factor.
 *
 * Two methods are supported:
 * - `AUTHENTICATOR` — TOTP secret generated per user (recovery codes issued).
 * - `EMAIL_OTP` — a code emailed at sign-in through the configured OTP sender.
 */

const ISSUER = process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Azura";

type MfaUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaMethod: string | null;
  totpEnabled: boolean;
  totpSecret: string | null;
  mfaDisabledByAdminAt: Date | null;
  mfaEnrolledAt: Date | null;
};

const mfaUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  mfaMethod: true,
  totpEnabled: true,
  totpSecret: true,
  mfaDisabledByAdminAt: true,
  mfaEnrolledAt: true,
} as const;

export type MfaStatus = {
  enrolled: boolean;
  method: MfaMethod | null;
  methodLabel: string | null;
  disabledByAdmin: boolean;
  enrolledAt: string | null;
  recoveryCodesRemaining: number | null;
};

export async function getMfaStatusForUser(userId: string): Promise<MfaStatus | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: mfaUserSelect });
  if (!user) return null;
  const state = resolveMfaState(user);
  let recoveryCodesRemaining: number | null = null;
  if (state.enrolled && state.method === "AUTHENTICATOR") {
    recoveryCodesRemaining = await prisma.mfaRecoveryCode.count({
      where: { userId, usedAt: null },
    });
  }
  return {
    enrolled: state.enrolled,
    method: state.method,
    methodLabel: state.method ? MFA_METHOD_LABELS[state.method] : null,
    disabledByAdmin: state.disabledByAdmin,
    enrolledAt: user.mfaEnrolledAt?.toISOString() ?? null,
    recoveryCodesRemaining,
  };
}

async function loadUser(userId: string): Promise<MfaUserRow | null> {
  return prisma.user.findUnique({ where: { id: userId }, select: mfaUserSelect });
}

/** Refuse self-service writes when an admin switched the factor off. */
async function assertSelfServiceAllowed(user: MfaUserRow): Promise<void> {
  const allowed = canSelfManageMfa(user);
  if (!allowed.ok) throw new Error(allowed.reason);
}

function buildTotp(email: string, base32: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32),
  });
}

function generateRecoveryCodes(count = 10): string[] {
  // randomBytes(5) -> 10 hex chars -> grouped 4-4-2, e.g. "0123-4567-89".
  return Array.from({ length: count }, () => {
    const hex = randomBytes(5).toString("hex").toUpperCase();
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 10)}`;
  });
}

/**
 * Step 1 of authenticator enrollment. The secret is stored (sealed) but the
 * factor stays inactive until a code from the app proves it was scanned.
 */
export async function beginAuthenticatorEnrollment(
  userId: string,
): Promise<{ secret: string; otpauthUrl: string }> {
  const user = await loadUser(userId);
  if (!user) throw new Error("User not found");
  await assertSelfServiceAllowed(user);
  if (resolveMfaState(user).enrolled) {
    throw new Error("Two-step verification is already enabled. Turn it off first to switch methods.");
  }

  const secret = new OTPAuth.Secret({ size: 20 });
  const sealed = sealSecret(secret.base32);
  if (!sealed) throw new Error("Could not secure the authenticator secret");

  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: sealed, totpEnabled: false, mfaMethod: null, mfaEnrolledAt: null },
  });

  const otp = buildTotp(user.email, secret.base32);
  return { secret: secret.base32, otpauthUrl: otp.toString() };
}

/** Step 2: confirm the authenticator and activate it for this account only. */
export async function confirmAuthenticatorEnrollment(
  userId: string,
  code: string,
): Promise<{ recoveryCodes: string[] }> {
  const user = await loadUser(userId);
  if (!user?.totpSecret) throw new Error("Start enrollment first");
  await assertSelfServiceAllowed(user);

  const base32 = unsealSecret(user.totpSecret);
  if (!base32) throw new Error("Invalid authenticator secret");
  const delta = buildTotp(user.email, base32).validate({ token: code.trim(), window: 1 });
  if (delta === null) throw new Error("Invalid authenticator code");

  const recoveryCodes = generateRecoveryCodes();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        mfaMethod: "AUTHENTICATOR",
        totpEnabled: true,
        mfaEnrolledAt: new Date(),
        mfaDisabledByAdminAt: null,
      },
    }),
    prisma.mfaRecoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.mfaRecoveryCode.createMany({
      data: recoveryCodes.map((recovery) => ({
        id: `mfa_${randomBytes(10).toString("hex")}`,
        userId: user.id,
        codeHash: hashRecoveryCode(recovery),
      })),
    }),
  ]);

  await writeSecurityAuditLog({
    action: "mfa.enrolled",
    actorId: user.id,
    actorRole: user.role,
    meta: { method: "AUTHENTICATOR" },
  });
  return { recoveryCodes };
}

/**
 * Switch this account to email codes. No pending secret is stored: the factor
 * only needs the configured sender and the account's own address.
 */
export async function enableEmailOtpMfa(userId: string): Promise<void> {
  const user = await loadUser(userId);
  if (!user) throw new Error("User not found");
  await assertSelfServiceAllowed(user);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        mfaMethod: "EMAIL_OTP",
        totpEnabled: false,
        totpSecret: null,
        mfaEnrolledAt: new Date(),
        mfaDisabledByAdminAt: null,
      },
    }),
    prisma.mfaRecoveryCode.deleteMany({ where: { userId: user.id } }),
  ]);

  await writeSecurityAuditLog({
    action: "mfa.enrolled",
    actorId: user.id,
    actorRole: user.role,
    meta: { method: "EMAIL_OTP" },
  });
}

/**
 * Clear every factor on one account.
 *
 * `reason` is recorded for the audit trail; `byAdmin` also sets the lock that
 * stops the user re-enrolling until an administrator lifts it.
 */
export async function clearUserMfa(
  userId: string,
  options: {
    byAdmin?: boolean;
    actor?: { id: string; role?: string | null };
    reason: string;
  },
): Promise<void> {
  const user = await loadUser(userId);
  if (!user) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        mfaMethod: null,
        totpEnabled: false,
        totpSecret: null,
        mfaEnrolledAt: null,
        mfaDisabledByAdminAt: options.byAdmin ? new Date() : null,
        // A password reset also ends any forced password change.
        ...(options.reason === "PASSWORD_RESET" ? { mustChangePassword: false } : {}),
      },
    }),
    prisma.mfaRecoveryCode.deleteMany({ where: { userId: user.id } }),
  ]);

  await writeSecurityAuditLog({
    action: "mfa.disabled",
    actorId: user.id,
    actorRole: user.role,
    meta: {
      reason: options.reason,
      clearedBy: options.actor?.id ?? null,
      clearedByRole: options.actor?.role ?? null,
      byAdmin: Boolean(options.byAdmin),
    },
  });
}

function verifyTotpFor(user: MfaUserRow, code: string): boolean {
  if (user.mfaMethod !== "AUTHENTICATOR" || !user.totpSecret) return false;
  const base32 = unsealSecret(user.totpSecret);
  if (!base32) return false;
  try {
    return buildTotp(user.email, base32).validate({ token: code.trim(), window: 1 }) !== null;
  } catch {
    return false;
  }
}

/** Verify an authenticator code (or one unused recovery code) for one account. */
export async function verifyAuthenticatorCode(
  userId: string,
  code: string,
): Promise<{ ok: true; usedRecoveryCode: boolean } | { ok: false }> {
  const user = await loadUser(userId);
  if (!user) return { ok: false };
  const state = resolveMfaState(user);
  if (!state.enrolled || state.method !== "AUTHENTICATOR") return { ok: false };

  if (isSixDigitOtp(code) && verifyTotpFor(user, code)) {
    return { ok: true, usedRecoveryCode: false };
  }

  const codeHash = hashRecoveryCode(code);
  const recovery = await prisma.mfaRecoveryCode.findFirst({
    where: { userId, codeHash, usedAt: null },
  });
  if (!recovery) return { ok: false };
  await prisma.mfaRecoveryCode.update({
    where: { id: recovery.id },
    data: { usedAt: new Date() },
  });
  await writeSecurityAuditLog({
    action: "mfa.recovery_used",
    actorId: user.id,
    actorRole: user.role,
  });
  return { ok: true, usedRecoveryCode: true };
}

/** Re-authentication for turning MFA off: current password, authenticator or recovery code. */
export async function verifyMfaDisableReauth(
  userId: string,
  input: { password?: string; mfaCode?: string },
): Promise<boolean> {
  if (input.password?.trim()) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) return false;
    const bcrypt = await import("bcryptjs");
    if (await bcrypt.compare(input.password, user.passwordHash)) return true;
  }
  if (input.mfaCode?.trim()) {
    const result = await verifyAuthenticatorCode(userId, input.mfaCode);
    return result.ok;
  }
  return false;
}

/** Self-service "turn off my MFA", after re-authentication. */
export async function disableOwnMfa(
  userId: string,
  input: { password?: string; mfaCode?: string },
): Promise<void> {
  const user = await loadUser(userId);
  if (!user) throw new Error("User not found");
  await assertSelfServiceAllowed(user);
  const ok = await verifyMfaDisableReauth(userId, input);
  if (!ok) throw new Error("Confirm your password or a current code to turn MFA off.");
  await clearUserMfa(userId, { reason: "SELF_DISABLED" });
  await bumpUserSessionVersion(userId);
}

/** Admin-side switch-on for a customer/admin (no user re-authentication needed). */
export async function enableEmailOtpMfaAsAdmin(
  targetUserId: string,
  actor: { id: string; role: string },
): Promise<void> {
  await enableEmailOtpMfa(targetUserId);
  await writeSecurityAuditLog({
    action: "admin.mfa.enabled",
    actorId: actor.id,
    actorRole: actor.role,
    meta: { targetUserId },
  });
}

/** Admin-side switch-off. Sets the lock so the user cannot simply re-enable. */
export async function disableMfaAsAdmin(
  targetUserId: string,
  actor: { id: string; role: string },
): Promise<void> {
  await clearUserMfa(targetUserId, { byAdmin: true, actor, reason: "ADMIN_DISABLED" });
  await bumpUserSessionVersion(targetUserId);
  await writeSecurityAuditLog({
    action: "admin.mfa.disabled",
    actorId: actor.id,
    actorRole: actor.role,
    meta: { targetUserId },
  });
}

/** Lift the admin lock without enrolling a method, so the user may choose one. */
export async function allowMfaSelfService(
  targetUserId: string,
  actor: { id: string; role: string },
): Promise<void> {
  const user = await loadUser(targetUserId);
  if (!user) throw new Error("User not found");
  if (!user.mfaDisabledByAdminAt) return;
  await prisma.user.update({
    where: { id: targetUserId },
    data: { mfaDisabledByAdminAt: null },
  });
  await writeSecurityAuditLog({
    action: "admin.mfa.self_service_enabled",
    actorId: actor.id,
    actorRole: actor.role,
    meta: { targetUserId },
  });
}
