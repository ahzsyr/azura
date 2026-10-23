/**
 * Pure session-revocation decisions shared by the Node JWT callback
 * (src/lib/auth.ts) and the API gate (src/lib/api-auth.ts). No Prisma imports
 * so the contract is unit-testable and edge-safe.
 */

/** A row read from User for session validation. */
export type SessionUserRow = {
  id: string;
  role: string;
  sessionVersion: number | null;
  mustChangePassword: boolean | null;
  totpEnabled: boolean | null;
  email: string | null;
  disabledAt: Date | null;
};

/**
 * Compare the version frozen into the JWT at sign-in with the database value.
 *
 * The JWT's sessionVersion must ONLY be written at sign-in. If a later request
 * copies the DB version back into the token, a revoked session (bumped
 * version) would silently re-validate on its next hop, which is exactly the
 * bug this function exists to prevent.
 *
 * Missing token/DB versions are treated as 0 for legacy tokens.
 */
export function isSessionVersionCurrent(
  tokenVersion: number | null | undefined,
  dbVersion: number | null | undefined,
): boolean {
  return (tokenVersion ?? 0) === (dbVersion ?? 0);
}

export type JwtRefreshDecision =
  | { action: "revoke" }
  | {
      action: "refresh";
      /** Lifecycle/identity claims that may be refreshed on a valid session. */
      role: string;
      mustChangePassword: boolean;
      totpEnabled: boolean;
      email: string | null;
    };

/**
 * Decide what a later (non-sign-in) request may do with its claims.
 *
 * - Row missing            → revoke (drop the session)
 * - disabledAt set         → revoke
 * - version mismatch       → revoke, and do NOT refresh claims
 * - version matches        → refresh role / mustChangePassword / totpEnabled
 *
 * sessionVersion is deliberately absent from the refresh payload: it must
 * never be written back onto the token.
 */
export function decideJwtRefresh(
  tokenVersion: number | null | undefined,
  row: SessionUserRow | null | undefined,
): JwtRefreshDecision {
  if (!row) return { action: "revoke" };
  if (row.disabledAt) return { action: "revoke" };
  if (!isSessionVersionCurrent(tokenVersion, row.sessionVersion)) return { action: "revoke" };
  return {
    action: "refresh",
    role: row.role,
    mustChangePassword: Boolean(row.mustChangePassword),
    totpEnabled: Boolean(row.totpEnabled),
    email: row.email,
  };
}

/**
 * A live session is one whose JWT carries a non-empty user id.
 * Role or email alone is not enough: Auth.js can still return a session object
 * after claims are cleared, and callers must deny unless this is true.
 */
export function hasSessionUserId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0;
}

/**
 * Identity the session callback and edge middleware may expose.
 * Returns null when the token cannot be resolved to a user id.
 */
export function publicSessionFromToken(token: {
  id?: unknown;
  role?: unknown;
  email?: unknown;
} | null | undefined): { id: string; role: string; email?: string } | null {
  if (!hasSessionUserId(token?.id)) return null;
  return {
    id: token.id,
    role: typeof token.role === "string" ? token.role : "",
    email: typeof token.email === "string" ? token.email : undefined,
  };
}
