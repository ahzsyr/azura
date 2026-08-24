import type {
  MegaMenuContentConfig,
  MegaMenuPanelConfig,
  MenuItem,
  MenuLayoutType,
} from "./types";

export type MegaMenuV2ValidationIssue = {
  code:
    | "missing_version"
    | "missing_panels"
    | "duplicate_panel_id"
    | "unknown_child_id"
    | "duplicate_child_assignment"
    | "unknown_panel_id"
    | "invalid_featured_child"
    | "invalid_column_group_child"
    | "invalid_cta_child"
    | "sidebar_nav_required";
  message: string;
};

/**
 * Structural validation for v2 mega menus.
 * Does not infer v2 from megaMenuType — callers must pass version === 2 configs.
 */
export function validateMegaMenuV2Config(
  parent: MenuItem,
  mega: MegaMenuContentConfig,
  megaMenuType?: MenuLayoutType,
): MegaMenuV2ValidationIssue[] {
  const issues: MegaMenuV2ValidationIssue[] = [];
  if (mega.version !== 2) {
    issues.push({ code: "missing_version", message: "v2 mega menu requires version: 2" });
    return issues;
  }

  const childIds = new Set((parent.children ?? []).map((c) => c.id));
  const panels = mega.panels ?? [];
  if (panels.length === 0) {
    issues.push({ code: "missing_panels", message: "v2 mega menu requires at least one panel" });
  }

  const panelIds = new Set<string>();
  const assignedChildren = new Map<string, string>(); // childId → panelId

  for (const panel of panels) {
    if (panelIds.has(panel.id)) {
      issues.push({
        code: "duplicate_panel_id",
        message: `Duplicate panel id: ${panel.id}`,
      });
    }
    panelIds.add(panel.id);

    for (const childId of panel.childIds ?? []) {
      if (!childIds.has(childId)) {
        issues.push({
          code: "unknown_child_id",
          message: `Panel ${panel.id} references unknown childId: ${childId}`,
        });
        continue;
      }
      const prior = assignedChildren.get(childId);
      if (prior && prior !== panel.id) {
        issues.push({
          code: "duplicate_child_assignment",
          message: `Child ${childId} assigned to both panels ${prior} and ${panel.id}`,
        });
      } else {
        assignedChildren.set(childId, panel.id);
      }
    }

    if (panel.featured?.childId && !childIds.has(panel.featured.childId)) {
      issues.push({
        code: "invalid_featured_child",
        message: `Panel ${panel.id} featured.childId not in parent.children`,
      });
    }

    for (const group of panel.columnGroups ?? []) {
      for (const childId of group.childIds ?? []) {
        if (!childIds.has(childId)) {
          issues.push({
            code: "invalid_column_group_child",
            message: `Panel ${panel.id} column group ${group.id} references unknown childId: ${childId}`,
          });
        }
      }
      if (group.ctaChildId && !childIds.has(group.ctaChildId)) {
        issues.push({
          code: "invalid_cta_child",
          message: `Panel ${panel.id} column group ${group.id} ctaChildId not in parent.children`,
        });
      }
    }
  }

  const type = megaMenuType ?? parent.megaMenuType;
  const nav = mega.navigation;
  if (type === "sidebar" && nav?.enabled) {
    if (!nav.items?.length) {
      issues.push({
        code: "sidebar_nav_required",
        message: "Enabled sidebar navigation requires at least one nav item",
      });
    }
    for (const item of nav.items ?? []) {
      if (!panelIds.has(item.panelId)) {
        issues.push({
          code: "unknown_panel_id",
          message: `Navigation item ${item.id} references nonexistent panelId: ${item.panelId}`,
        });
      }
    }
  } else if (nav?.items?.length) {
    for (const item of nav.items) {
      if (!panelIds.has(item.panelId)) {
        issues.push({
          code: "unknown_panel_id",
          message: `Navigation item ${item.id} references nonexistent panelId: ${item.panelId}`,
        });
      }
    }
  }

  return issues;
}

/** True only when version is 2 and structural validation passes. */
export function isValidMegaMenuV2(parent: MenuItem, mega?: MegaMenuContentConfig | null): boolean {
  if (!mega || mega.version !== 2) return false;
  return validateMegaMenuV2Config(parent, mega).length === 0;
}

export function sanitizePanelChildIds(
  panel: MegaMenuPanelConfig,
  parentChildIds: Set<string>,
): MegaMenuPanelConfig {
  return {
    ...panel,
    childIds: (panel.childIds ?? []).filter((id) => parentChildIds.has(id)),
    featured: panel.featured?.childId && !parentChildIds.has(panel.featured.childId)
      ? { ...panel.featured, childId: undefined }
      : panel.featured,
    columnGroups: panel.columnGroups?.map((g) => ({
      ...g,
      childIds: (g.childIds ?? []).filter((id) => parentChildIds.has(id)),
      ctaChildId: g.ctaChildId && parentChildIds.has(g.ctaChildId) ? g.ctaChildId : undefined,
    })),
  };
}
