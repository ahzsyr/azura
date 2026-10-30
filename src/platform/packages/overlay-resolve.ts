/**
 * Pure armed-gate resolvers for extension contribution overlays (M7.1).
 * Ledger fetch stays outside — pass rows in.
 */

export type OverlayExtensionRow = {
  status: string;
  navItemIds: readonly string[];
  blockTypes: readonly string[];
};

/**
 * Ignore `installed` (inert). If any `active` lists the id → open (not locked).
 * Else if any `inactive` lists the id → armed closed. Else unarmed.
 */
export function resolveOverlayClosedContributionIds(
  extensionRows: readonly OverlayExtensionRow[],
  kind: "nav" | "block",
): string[] {
  const closed = new Set<string>();
  const opened = new Set<string>();

  for (const row of extensionRows) {
    if (row.status === "installed" || row.status === "pending") continue;
    const ids = kind === "nav" ? row.navItemIds : row.blockTypes;
    if (row.status === "active") {
      for (const id of ids) opened.add(id);
    } else if (row.status === "inactive") {
      for (const id of ids) closed.add(id);
    }
  }

  const out: string[] = [];
  for (const id of closed) {
    if (!opened.has(id)) out.push(id);
  }
  return out.sort();
}

/** Union module-inactive nav ids with overlay-armed-closed nav ids. */
export function resolveOverlayNavInactiveIds(input: {
  extensionRows: readonly OverlayExtensionRow[];
  moduleInactiveNavIds: readonly string[];
}): string[] {
  const overlayClosed = resolveOverlayClosedContributionIds(input.extensionRows, "nav");
  return [...new Set([...input.moduleInactiveNavIds, ...overlayClosed])].sort();
}

export function resolveOverlayLockedBlockTypes(
  extensionRows: readonly OverlayExtensionRow[],
): string[] {
  return resolveOverlayClosedContributionIds(extensionRows, "block");
}
