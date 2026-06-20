"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { refreshMiddlewareManifestBestEffort } from "@/features/setup/refresh-middleware-manifest.server";
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
    await refreshMiddlewareManifestBestEffort("portal settings update");
    revalidatePath("/admin/settings/portal");
    return ok({ registrationEnabled: next.registrationEnabled });
  } catch {
    return fail("Unauthorized");
  }
}
