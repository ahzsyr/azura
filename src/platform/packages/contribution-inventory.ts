/**
 * Option C contribution inventory for build-time-distributed packages.
 *
 * Operational = a live consumer gates UI/routes/blocks from this declaration
 * (via Module registry and/or PackageManifest contributions).
 * Not-in-contract = must not appear under contributions (validation rejects).
 *
 * Phase 4 removed declared-only keys (`publicRoutePrefixes`, `dashboardSections`).
 */

import type { PackageContributions } from "@/platform/packages/manifest";

export type ContributionOperationalStatus = "operational" | "declared-only" | "not-in-contract";

export type ContributionInventoryEntry = {
  key: string;
  status: ContributionOperationalStatus;
  /** Where the live consumer lives, or why it is declared-only / blocked. */
  notes: string;
};

/**
 * Compile-time completeness vs PackageContributions (enforced by `tsc` / typecheck).
 * Missing or extra keys fail typecheck — not `tsx --test`.
 */
export const PACKAGE_CONTRIBUTION_KEY_COMPLETE: Record<keyof PackageContributions, true> = {
  adminNavItemIds: true,
  adminRoutePrefixes: true,
  blockTypes: true,
};

/** Keys allowed on PackageManifest.contributions — derived from the completeness Record. */
export const PACKAGE_CONTRIBUTION_KEYS = Object.keys(
  PACKAGE_CONTRIBUTION_KEY_COMPLETE,
) as (keyof PackageContributions)[];

export type PackageContributionKey = (typeof PACKAGE_CONTRIBUTION_KEYS)[number];

export const PACKAGE_CONTRIBUTION_KEY_SET = new Set<string>(PACKAGE_CONTRIBUTION_KEYS);

/** Former contribution keys rejected with an actionable Phase 4 message. */
export const REMOVED_CONTRIBUTION_KEYS = new Set<string>([
  "publicRoutePrefixes",
  "dashboardSections",
]);

/**
 * Canonical inventory. Keep in sync with PackageContributions and validation.
 * Theme tokens are intentionally not-in-contract: theme CSS comes from SiteTheme /
 * theme studio, not package ZIPs.
 */
export const CONTRIBUTION_INVENTORY: readonly ContributionInventoryEntry[] = [
  {
    key: "adminNavItemIds",
    status: "operational",
    notes:
      "Inactive Module nav ids are hidden via listInactiveContributedNavItemIds → AdminSidebar. M7.1 also unions armed-closed extension overlay nav ids from the ledger (installed=inert; active=open; inactive=closed).",
  },
  {
    key: "adminRoutePrefixes",
    status: "operational",
    notes:
      "Dashboard links: one href per active built-in Module from adminRoutePrefixes[0] via listActivePackageSections (getModuleManifests only — no PackageInstallation ledger). Admin route 404 gating uses ModuleManifest.adminRoutes → profile. Does not emit one link per prefix. Extensions must leave this empty (M7.1).",
  },
  {
    key: "blockTypes",
    status: "operational",
    notes:
      "Contributed blocks require their Module via getModuleForContributedBlock → isBlockTypeEnabled. M7.1 admin builder also applies overlayLockedBlockTypes for armed-closed extension overlays (public render does not).",
  },
  {
    key: "publicRoutePrefixes",
    status: "not-in-contract",
    notes:
      "Removed Phase 4. Public/API gating uses ModuleManifest.publicRoutes → MODULE_ROUTE_REGISTRY only. ZIPs that declare this key are rejected.",
  },
  {
    key: "dashboardSections",
    status: "not-in-contract",
    notes:
      "Removed Phase 4. Dashboard uses package label + adminRoutePrefixes[0]. ZIPs that declare this key are rejected.",
  },
  {
    key: "themeTokens",
    status: "not-in-contract",
    notes:
      "Not a PackageManifest contribution. Theme tokens are owned by SiteTheme / theme studio; package ZIPs must not declare them.",
  },
] as const;

export function contributionStatus(key: string): ContributionOperationalStatus | undefined {
  return CONTRIBUTION_INVENTORY.find((entry) => entry.key === key)?.status;
}

export function declaredOnlyContributionKeys(): string[] {
  return CONTRIBUTION_INVENTORY.filter((entry) => entry.status === "declared-only").map(
    (entry) => entry.key,
  );
}

export function operationalContributionKeys(): string[] {
  return CONTRIBUTION_INVENTORY.filter((entry) => entry.status === "operational").map(
    (entry) => entry.key,
  );
}

/** Pure: nav item ids to hide when their owning module is not active. */
export function resolveInactiveContributedNavItemIds(
  modules: readonly { active: boolean; navItemIds: readonly string[] }[],
): string[] {
  const ids: string[] = [];
  for (const entry of modules) {
    if (entry.active) continue;
    ids.push(...entry.navItemIds);
  }
  return ids;
}

/**
 * Pure: one dashboard link per active package from adminRoutePrefixes[0].
 * Callers that surface admin dashboard cards (listActivePackageSections) supply
 * built-in Module manifests only — this helper itself is ledger-agnostic.
 */
export function resolveActivePackageSections(
  packages: readonly {
    id: string;
    active: boolean;
    label: string;
    adminRoutePrefixes: readonly string[];
  }[],
): { id: string; label: string; href: string }[] {
  const sections: { id: string; label: string; href: string }[] = [];
  for (const entry of packages) {
    if (!entry.active) continue;
    const href = entry.adminRoutePrefixes[0];
    if (!href) continue;
    sections.push({ id: entry.id, label: entry.label, href });
  }
  return sections;
}
