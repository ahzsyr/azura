"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/auth/guards";
import { updateAdminCredentialsSchema } from "@/features/setup/setup-complete.schema";
import type { ActionResult } from "@/types/api";
import { ok, fail } from "@/types/api";

export async function updateAdminCredentials(
  input: unknown
): Promise<ActionResult<{ email: string }>> {
  try {
    const session = await requireAdmin();
    const data = updateAdminCredentialsSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) return fail("User not found");

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) return fail("Current password is incorrect");

    if (data.newEmail && data.newEmail !== user.email) {
      const taken = await prisma.user.findUnique({ where: { email: data.newEmail } });
      if (taken) return fail("Email is already in use");
    }

    const update: { email?: string; passwordHash?: string } = {};
    if (data.newEmail) update.email = data.newEmail;
    if (data.newPassword) {
      update.passwordHash = await bcrypt.hash(data.newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: update,
    });

    return ok({ email: updated.email });
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
