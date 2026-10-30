/**
 * Phase 3 Module ACL — registered `{packageId}.read` / `{packageId}.manage`.
 * Composes with admin-section grants; does not replace them.
 */

import type { AdminSectionId } from "@/features/auth/admin-section-grants";
import { adminHasSection } from "@/features/auth/admin-section-grants";

export type ModulePermissionLevel = "read" | "manage";

export const MODULE_ADMIN_SECTION_MAP: Readonly<Record<string, AdminSectionId>> = {
  documentation: "modules",
  "status-page": "modules",
  marketing: "marketing",
  "advanced-seo": "seo",
};

const PERMISSION_RE = /^([a-z0-9][a-z0-9-]*)\.(read|manage)$/;

export function modulePermissionKey(packageId: string, level: ModulePermissionLevel): string {
  return `${packageId}.${level}`;
}

export function canonicalModulePermissions(packageId: string): string[] {
  return [modulePermissionKey(packageId, "read"), modulePermissionKey(packageId, "manage")];
}

/** True when `permission` is `{packageId}.read` or `{packageId}.manage`. */
export function isCanonicalModulePermission(packageId: string, permission: string): boolean {
  return (
    permission === modulePermissionKey(packageId, "read") ||
    permission === modulePermissionKey(packageId, "manage")
  );
}

export function parseModulePermissionKey(
  permission: string,
): { packageId: string; level: ModulePermissionLevel } | null {
  const match = PERMISSION_RE.exec(permission.trim());
  if (!match) return null;
  return { packageId: match[1], level: match[2] as ModulePermissionLevel };
}

/**
 * Null = inherit (legacy full Module access for Modules whose mapped section is held).
 * Array = explicit allowlist (empty = none).
 */
export function parseModulePermissionGrants(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const next: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const parsed = parseModulePermissionKey(entry);
    if (!parsed) continue;
    const key = modulePermissionKey(parsed.packageId, parsed.level);
    if (!next.includes(key)) next.push(key);
  }
  return next;
}

export function listRegisteredModulePermissions(
  moduleIds: readonly string[] = Object.keys(MODULE_ADMIN_SECTION_MAP),
): string[] {
  const out: string[] = [];
  for (const id of moduleIds) {
    if (!(id in MODULE_ADMIN_SECTION_MAP)) continue;
    out.push(...canonicalModulePermissions(id));
  }
  return out;
}

/**
 * Whether an ADMIN (or SUPER_ADMIN) may exercise a Module permission.
 * SUPER_ADMIN always true. Section map + module grants compose.
 */
export function adminHasModulePermission(
  role: string,
  sectionGrants: readonly string[] | null,
  moduleGrants: readonly string[] | null,
  packageId: string,
  level: ModulePermissionLevel,
): boolean {
  if (role === "SUPER_ADMIN") return true;
  if (role !== "ADMIN") return false;

  const section = MODULE_ADMIN_SECTION_MAP[packageId];
  if (!section) return false;
  if (!adminHasSection(role, sectionGrants, section)) return false;

  if (moduleGrants == null) {
    // Inherit: holding the mapped section implies read + manage for that Module.
    return true;
  }

  const manageKey = modulePermissionKey(packageId, "manage");
  const readKey = modulePermissionKey(packageId, "read");
  if (moduleGrants.includes(manageKey)) return true;
  if (level === "read" && moduleGrants.includes(readKey)) return true;
  return false;
}
