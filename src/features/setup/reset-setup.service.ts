import "server-only";

import { prisma } from "@/lib/prisma";
import { invalidateSetupStatusCache } from "@/features/setup/setup-middleware-cache";
import { writeSystemSettings } from "@/features/setup/setup.service";

export async function resetSetupWizard(): Promise<void> {
  await writeSystemSettings({
    setupComplete: false,
    completedAt: undefined,
    comingSoonEnabled: false,
  });
  await prisma.user.deleteMany({ where: { role: "ADMIN" } });
  invalidateSetupStatusCache();
}
