"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/auth/guards";
import {
  canManageUser,
  canManageUserSecurity,
  ROLE_NOT_PERMITTED_MESSAGE,
} from "@/features/auth/role-policy";
import {
  disableMfaAsAdmin,
  enableEmailOtpMfaAsAdmin,
  getMfaStatusForUser,
  allowMfaSelfService,
  type MfaStatus,
} from "@/features/auth/mfa-totp.service";
import { getTrustedClientIp } from "@/lib/client-ip";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { fail, ok, type ActionResult } from "@/types/api";

/**
 * Administrator control over another user's MFA.
 *
 * The hierarchy check runs on the server for every call: an Admin can manage
 * normal users only, the Super Admin can manage Admins, and targeting a
 * same-or-higher-ranked account (or oneself) is refused with the same generic
 * message as a missing account.
 */

async function actorIp(): Promise<string | null> {
  const h = await headers();
  return getTrustedClientIp(new Request("http://local", { headers: h }));
}

async function loadTarget(targetUserId: string) {
  return prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, email: true },
  });
}

function revalidateUser(targetUserId: string) {
  revalidatePath("/admin/settings/users");
  revalidatePath(`/admin/settings/users/${targetUserId}`);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function getUserMfaStatusAction(
  targetUserId: string,
): Promise<ActionResult<MfaStatus>> {
  try {
    const session = await requireAdmin();
    const target = await loadTarget(targetUserId);
    if (
      !target ||
      !canManageUser({
        actorId: session.user.id,
        actorRole: session.user.role,
        targetId: target.id,
        targetRole: target.role,
      })
    ) {
      return fail(ROLE_NOT_PERMITTED_MESSAGE);
    }
    const status = await getMfaStatusForUser(target.id);
    if (!status) return fail("User not found");
    return ok(status);
  } catch {
    return fail(ROLE_NOT_PERMITTED_MESSAGE);
  }
}

export async function enableUserEmailMfaAction(
  targetUserId: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requireAdmin();
    const target = await loadTarget(targetUserId);
    if (
      !target ||
      !canManageUserSecurity({
        actorId: session.user.id,
        actorRole: session.user.role,
        targetId: target.id,
        targetRole: target.role,
      })
    ) {
      return fail(ROLE_NOT_PERMITTED_MESSAGE);
    }
    await enableEmailOtpMfaAsAdmin(target.id, { id: session.user.id, role: session.user.role });
    await writeSecurityAuditLog({
      action: "admin.user.mfa.enabled",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip: await actorIp(),
      meta: { targetUserId: target.id },
    });
    revalidateUser(target.id);
    return ok({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not enable MFA");
  }
}

export async function disableUserMfaAction(
  targetUserId: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requireAdmin();
    const target = await loadTarget(targetUserId);
    if (
      !target ||
      !canManageUserSecurity({
        actorId: session.user.id,
        actorRole: session.user.role,
        targetId: target.id,
        targetRole: target.role,
      })
    ) {
      return fail(ROLE_NOT_PERMITTED_MESSAGE);
    }
    await disableMfaAsAdmin(target.id, { id: session.user.id, role: session.user.role });
    await writeSecurityAuditLog({
      action: "admin.user.mfa.disabled",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip: await actorIp(),
      meta: { targetUserId: target.id },
    });
    revalidateUser(target.id);
    return ok({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not disable MFA");
  }
}

export async function allowUserMfaSelfServiceAction(
  targetUserId: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requireAdmin();
    const target = await loadTarget(targetUserId);
    if (
      !target ||
      !canManageUserSecurity({
        actorId: session.user.id,
        actorRole: session.user.role,
        targetId: target.id,
        targetRole: target.role,
      })
    ) {
      return fail(ROLE_NOT_PERMITTED_MESSAGE);
    }
    await allowMfaSelfService(target.id, { id: session.user.id, role: session.user.role });
    revalidateUser(target.id);
    return ok({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not update MFA policy");
  }
}
