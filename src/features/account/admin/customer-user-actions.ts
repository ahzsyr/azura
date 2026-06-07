"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { usersService } from "@/features/account/users.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import type { PasswordResetSettings } from "@/features/account/account-settings.schema";

export type ActionResult = { success: true } | { success: false; error: string };

function ok(): ActionResult {
  return { success: true };
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
    await usersService.triggerPasswordReset(userId, locale);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not send reset email");
  }
}

export async function savePasswordResetSettingsAction(
  payload: Partial<PasswordResetSettings>
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await accountSettingsService.savePasswordReset(payload);
    revalidatePath("/admin/settings/portal");
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Save failed");
  }
}
