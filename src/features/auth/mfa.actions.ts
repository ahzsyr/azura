"use server";

import { requireAdmin } from "@/features/auth/guards";
import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  disableTotpWithReauth,
  userRequiresTotp,
} from "@/features/auth/mfa.service";
import { prisma } from "@/lib/prisma";
import { fail, ok, type ActionResult } from "@/types/api";

export async function getAdminMfaStatusAction(): Promise<
  ActionResult<{ totpEnabled: boolean }>
> {
  try {
    const session = await requireAdmin();
    const totpEnabled = await userRequiresTotp(session.user.id);
    return ok({ totpEnabled });
  } catch {
    return fail("Unable to load MFA status");
  }
}

export async function startAdminMfaEnrollmentAction(): Promise<
  ActionResult<{ secret: string; otpauthUrl: string }>
> {
  try {
    const session = await requireAdmin();
    const data = await beginTotpEnrollment(session.user.id, session.user.email ?? "admin");
    return ok(data);
  } catch {
    return fail("Unable to start MFA enrollment");
  }
}

export async function confirmAdminMfaEnrollmentAction(input: {
  code: string;
}): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  try {
    const session = await requireAdmin();
    const data = await confirmTotpEnrollment(session.user.id, input.code);
    return ok(data);
  } catch {
    return fail("Invalid authenticator code");
  }
}

export async function disableAdminMfaAction(input: {
  password?: string;
  mfaCode?: string;
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requireAdmin();
    await disableTotpWithReauth(session.user.id, {
      password: input.password,
      mfaCode: input.mfaCode,
    });
    return ok({ ok: true });
  } catch {
    return fail("Unable to disable MFA — confirm password or authenticator code");
  }
}

export async function getAdminMfaEnabledFlag(): Promise<boolean> {
  const session = await requireAdmin();
  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpEnabled: true },
  });
  return Boolean(row?.totpEnabled);
}
