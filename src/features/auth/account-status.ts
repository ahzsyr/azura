/** Pure account-state helpers (safe for unit tests; no server-only). */

export const LOGIN_LOCKOUT_THRESHOLD = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

export function isAccountTemporarilyLocked(lockedUntil: Date | null | undefined): boolean {
  return Boolean(lockedUntil && lockedUntil.getTime() > Date.now());
}

export function isAccountDisabled(disabledAt: Date | null | undefined): boolean {
  return Boolean(disabledAt);
}

/** Customers without emailVerifiedAt cannot receive a session. Admins are never gated. */
export function isCustomerEmailUnverified(
  role: string | null | undefined,
  emailVerifiedAt: Date | null | undefined,
): boolean {
  const normalized = (role ?? "").trim().toUpperCase();
  if (normalized !== "CUSTOMER") return false;
  return !emailVerifiedAt;
}
