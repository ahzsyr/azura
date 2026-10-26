"use server";

import { requireSession } from "@/features/auth/guards";
import {
  beginAuthenticatorEnrollment,
  confirmAuthenticatorEnrollment,
  disableOwnMfa,
  getMfaStatusForUser,
} from "@/features/auth/mfa-totp.service";
import { renderTotpQrSvg } from "@/features/auth/totp-qr";
import { fail, ok, type ActionResult } from "@/types/api";

/**
 * Admin-panel MFA actions. These are aliases of the self-service actions:
 * the target is always the signed-in account, so an admin can only change
 * their own factor here. Administrator control over *other* accounts lives in
 * `@/features/account/admin/user-mfa.actions`.
 */

export async function getAdminMfaStatusAction(): Promise<ActionResult<{ totpEnabled: boolean }>> {
  try {
    const session = await requireSession();
    const status = await getMfaStatusForUser(session.user.id);
    if (!status) return fail("Unable to load MFA status");
    return ok({ totpEnabled: status.enrolled });
  } catch {
    return fail("Unable to load MFA status");
  }
}

export async function startAdminMfaEnrollmentAction(): Promise<
  ActionResult<{ secret: string; otpauthUrl: string; qrCodeSvg: string }>
> {
  try {
    const session = await requireSession();
    const data = await beginAuthenticatorEnrollment(session.user.id);
    const qrCodeSvg = await renderTotpQrSvg(data.otpauthUrl);
    return ok({ ...data, qrCodeSvg });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to start MFA enrollment");
  }
}

export async function confirmAdminMfaEnrollmentAction(input: {
  code: string;
}): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  try {
    const session = await requireSession();
    const data = await confirmAuthenticatorEnrollment(session.user.id, input.code);
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
    const session = await requireSession();
    await disableOwnMfa(session.user.id, {
      password: input.password,
      mfaCode: input.mfaCode,
    });
    return ok({ ok: true });
  } catch {
    return fail("Unable to disable MFA — confirm password or authenticator code");
  }
}

export async function getAdminMfaEnabledFlag(): Promise<boolean> {
  const session = await requireSession();
  const status = await getMfaStatusForUser(session.user.id);
  return Boolean(status?.enrolled);
}
