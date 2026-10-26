"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin, requireSuperAdmin } from "@/features/auth/guards";
import {
  canChangeRole,
  canManageUser,
  canManageUserSecurity,
  ROLE_NOT_PERMITTED_MESSAGE,
  ROLE_SELF_MESSAGE,
  isSuperAdminRole,
} from "@/features/auth/role-policy";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { usersService } from "@/features/account/users.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import type {
  AdminAuthSettings,
  EmailVerificationSettings,
  PasswordResetSettings,
} from "@/features/account/account-settings.schema";
import { sendPasswordResetCodeToUser } from "@/features/account/password-reset.service";
import { clearUserMfa } from "@/features/auth/mfa-totp.service";
import { bumpUserSessionVersion } from "@/lib/session-version";
import { getTrustedClientIp } from "@/lib/client-ip";
import { writeSecurityAuditLog } from "@/lib/security-audit";

export type ActionResult =
  | { success: true; sent?: boolean }
  | { success: false; error: string };

function ok(extra?: { sent?: boolean }): ActionResult {
  return extra ? { success: true, ...extra } : { success: true };
}

function fail(message: string): ActionResult {
  return { success: false, error: message };
}

async function actorContext() {
  const session = await requireAdmin();
  const h = await headers();
  return {
    session,
    ip: getTrustedClientIp(new Request("http://local", { headers: h })),
  };
}

/**
 * Load the target and apply the hierarchy rule on the server.
 *
 * An Admin can only act on normal users; the Super Admin can act on Admins as
 * well. A same-ranked or higher-ranked target — including the Super Admin —
 * answers exactly like a missing one, so the admin surface cannot be used to
 * probe for other privileged accounts.
 */
async function loadManageableTarget(
  actor: { id: string; role: string },
  targetUserId: string,
): Promise<{ ok: true; target: { id: string; role: string; email: string } } | { ok: false; error: string }> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, email: true, disabledAt: true },
  });
  if (
    !target ||
    !canManageUser({
      actorId: actor.id,
      actorRole: actor.role,
      targetId: target.id,
      targetRole: target.role,
    })
  ) {
    return { ok: false, error: ROLE_NOT_PERMITTED_MESSAGE };
  }
  return { ok: true, target };
}

function revalidateUser(userId: string) {
  revalidatePath("/admin/settings/users");
  revalidatePath(`/admin/settings/users/${userId}`);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function updateCustomerUserAction(
  userId: string,
  payload: unknown,
): Promise<ActionResult> {
  try {
    const { session } = await actorContext();
    const gate = await loadManageableTarget(session.user, userId);
    if (!gate.ok) return fail(gate.error);
    await usersService.updateCustomer(userId, payload);
    revalidateUser(userId);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed");
  }
}

export async function setCustomerPasswordAction(
  userId: string,
  payload: unknown,
): Promise<ActionResult> {
  try {
    const { session } = await actorContext();
    const gate = await loadManageableTarget(session.user, userId);
    if (!gate.ok) return fail(gate.error);
    await usersService.setCustomerPassword(userId, payload);
    revalidateUser(userId);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Password update failed");
  }
}

/**
 * Send a reset code to an eligible account.
 *
 * Admins may reset passwords for normal users. A Super Admin may do the same
 * for another Admin — never for themselves through this surface (they use the
 * public flow, which goes to their own inbox anyway).
 */
export async function sendCustomerPasswordResetAction(
  userId: string,
): Promise<ActionResult> {
  try {
    const { session, ip } = await actorContext();
    const gate = await loadManageableTarget(session.user, userId);
    if (!gate.ok) return fail(gate.error);

    const result = await sendPasswordResetCodeToUser(gate.target.id, { ip });
    if ("error" in result) return fail(result.error);

    await writeSecurityAuditLog({
      action: "admin.user.password_reset.sent",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip,
      meta: { targetUserId: gate.target.id },
    });
    revalidateUser(gate.target.id);
    return ok({ sent: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not send reset code");
  }
}

export async function setCustomerDisabledAction(
  userId: string,
  disabled: boolean,
): Promise<ActionResult> {
  try {
    const { session, ip } = await actorContext();
    const gate = await loadManageableTarget(session.user, userId);
    if (!gate.ok) return fail(gate.error);
    await usersService.setCustomerDisabled(userId, disabled, {
      id: session.user.id,
      role: session.user.role,
    });
    await writeSecurityAuditLog({
      action: disabled ? "admin.user.disabled" : "admin.user.enabled",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip,
      meta: { targetUserId: gate.target.id },
    });
    revalidateUser(userId);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not update account status");
  }
}

/**
 * Promote a customer to Admin, or demote an Admin back to a normal user.
 *
 * Super Admin only — an Admin can never grant the admin role to anyone,
 * including themselves. The target must rank strictly below the actor, so the
 * Super Admin is never promoted/demoted through this action.
 */
export async function changeUserRoleAction(
  userId: string,
  nextRole: "CUSTOMER" | "ADMIN",
): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    const h = await headers();
    const ip = getTrustedClientIp(new Request("http://local", { headers: h }));

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });
    // Self-changes are reported distinctly: it is a known, deliberate rule
    // rather than a hidden account.
    if (target && target.id === session.user.id) return fail(ROLE_SELF_MESSAGE);
    if (
      !target ||
      !canChangeRole({
        actorId: session.user.id,
        actorRole: session.user.role,
        targetId: target.id,
        targetRole: target.role,
        nextRole,
      })
    ) {
      return fail(ROLE_NOT_PERMITTED_MESSAGE);
    }

    const previousRole = target.role;
    await prisma.user.update({
      where: { id: target.id },
      data: {
        role: nextRole,
        // Dashboard section grants only describe Admins. `null` (SQL NULL)
        // means "every section", so a promoted Admin starts with full access
        // and a demoted user retains no admin grant for a later re-promotion
        // made without a review.
        adminSectionGrants: Prisma.DbNull,
      },
    });

    // Role lives in the session token: end every session so the new role takes
    // effect on the next sign-in.
    await bumpUserSessionVersion(target.id);

    await writeSecurityAuditLog({
      action: nextRole === "ADMIN" ? "admin.promoted" : "admin.demoted",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip,
      meta: { targetUserId: target.id, from: previousRole, to: nextRole },
    });
    await writeSecurityAuditLog({
      action: "auth.session.revoked",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip,
      meta: { targetUserId: target.id, reason: "ROLE_CHANGED" },
    });

    revalidateUser(target.id);
    revalidatePath("/admin/settings/staff");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not change the role");
  }
}

