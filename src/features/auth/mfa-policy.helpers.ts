/**
 * Per-user MFA policy helpers (pure, unit-testable).
 *
 * Every account owns its second factor. Keeping the decision logic here — and
 * storing the setting on the user row — means one user's enrollment can never
 * enable, disable or replace another user's factor.
 */

export type MfaMethod = "AUTHENTICATOR" | "EMAIL_OTP";

export const MFA_METHODS: readonly MfaMethod[] = ["AUTHENTICATOR", "EMAIL_OTP"];

export function isMfaMethod(value: unknown): value is MfaMethod {
  return value === "AUTHENTICATOR" || value === "EMAIL_OTP";
}

export const MFA_METHOD_LABELS: Record<MfaMethod, string> = {
  AUTHENTICATOR: "Authenticator app",
  EMAIL_OTP: "Email one-time code",
};

/** Raw user columns that decide the account's MFA state. */
export type MfaUserState = {
  role: string | null | undefined;
  mfaMethod?: string | null;
  totpEnabled?: boolean | null;
  totpSecret?: string | null;
  mfaDisabledByAdminAt?: Date | string | null;
};

export type ResolvedMfaState = {
  /** A second factor is active on this account. */
  enrolled: boolean;
  method: MfaMethod | null;
  /** An admin switched MFA off for this account; self-service is locked. */
  disabledByAdmin: boolean;
};

/**
 * Resolve the account's MFA state.
 *
 * Legacy rows predate the per-user method column: `totpEnabled` without a
 * method still means an authenticator app is enrolled, so existing admins keep
 * their factor across the upgrade.
 */
export function resolveMfaState(user: MfaUserState): ResolvedMfaState {
  const disabledByAdmin = Boolean(user.mfaDisabledByAdminAt);
  if (disabledByAdmin) return { enrolled: false, method: null, disabledByAdmin: true };

  const method = isMfaMethod(user.mfaMethod) ? user.mfaMethod : null;
  if (method === "EMAIL_OTP") return { enrolled: true, method, disabledByAdmin: false };
  if (method === "AUTHENTICATOR") {
    // Authenticator enrollment without a stored secret cannot produce a code,
    // so it must not gate sign-in either.
    return { enrolled: Boolean(user.totpSecret), method: "AUTHENTICATOR", disabledByAdmin: false };
  }
  if (user.totpEnabled && user.totpSecret) {
    return { enrolled: true, method: "AUTHENTICATOR", disabledByAdmin: false };
  }
  return { enrolled: false, method: null, disabledByAdmin: false };
}

/** Only accounts that can reach the dashboard use the admin MFA screens. */
export function isDashboardRole(role: string | null | undefined): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

/**
 * Whether sign-in must present a second-factor challenge for this account.
 *
 * - Admin roles are always challenged (email OTP is always deliverable once
 *   the site has a sender), as before this change.
 * - Customers are challenged only when they enrolled a factor themselves.
 */
export function requiresSecondFactor(user: MfaUserState): boolean {
  if (isDashboardRole(user.role)) return true;
  return resolveMfaState(user).enrolled;
}

/**
 * Which user may change their own MFA configuration.
 *
 * A factor switched off by an admin stays off until an admin turns it back on,
 * so an account cannot simply re-enroll to undo a managed restriction.
 */
export function canSelfManageMfa(user: MfaUserState): { ok: true } | { ok: false; reason: string } {
  if (resolveMfaState(user).disabledByAdmin) {
    return {
      ok: false,
      reason: "Two-step verification was turned off for this account by an administrator.",
    };
  }
  return { ok: true };
}

/** Roles an admin may manage the MFA setting for via the admin surface. */
export function adminMayManageMfaFor(actorRole: string | null | undefined, targetRole: string | null | undefined): boolean {
  const a = String(actorRole ?? "").toUpperCase();
  const t = String(targetRole ?? "").toUpperCase();
  if (a === "SUPER_ADMIN") return t === "ADMIN" || t === "CUSTOMER";
  if (a === "ADMIN") return t === "CUSTOMER";
  return false;
}

/** Six-digit email codes are the only OTP shape accepted for MFA. */
export function isSixDigitOtp(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}
