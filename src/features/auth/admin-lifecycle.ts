/**
 * Pure admin lifecycle destination helpers (safe for unit tests).
 * Post-login gate: password change only (email OTP replaces forced TOTP enroll).
 */

export type AdminLifecycleUser = {
  mustChangePassword?: boolean | null;
  totpEnabled?: boolean | null;
  disabledAt?: Date | null;
};

export type AdminLifecycleBlock =
  | { kind: "password_change_required"; redirectTo: string }
  | { kind: "mfa_enrollment_required"; redirectTo: string }
  | null;

const ACCOUNT_SETTINGS = "/admin/settings/account";

/** Paths an admin may access while lifecycle incomplete. */
export function isAdminLifecycleExemptPath(pathname: string): boolean {
  if (pathname === ACCOUNT_SETTINGS || pathname.startsWith(`${ACCOUNT_SETTINGS}/`)) {
    return true;
  }
  if (pathname === "/admin/login") return true;
  return false;
}

/**
 * Returns a redirect target when the admin must finish password change.
 * TOTP enrollment is no longer forced (admin login uses email OTP).
 */
export function adminLifecycleDestination(user: AdminLifecycleUser): AdminLifecycleBlock {
  if (user.disabledAt) return null;
  if (user.mustChangePassword) {
    return {
      kind: "password_change_required",
      redirectTo: `${ACCOUNT_SETTINGS}?tab=password`,
    };
  }
  return null;
}
