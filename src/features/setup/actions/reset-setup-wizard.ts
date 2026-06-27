"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/auth/guards";
import { resetSetupWizard } from "@/features/setup/reset-setup.service";
import { SETUP_COMPLETE_COOKIE } from "@/features/setup/setup-cookie";
import type { ActionResult } from "@/types/api";
import { fail, ok } from "@/types/api";

export async function resetSetupWizardAction(input: {
  confirmText: string;
}): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    await requireAdmin();
    if (input.confirmText.trim().toUpperCase() !== "RESET") {
      return fail('Type RESET to confirm.');
    }
    await resetSetupWizard();
    const cookieStore = await cookies();
    cookieStore.delete(SETUP_COMPLETE_COOKIE);
    return ok({ redirectTo: "/setup" });
  } catch {
    return fail("Unauthorized or reset failed.");
  }
}

export async function resetSetupWizardAndRedirect(confirmText: string) {
  const result = await resetSetupWizardAction({ confirmText });
  if (!result.success) {
    return result;
  }
  redirect(result.data?.redirectTo ?? "/setup");
}
