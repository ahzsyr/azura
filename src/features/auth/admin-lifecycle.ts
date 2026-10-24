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
   * email-OTP sender was configured. Sign-in lands on account settings and the
   * dashboard shows a setup notice until a sender exists; it does not lock
   * other pages (see adminLifecycleBlocksDashboard).
   */
  adminOtpUnconfigured?: boolean | null;
};

export type AdminLifecycleBlock =
  | { kind: "password_change_required"; redirectTo: string }
  | { kind: "mfa_enrollment_required"; redirectTo: string }
  | { kind: "otp_delivery_unconfigured"; redirectTo: string }
  | null;

const ACCOUNT_SETTINGS = "/admin/settings/account";
/** Needed to create the Email Account that clears the OTP-delivery gate. */
const EMAIL_ACCOUNTS = "/admin/settings/email-accounts";

/**
 * Paths an admin may access while lifecycle is incomplete.
 * Email Accounts is exempt only for the OTP-delivery gate — a forced password
 * change still cannot browse there first.
 */
export function isAdminLifecycleExemptPath(
  pathname: string,
  block?: AdminLifecycleBlock,
): boolean {
  if (pathname === ACCOUNT_SETTINGS || pathname.startsWith(`${ACCOUNT_SETTINGS}/`)) {
    return true;
  }
  if (pathname === "/admin/login") return true;
  if (
    block?.kind === "otp_delivery_unconfigured" &&
    (pathname === EMAIL_ACCOUNTS || pathname.startsWith(`${EMAIL_ACCOUNTS}/`))
  ) {
    return true;
  }
  return false;
}

/**
 * Whether the block locks the dashboard (layout redirect, API 403).
 * A missing OTP sender is a site setup task, not a weakness in this admin's
 * credentials: the dashboard stays usable and shows a notice instead.
 * Redirecting for it would fire only when a save re-renders the layout (client
 * navigation does not), throwing the admin off the page they just saved.
 */
export function adminLifecycleBlocksDashboard(block: AdminLifecycleBlock): boolean {
  return block != null && block.kind !== "otp_delivery_unconfigured";
}

/**
 * True for App Router client requests (server actions and router.refresh).
 * A document load does not send these headers. Save re-renders this layout on
 * a client request; redirecting there leaves the page and section just saved.
 */
export function isAdminClientRefresh(headerList: {
  get(name: string): string | null;
}): boolean {
  return (
    headerList.get("x-admin-client-refresh") === "1" ||
    headerList.get("next-action") != null ||
    headerList.get("rsc") === "1" ||
    headerList.get("next-url") != null
  );
}

/** Whether this request should leave the current admin URL for a lifecycle step. */
export function shouldRedirectForAdminLifecycle(input: {
  block: AdminLifecycleBlock;
  pathname: string;
  clientRefresh: boolean;
}): boolean {
  if (input.clientRefresh) return false;
  if (!input.pathname) return false;
  if (!adminLifecycleBlocksDashboard(input.block)) return false;
  return !isAdminLifecycleExemptPath(input.pathname, input.block);
}

/**
 * Returns a redirect target when the admin must finish a lifecycle step.
 *
 * Order:
 * 1. mustChangePassword → password tab
 * 2. OTP delivery unconfigured → account settings. Email Accounts stays
 *    reachable so a sender can actually be created. Once a sender exists,
 *    email OTP stays required at login.
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