/** Master Admin only — customer password-reset sender + templates. */
export async function savePasswordResetSettingsAction(
  payload: Partial<PasswordResetSettings>,
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    await accountSettingsService.savePasswordReset(payload);
    revalidatePath("/admin/settings/portal");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Save failed");
  }
}

/** Master Admin only — customer registration OTP sender. */
export async function saveEmailVerificationSettingsAction(
  payload: Partial<EmailVerificationSettings>,
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    await accountSettingsService.saveEmailVerification(payload);
    revalidatePath("/admin/settings/portal");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Save failed");
  }
}

/**
 * Master Admin only — the OTP email account used for every authentication
 * message (verification, email MFA, password reset).
 */
export async function saveAdminAuthSettingsAction(
  payload: Partial<AdminAuthSettings>,
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    await accountSettingsService.saveAdminAuth(payload);
    revalidatePath("/admin/settings/account");
    revalidatePath("/admin/settings/portal");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Save failed");
  }
}

/**
 * Master Admin — send an Admin (or Super Admin) password reset. Sender is the
 * configured OTP email account, shared with the customer flow.
 *
 * The request is deliberate, not social engineering: only an admin who can
 * already change this account (the Super Admin) can make it send, and the
 * recipient is always the target's own registered inbox.
 */
export async function sendAdminPasswordResetAction(
  userId: string,
): Promise<ActionResult> {
  try {
    const { session, ip } = await actorContext();
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true, disabledAt: true },
    });
    if (!target || target.id === session.user.id) {
      return fail(
        target?.id === session.user.id
          ? "Use the public reset form to reset your own password."
          : ROLE_NOT_PERMITTED_MESSAGE,
      );
    }
    if (!isSuperAdminRole(session.user.role)) return fail(ROLE_NOT_PERMITTED_MESSAGE);
    if (target.disabledAt) return fail("This account is disabled.");
    if (
      !canManageUserSecurity({
        actorId: session.user.id,
        actorRole: session.user.role,
        targetId: target.id,
        targetRole: target.role,
      })
    ) {
      return fail(ROLE_NOT_PERMITTED_MESSAGE);
    }

    const result = await sendPasswordResetCodeToUser(target.id, { ip });
    if ("error" in result) return fail(result.error);

    await writeSecurityAuditLog({
      action: "admin.user.password_reset.sent",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip,
      meta: { targetUserId: target.id, audience: target.role },
    });
    revalidateUser(target.id);
    return ok({ sent: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not send reset code");
  }
}

/**
 * Explicit admin "reset password + MFA" for a manageable user: revoke sessions,
 * clear MFA enrollment and require a fresh password change. Used by the Super
 * Admin for Admins and by either admin role for customers.
 */
export async function resetUserSecurityAction(
  userId: string,
): Promise<ActionResult> {
  try {
    const { session, ip } = await actorContext();
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });
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

    await prisma.user.update({
      where: { id: target.id },
      data: { mustChangePassword: true },
    });
    await clearUserMfa(target.id, {
      byAdmin: false,
      actor: { id: session.user.id, role: session.user.role },
      reason: "ADMIN_SECURITY_RESET",
    });
    await bumpUserSessionVersion(target.id);

    await writeSecurityAuditLog({
      action: "admin.user.security_reset",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip,
      meta: { targetUserId: target.id, targetRole: target.role },
    });
    await writeSecurityAuditLog({
      action: "auth.session.revoked",
      actorId: session.user.id,
      actorRole: session.user.role,
      ip,
      meta: { targetUserId: target.id, reason: "ADMIN_SECURITY_RESET" },
    });

    revalidateUser(target.id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not reset the account security");
  }
}
