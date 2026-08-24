"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/auth/guards";
import { updateAdminCredentialsSchema } from "@/features/setup/setup-complete.schema";
import type { ActionResult } from "@/types/api";
import { ok, fail } from "@/types/api";
import { bumpUserSessionVersion } from "@/lib/session-version";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { startEmailChange } from "@/features/account/email-change.service";

export async function updateAdminCredentials(
  input: unknown
): Promise<
  ActionResult<{
    email: string;
    pendingEmail?: string | null;
    requiresRelogin?: boolean;
  }>
> {
  try {
    const session = await requireAdmin();
    const data = updateAdminCredentialsSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) return fail("User not found");

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) return fail("Current password is incorrect");

    let pendingEmail: string | null | undefined = user.pendingEmail;
    let requiresRelogin = false;

    if (data.newEmail && data.newEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      const change = await startEmailChange({
        userId: user.id,
        currentPassword: data.currentPassword,
        newEmail: data.newEmail.trim(),
        locale: "en",
      });
      if ("error" in change) return fail(change.error);
      pendingEmail = change.pendingEmail;
    }

    if (data.newPassword) {
      const passwordHash = await bcrypt.hash(data.newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      });
      await bumpUserSessionVersion(user.id);
      requiresRelogin = true;
      await writeSecurityAuditLog({
        action: "auth.password.changed",
        actorId: user.id,
        actorRole: user.role,
      });
      await writeSecurityAuditLog({
        action: "auth.session.revoked",
        actorId: user.id,
        actorRole: user.role,
        meta: { reason: "PASSWORD_CHANGED" },
      });
    }

    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, pendingEmail: true },
    });

    return ok({
      email: refreshed?.email ?? user.email,
      pendingEmail: refreshed?.pendingEmail ?? pendingEmail ?? null,
      requiresRelogin,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return fail("Unauthorized");
    }
    if (e instanceof Error && e.message === "Forbidden") {
      return fail("Forbidden");
    }
    return fail("Invalid input");
  }
}
