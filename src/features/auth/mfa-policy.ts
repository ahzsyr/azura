/**
 * Who is challenged for a second factor at sign-in.
 *
 * - Admin roles: always. Login uses an email OTP from the configured sender,
 *   with an enrolled authenticator app accepted first.
 * - Customers: only when they enrolled a factor themselves
 *   (`mfaMethod` = AUTHENTICATOR or EMAIL_OTP). A customer who never opted in
 *   signs in with a password alone.
 *
 * Which factors are offered is decided per account in
 * `authorize-credentials.ts`; see `mfa-policy.helpers.ts` for the state
 * resolution used here.
 */
import { isAdminRole } from "@/features/auth/portal";
import { resolveMfaState } from "@/features/auth/mfa-policy.helpers";

/**
 * Role-only predicate. Kept for callers that have just a role (portal routing,
 * tests); `requiresSecondFactorForUser` adds the per-user enrollment.
 */
export function requiresMfaAtLogin(role: string): boolean {
  return isAdminRole(role);
}

/** Full decision used by the authorize step (role + per-user enrollment). */
export function requiresSecondFactorForUser(user: {
  role: string;
  mfaMethod?: string | null;
  totpEnabled?: boolean | null;
  totpSecret?: string | null;
  mfaDisabledByAdminAt?: Date | string | null;
}): boolean {
  if (requiresMfaAtLogin(user.role)) return true;
  return resolveMfaState({
    role: user.role,
    mfaMethod: user.mfaMethod,
    totpEnabled: user.totpEnabled,
    totpSecret: user.totpSecret,
    mfaDisabledByAdminAt: user.mfaDisabledByAdminAt,
  }).enrolled;
}
