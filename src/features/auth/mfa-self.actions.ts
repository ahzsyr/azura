"use server";

import { requireSession } from "@/features/auth/guards";
import {
  beginAuthenticatorEnrollment,
  confirmAuthenticatorEnrollment,
  disableOwnMfa,
  enableEmailOtpMfa,
  getMfaStatusForUser,
  type MfaStatus,
} from "@/features/auth/mfa-totp.service";
import { isAdminEmailMfaConfigured } from "@/features/auth/admin-auth-delivery";
import { renderTotpQrSvg } from "@/features/auth/totp-qr";
import { fail, ok, type ActionResult } from "@/types/api";

/**
 * Self-service MFA for the signed-in account, whatever its role.
 *
 * Every action derives the target user id from the session — never from client
 * input — so a caller can only ever change their own factor.
 */

async function emailOtpAvailable(): Promise<boolean> {
  return isAdminEmailMfaConfigured().catch(() => false);
}

export type SelfMfaStatus = MfaStatus & {
  emailOtpAvailable: boolean;
  role: string;
};

export async function getSelfMfaStatusAction(): Promise<ActionResult<SelfMfaStatus>> {
  try {
    const session = await requireSession();
    const status = await getMfaStatusForUser(session.user.id);
    if (!status) return fail("Account not found");
    return ok({
      ...status,
      emailOtpAvailable: await emailOtpAvailable(),
      role: session.user.role,
    });
  } catch {
    return fail("Unable to load two-step verification status");
  }
}

export async function startSelfAuthenticatorEnrollmentAction(): Promise<
  ActionResult<{ secret: string; otpauthUrl: string; qrCodeSvg: string }>
> {
  try {
    const session = await requireSession();
    const data = await beginAuthenticatorEnrollment(session.user.id);
    const qrCodeSvg = await renderTotpQrSvg(data.otpauthUrl);
    return ok({ ...data, qrCodeSvg });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to start enrollment");
  }
}

export async function confirmSelfAuthenticatorEnrollmentAction(input: {
  code: string;
}): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  try {
    const session = await requireSession();
    const data = await confirmAuthenticatorEnrollment(session.user.id, input.code);
    return ok(data);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid authenticator code");
  }
}

export async function enableSelfEmailOtpMfaAction(): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requireSession();
    if (!(await emailOtpAvailable())) {
      return fail(
        "Email codes are not available yet. Ask an administrator to choose the OTP email account under Settings → Email Accounts → Email delivery.",
      );
    }
    await enableEmailOtpMfa(session.user.id);
    return ok({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to enable email codes");
  }
}

export async function disableSelfMfaAction(input: {
  password?: string;
  mfaCode?: string;
}): Promise<ActionResult<{ ok: true }>> {
  try {
    const session = await requireSession();
    await disableOwnMfa(session.user.id, { password: input.password, mfaCode: input.mfaCode });
    return ok({ ok: true });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Unable to turn off two-step verification",
    );
  }
}
