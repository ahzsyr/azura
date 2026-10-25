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
import { PASSWORD_REUSE_ERROR, isPasswordReused } from "@/lib/security/password-reuse.server";

export async function updateAdminCredentials(
  input: unknown
): Promise<
  ActionResult<{
    email: string;
    pendingEmail?: string | null;
    requiresRelogin?: boolean;
    /** Set when the confirmation email went out but a secondary notice failed. */
    warning?: string;
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
    let warning: string | undefined;
    /** Only a change requested in THIS submit can be announced as "sent". */
    let emailChangeRequested = false;

    if (data.newEmail && data.newEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      const change = await startEmailChange({
        userId: user.id,
        currentPassword: data.currentPassword,
        newEmail: data.newEmail.trim(),
        locale: "en",
      });
      if ("error" in change) return fail(change.error);
      pendingEmail = change.pendingEmail;
      warning = change.warning;
      emailChangeRequested = true;
    }

    if (data.newPassword) {
      // Reuse guard: the new admin password must differ from the current one.
      if (await isPasswordReused(data.newPassword, user.passwordHash)) {
        return fail(PASSWORD_REUSE_ERROR);
      }
      const previousHash = user.passwordHash;
      const passwordHash = await bcrypt.hash(data.newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: false,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      const stored = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });
      const saved =
        Boolean(stored?.passwordHash) &&
        (await bcrypt.compare(data.newPassword, stored!.passwordHash));
      if (!saved) {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: previousHash },
        });
        return fail("Password could not be saved. Your previous password is still active.");
      }
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
      // Returning a pending address that was not sent in this submit would make
      // the client announce a confirmation email that never happened.
      pendingEmail: emailChangeRequested
        ? (refreshed?.pendingEmail ?? pendingEmail ?? null)
        : null,
      requiresRelogin,
      warning,
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
