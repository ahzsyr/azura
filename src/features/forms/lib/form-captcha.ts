import "server-only";

import type { FormCaptchaPolicy } from "@/features/forms/types";

/**
 * A form's captcha override, read from the stored document envelope.
 *
 * Missing / invalid values resolve to `inherit`, which follows
 * Admin → Settings → Captcha. Unknown template ids are not an error here — the
 * submit route reports "Form template not found" separately.
 */
export async function readFormCaptchaOverride(
  templateId: string,
): Promise<FormCaptchaPolicy | undefined> {
  try {
    const { getFormTemplateById } = await import("@/features/forms/form-template.service");
    const template = await getFormTemplateById(templateId);
    const value = template?.definition?.captcha;
    return value === "on" || value === "off" || value === "inherit" ? value : undefined;
  } catch {
    return undefined;
  }
}
