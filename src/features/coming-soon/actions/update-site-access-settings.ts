"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { invalidateSetupStatusCache } from "@/features/setup/setup-middleware-cache";
import { writeSystemSettings } from "@/features/setup/setup.service";
import type { ActionResult } from "@/types/api";
import { ok, fail } from "@/types/api";

export async function updateSiteAccessSettings(input: {
  comingSoonEnabled: boolean;
}): Promise<ActionResult<{ comingSoonEnabled: boolean }>> {
  try {
    await requireAdmin();
    const next = await writeSystemSettings({
      comingSoonEnabled: input.comingSoonEnabled,
    });
    invalidateSetupStatusCache();
    revalidatePath("/admin/settings/site");
    revalidatePath("/coming-soon");
    revalidatePath("/", "layout");
    return ok({ comingSoonEnabled: next.comingSoonEnabled });
  } catch {
    return fail("Unauthorized");
  }
}
