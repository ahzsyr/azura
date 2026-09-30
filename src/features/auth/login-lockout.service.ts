import "server-only";

import { prisma } from "@/lib/prisma";
import {
  LOGIN_LOCKOUT_MS,
  LOGIN_LOCKOUT_THRESHOLD,
  isAccountDisabled,
  isAccountTemporarilyLocked,
} from "@/features/auth/account-status";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { bumpUserSessionVersion } from "@/lib/session-version";

export {
  LOGIN_LOCKOUT_MS,
  LOGIN_LOCKOUT_THRESHOLD,
  isAccountDisabled,
  isAccountTemporarilyLocked,
};

/** Atomically increment failed password attempts; set lockedUntil when threshold reached. */
export async function recordFailedPasswordAttempt(
  userId: string,
  ip?: string | null,
): Promise<void> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true, role: true },
  });

  if (updated.failedLoginCount >= LOGIN_LOCKOUT_THRESHOLD) {
    const lockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_MS);
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil },
    });
    await writeSecurityAuditLog({
      action: "auth.account.locked",
      actorId: userId,
      actorRole: updated.role,
      ip,
      meta: { reason: "ACCOUNT_LOCKED", failedLoginCount: updated.failedLoginCount },
    });
  }
}

/** Clear lockout counters only after a full successful login (post-MFA when required). */
export async function clearLoginLockout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
}

/** Disable a CUSTOMER account and revoke existing sessions. */
export async function disableCustomerAccount(
  customerId: string,
  actor: { id: string; role: string },
  ip?: string | null,
): Promise<void> {
  await prisma.user.update({
    where: { id: customerId, role: "CUSTOMER" },
    data: { disabledAt: new Date() },
  });
  await bumpUserSessionVersion(customerId);
  await writeSecurityAuditLog({
    action: "auth.account.disabled",
    actorId: actor.id,
    actorRole: actor.role,
    ip,
    meta: { targetUserId: customerId, reason: "ACCOUNT_DISABLED" },
  });
  await writeSecurityAuditLog({
    action: "auth.session.revoked",
    actorId: actor.id,
    actorRole: actor.role,
    ip,
    meta: { targetUserId: customerId, reason: "ACCOUNT_DISABLED" },
  });
}

export async function enableCustomerAccount(
  customerId: string,
  actor: { id: string; role: string },
  ip?: string | null,
): Promise<void> {
  await prisma.user.update({
    where: { id: customerId, role: "CUSTOMER" },
    data: { disabledAt: null, failedLoginCount: 0, lockedUntil: null },
  });
  await writeSecurityAuditLog({
    action: "auth.account.disabled",
    actorId: actor.id,
    actorRole: actor.role,
    ip,
    meta: { targetUserId: customerId, reason: "ACCOUNT_ENABLED" },
  });
}
