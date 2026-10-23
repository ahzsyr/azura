/**
 * Pure admin lifecycle destination helpers (safe for unit tests).
 * Post-login gate: password change only (email OTP replaces forced TOTP enroll).
 */

export type AdminLifecycleUser = {
  mustChangePassword?: boolean | null;
  totpEnabled?: boolean | null;
  disabledAt?: Date | null;
  /**
   * True when the admin signed in with password only because no sendable
   * email-OTP sender was configured. Every path except the account settings
   * page redirects there until a sender exists (see adminLifecycleDestination).
   */
  adminOtpUnconfigured?: boolean | null;
};

export type AdminLifecycleBlock =
  | { kind: "password_change_required"; redirectTo: string }
  | { kind: "mfa_enrollment_required"; redirectTo: string }
  | { kind: "otp_delivery_unconfigured"; redirectTo: string }
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
 * Returns a redirect target when the admin must finish a lifecycle step.
 *
 * Order:
 * 1. mustChangePassword → password tab
 * 2. OTP delivery unconfigured → account settings (only path that lets the
 *    admin configure an Email Account for admin login OTP). Once a sender
 *    exists, email OTP stays required at login.
 * 3. TOTP enrollment is no longer forced (admin login uses email OTP).
 */
export function adminLifecycleDestination(user: AdminLifecycleUser): AdminLifecycleBlock {
  if (user.disabledAt) return null;
  if (user.mustChangePassword) {
    return {
      kind: "password_change_required",
      redirectTo: `${ACCOUNT_SETTINGS}?tab=password`,
    };
  }
  if (user.adminOtpUnconfigured) {
    return {
      kind: "otp_delivery_unconfigured",
      redirectTo: ACCOUNT_SETTINGS,
    };
  }
  return null;
}
