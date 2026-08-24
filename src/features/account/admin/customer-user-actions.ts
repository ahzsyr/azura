"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperAdmin } from "@/features/auth/guards";
import { usersService } from "@/features/account/users.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import type {
  AdminAuthSettings,
  EmailVerificationSettings,
  PasswordResetSettings,
} from "@/features/account/account-settings.schema";
import { sendAdminPasswordResetForUser } from "@/features/account/password-reset.service";

export type ActionResult =
  | { success: true; sent?: boolean }
  | { success: false; error: string };

function ok(extra?: { sent?: boolean }): ActionResult {
  return extra ? { success: true, ...extra } : { success: true };
}

function fail(message: string): ActionResult {
  return { success: false, error: message };
}

export async function updateCustomerUserAction(
  userId: string,
  payload: unknown
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await usersService.updateCustomer(userId, payload);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Update failed");
  }
}

export async function setCustomerPasswordAction(
  userId: string,
  payload: unknown
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await usersService.setCustomerPassword(userId, payload);
    revalidatePath(`/admin/users/${userId}`);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Password update failed");
  }
}

export async function sendCustomerPasswordResetAction(
  userId: string,
  locale = "en"
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const result = await usersService.triggerPasswordReset(userId, locale);
    if (result && "sent" in result && result.sent === false) {
      return fail("Reset email could not be sent. Check Email Accounts / provider config.");
    }
    return ok({ sent: result?.sent });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not send reset email");
  }
}

export async function setCustomerDisabledAction(
  userId: string,
  disabled: boolean,
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    await usersService.setCustomerDisabled(userId, disabled, {
      id: session.user.id,
      role: session.user.role,
    });
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not update account status");
  }
}

/** Master Admin only — customer password-reset sender + templates. */
export async function savePasswordResetSettingsAction(
  payload: Partial<PasswordResetSettings>
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
  payload: Partial<EmailVerificationSettings>
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

/** Master Admin only — admin OTP + admin password-reset senders. */
export async function saveAdminAuthSettingsAction(
  payload: Partial<AdminAuthSettings>
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    await accountSettingsService.saveAdminAuth(payload);
    revalidatePath("/admin/settings/account");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Save failed");
  }
}

/** Master Admin — send admin password reset using adminAuth sender only. */
export async function sendAdminPasswordResetAction(
  userId: string,
  locale = "en",
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const result = await sendAdminPasswordResetForUser(userId, locale);
    if ("error" in result) return fail(result.error);
    return ok({ sent: result.sent });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not send reset email");
  }
}
