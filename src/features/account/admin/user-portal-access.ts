/**
 * UI-level visibility mirrors the server rules in `role-policy.ts`. The server
 * always re-checks; these helpers only decide what an operator is shown.
 */
import {
  canChangeRole,
  canManageUser,
  canManageUserSecurity,
  isSuperAdminRole,
} from "@/features/auth/role-policy";

export function userContactHrefs(phone: string | null | undefined): {
  whatsapp: string | null;
  tel: string | null;
} {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return { whatsapp: null, tel: null };
  return {
    whatsapp: `https://wa.me/${digits}?text=${encodeURIComponent("Hello")}`,
    tel: `tel:+${digits}`,
  };
}

/** Enable/disable button visibility (same rule the server enforces). */
export function canToggleAccount(input: {
  actorId: string;
  actorRole: string;
  targetId: string;
  targetRole: string;
}): boolean {
  return canManageUser(input);
}

export function canEditAccount(input: {
  actorId: string;
  actorRole: string;
  targetId: string;
  targetRole: string;
}): boolean {
  return canManageUser(input);
}

export function canManageSecurity(input: {
  actorId: string;
  actorRole: string;
  targetId: string;
  targetRole: string;
}): boolean {
  return canManageUserSecurity(input);
}

/** Role selector: Super Admin only, and only customer ⇄ admin targets. */
export function canShowRoleControl(input: {
  actorId: string;
  actorRole: string;
  targetId: string;
  targetRole: string;
}): boolean {
  if (input.targetRole === "SUPER_ADMIN") return false;
  return (
    isSuperAdminRole(input.actorRole) &&
    (canChangeRole({ ...input, nextRole: "ADMIN" }) ||
      canChangeRole({ ...input, nextRole: "CUSTOMER" }))
  );
}
