import { collectionsDataService } from "@/features/collections/collections-data.service";
import type { HeaderWorkspace, MenuItem, MegaMenuPanelConfig } from "./types";
import { generateId } from "./menu-engine";

/**
 * Phase 4: expand panel.source.collectionChildren into effective child MenuItems
 * without mutating persisted workspace semantics permanently — returns a clone
 * used only for site rendering / resolution.
 *
 * Persisted config keeps `source`; childIds remain the authored refs (may be empty).
 * Expanded children are appended to the parent tree clone and wired into panel.childIds
 * for the enrich/render path only.
 */
export async function expandMegaMenuPanelSources(
  workspace: HeaderWorkspace,
  localeCode: string,
): Promise<HeaderWorkspace> {
  const menusDatabase: HeaderWorkspace["menusDatabase"] = {};

  for (const [key, menu] of Object.entries(workspace.menusDatabase)) {
    menusDatabase[key] = {
      ...menu,
      items: await Promise.all(menu.items.map((item) => expandItemTree(item, localeCode))),
    };
  }

  return { ...workspace, menusDatabase };
}

async function expandItemTree(item: MenuItem, localeCode: string): Promise<MenuItem> {
  const children = await Promise.all((item.children ?? []).map((c) => expandItemTree(c, localeCode)));
  let next: MenuItem = { ...item, children };

  const mega = item.megaMenu;
  if (mega?.version === 2 && mega.panels?.some((p) => p.source?.type === "collectionChildren")) {
    const panels: MegaMenuPanelConfig[] = [];
    let expandedChildren = [...children];

    for (const panel of mega.panels) {
      if (panel.source?.type !== "collectionChildren" || !panel.source.collectionId) {
        panels.push(panel);
        continue;
      }
      try {
        const collections = await collectionsDataService.loadAll({ localePrefix: localeCode });
        const parentCol = collections.find(
          (c) => c.slug === panel.source!.collectionId || c.id === panel.source!.collectionId,
        );
        const kids = parentCol
          ? collections.filter(
              (c) => c.visible !== false && c.parentSlug === parentCol.slug,
            )
          : [];

        const synthetic: MenuItem[] = kids.map((col) => ({
          id: `src-${panel.id}-${col.slug}`,
          type: "collection" as const,
          label: col.name,
          placement: "both" as const,
          children: [],
          collectionId: col.slug,
          visibility: "visible" as const,
          audience: "all" as const,
        }));

        const useIds =
          panel.childIds.length > 0 ? panel.childIds : synthetic.map((s) => s.id);
        if (panel.childIds.length === 0) {
          expandedChildren = [...expandedChildren, ...synthetic];
        }
        panels.push({ ...panel, childIds: useIds });
      } catch {
        panels.push(panel);
      }
    }

    next = {
      ...next,
      children: expandedChildren,
      megaMenu: { ...mega, panels },
    };
  }

  return next;
}

export function hasAnyPanelSource(item: MenuItem): boolean {
  return Boolean(item.megaMenu?.panels?.some((p) => p.source?.type === "collectionChildren"));
}

export function createSourcePlaceholderChild(label: string): MenuItem {
  return {
    id: generateId(),
    type: "link",
    label,
    placement: "both",
    children: [],
    url: "#",
    visibility: "visible",
    audience: "all",
  };
}
