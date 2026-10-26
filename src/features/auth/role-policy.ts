/**
 * Role hierarchy and user-management permissions.
 *
 * Pure module (no server imports) so both server actions and the admin UI use
 * exactly the same rules, and so the boundaries are unit-testable.
 *
 * Hierarchy — a manager may only act on roles *strictly below* their own:
 *
 *   SUPER_ADMIN (Master Admin)
 *     └── ADMIN
 *           └── CUSTOMER (normal user)
 *
 * - A Super Admin manages every account: edits user information and
 *   permissions, promotes customers to Admin, and demotes Admins.
 * - An Admin manages normal users (customers) only. Admins can never manage,
 *   edit, disable, reset or change the permissions/MFA of another Admin or the
 *   Super Admin — those actions return "not permitted", indistinguishable from
 *   acting on an account that does not exist.
 * - Every user manages their own account and security settings.
 *
 * Server enforcement is mandatory: these helpers are consumed by the server
 * actions/services that perform the change, not only by the UI that renders
 * buttons.
 */

export type ManagedRole = "SUPER_ADMIN" | "ADMIN" | "CUSTOMER";

export const MANAGED_ROLES: readonly ManagedRole[] = ["SUPER_ADMIN", "ADMIN", "CUSTOMER"];

const RANK: Record<ManagedRole, number> = {
  CUSTOMER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
};

export function isManagedRole(value: unknown): value is ManagedRole {
  return typeof value === "string" && (MANAGED_ROLES as readonly string[]).includes(value);
}

/** A role that can reach the admin dashboard (ADMIN or SUPER_ADMIN). */
export function isAdminRoleValue(role: string | null | undefined): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return String(role ?? "").toUpperCase() === "SUPER_ADMIN";
}

export function roleRank(role: string | null | undefined): number {
  return isManagedRole(String(role ?? "").toUpperCase())
    ? RANK[String(role).toUpperCase() as ManagedRole]
    : -1;
}

/** True when `actorRole` outranks `targetRole` (strictly above). */
export function outranks(actorRole: string | null | undefined, targetRole: string | null | undefined): boolean {
  if (!isManagedRole(String(actorRole ?? "").toUpperCase())) return false;
  if (!isManagedRole(String(targetRole ?? "").toUpperCase())) return false;
  return roleRank(actorRole) > roleRank(targetRole);
}

/**
 * Whether the actor may manage (edit, disable, reset, change permissions or
 * MFA for) the target account. Self-management is not "managing another
 * account": it is allowed for one's own security settings via
 * {@link canManageOwnSecurity}, never as an outline of the hierarchy.
 */
export function canManageUser(input: {
  actorId: string;
  actorRole: string | null | undefined;
  targetId: string;
  targetRole: string | null | undefined;
}): boolean {
  if (!input.targetId || input.actorId === input.targetId) return false;
  return outranks(input.actorRole, input.targetRole);
}

/** Any signed-in user may manage their own account and security settings. */
export function canManageOwnSecurity(input: {
  actorId: string | null | undefined;
  targetId: string | null | undefined;
}): boolean {
  return Boolean(input.actorId) && input.actorId === input.targetId;
}

/** Roles this actor is allowed to assign (promote / demote) to a managed user. */
export function assignableRoles(actorRole: string | null | undefined): ManagedRole[] {
  if (isSuperAdminRole(actorRole)) return ["CUSTOMER", "ADMIN"];
  return [];
}

/**
 * Who may promote a customer to Admin or demote an Admin back to a normal
 * user. Only the Super Admin, and never their own account, and never a target
 * at or above their own rank.
 */
export function canChangeRole(input: {
  actorId: string;
  actorRole: string | null | undefined;
  targetId: string;
  targetRole: string | null | undefined;
  nextRole: string | null | undefined;
}): boolean {
  if (!isSuperAdminRole(input.actorRole)) return false;
  if (!canManageUser(input)) return false;
  const target = String(input.targetRole ?? "").toUpperCase();
  const next = String(input.nextRole ?? "").toUpperCase();
  if (!isManagedRole(next) || !isManagedRole(target)) return false;
  if (target === next) return false;
  // Only customer <-> admin transitions; the Super Admin is never promoted or
  // demoted through user management.
  if (target === "SUPER_ADMIN" || next === "SUPER_ADMIN") return false;
  return assignableRoles(input.actorRole).includes(next);
}

/**
 * Admin-side security actions (password reset, MFA enable/disable) follow the
 * same hierarchy: an Admin may do this for normal users, a Super Admin for
 * Admins, and nobody may target themselves through the admin surface.
 */
export function canManageUserSecurity(input: {
  actorId: string;
  actorRole: string | null | undefined;
  targetId: string;
  targetRole: string | null | undefined;
}): boolean {
  return canManageUser(input);
}

/** Human label used by the admin UI and error messages. */
export function roleLabel(role: string | null | undefined): string {
  switch (String(role ?? "").toUpperCase()) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "ADMIN":
      return "Admin";
    case "CUSTOMER":
      return "Customer";
    default:
      return "Unknown";
  }
}

export const ROLE_NOT_PERMITTED_MESSAGE =
  "You do not have permission to change this account.";

export const ROLE_SELF_MESSAGE = "You cannot change your own role.";
