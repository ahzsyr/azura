"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/features/auth/guards";
import type {
  CaptchaSettingsPublic,
  SaveCaptchaSettingsInput,
} from "@/features/captcha/captcha.schema";

export type CaptchaActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function fail(message: string): { success: false; error: string } {
  return {
    success: false,
    error: message === "Forbidden" ? "Only the Master Admin can change captcha settings." : message,
  };
}

export async function getCaptchaSettingsAction(): Promise<CaptchaActionResult<CaptchaSettingsPublic>> {
  try {
    await requireSuperAdmin();
    const { getCaptchaSettingsPublic } = await import("@/features/captcha/captcha.service");
    return { success: true, data: await getCaptchaSettingsPublic() };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not load captcha settings");
  }
}

export async function saveCaptchaSettingsAction(
  input: SaveCaptchaSettingsInput,
): Promise<CaptchaActionResult<CaptchaSettingsPublic>> {
  try {
    await requireSuperAdmin();
    const { saveCaptchaSettings } = await import("@/features/captcha/captcha.service");
    const data = await saveCaptchaSettings(input);
    revalidatePath("/admin/settings/captcha");
    revalidatePath("/admin/settings");
    return { success: true, data };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not save captcha settings");
  }
}

export async function verifyCaptchaKeysAction(): Promise<CaptchaActionResult<{ ok: boolean; message: string }>> {
  try {
    await requireSuperAdmin();
    const { verifyTurnstileKeys } = await import("@/features/captcha/captcha.service");
    const result = await verifyTurnstileKeys();
    return { success: true, data: result };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not verify captcha keys");
  }
}
