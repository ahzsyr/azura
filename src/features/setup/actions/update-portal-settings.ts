"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { writeSystemSettings } from "@/features/setup/setup.service";
import type { ActionResult } from "@/types/api";
import { ok, fail } from "@/types/api";

export async function updatePortalSettings(input: {
  registrationEnabled: boolean;
}): Promise<ActionResult<{ registrationEnabled: boolean }>> {
  try {
    await requireAdmin();
    const next = await writeSystemSettings({
      registrationEnabled: input.registrationEnabled,
    });
    revalidatePath("/admin/settings/portal");
    return ok({ registrationEnabled: next.registrationEnabled });
  } catch {
    return fail("Unauthorized");
  }
}
