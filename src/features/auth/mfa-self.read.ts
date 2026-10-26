import "server-only";

import { getMfaStatusForUser, type MfaStatus } from "@/features/auth/mfa-totp.service";
import { isAdminEmailMfaConfigured } from "@/features/auth/admin-auth-delivery";
import type { SelfMfaView } from "@/components/account/account-mfa-card";

/**
 * Server-side reads for the MFA screens.
 *
 * Kept outside the `"use server"` action module (which may only export async
 * functions) and free of Prisma so it stays a thin, testable composition of the
 * per-user status service.
 */

/** The signed-in user's own card state. */
export async function getSelfMfaView(userId: string): Promise<SelfMfaView | null> {
  const [status, emailOtpAvailable] = await Promise.all([
    getMfaStatusForUser(userId),
    isAdminEmailMfaConfigured().catch(() => false),
  ]);
  if (!status) return null;
  return { ...status, emailOtpAvailable };
}

/** Another account's MFA state, for the admin user page. */
export async function getMfaStatusFor(userId: string): Promise<MfaStatus | null> {
  return getMfaStatusForUser(userId);
}
