/**
 * Admin dashboard section grants. Null means every section (existing admins).
 * SUPER_ADMIN always has every section.
 */

export const ADMIN_SECTION_IDS = [
  "content",
  "media",
  "marketing",
  "modules",
  "design",
  "seo",
  "settings",
  "system",
] as const;

export type AdminSectionId = (typeof ADMIN_SECTION_IDS)[number];

export const ADMIN_SECTION_OPTIONS: { id: AdminSectionId; label: string }[] = [
  { id: "content", label: "Content Builder" },
  { id: "media", label: "Media" },
  { id: "marketing", label: "Marketing" },
  { id: "modules", label: "Modules" },
  { id: "design", label: "Design & Builder" },
  { id: "seo", label: "SEO" },
  { id: "settings", label: "Settings" },
  { id: "system", label: "System" },
];

const SECTION_SET = new Set<string>(ADMIN_SECTION_IDS);

export function parseAdminSectionGrants(value: unknown): AdminSectionId[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const next: AdminSectionId[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !SECTION_SET.has(entry)) continue;
    const id = entry as AdminSectionId;
    if (!next.includes(id)) next.push(id);
  }
  return next;
}

export function adminHasSection(
  role: string,
  grants: readonly string[] | null,
  sectionId: string,
): boolean {
  if (role === "SUPER_ADMIN") return true;
  if (role !== "ADMIN") return false;
  if (grants == null) return true;
  return grants.includes(sectionId);
}

const OWN_ACCOUNT = "/admin/settings/account";

/**
 * Whether this admin may open the path. Unmatched admin URLs stay open.
 * Dashboard home and the signed-in user's own account settings stay open
 * even when the Settings section is not granted.
 */
export function isAdminPathGranted(input: {
  pathname: string;
  role: string;
  grants: readonly string[] | null;
  groupId: string | null;
}): boolean {
  if (input.role === "SUPER_ADMIN") return true;
  const path = input.pathname.split("?")[0] || "/";
  if (path === "/admin") return true;
  if (path === OWN_ACCOUNT || path.startsWith(`${OWN_ACCOUNT}/`)) return true;
  if (!input.groupId) return true;
  return adminHasSection(input.role, input.grants, input.groupId);
}

export function filterGroupsBySectionGrants<T extends { id: string }>(
  groups: readonly T[],
  grants: readonly string[] | null,
): T[] {
  if (grants == null) return [...groups];
  const allowed = new Set(grants);
  return groups.filter((group) => allowed.has(group.id));
}
