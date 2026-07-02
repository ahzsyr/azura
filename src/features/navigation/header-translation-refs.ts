import {
  makeHeaderActionEntityId,
  makeMegaMenuPanelEntityId,
  makeMegaMenuTabEntityId,
  makeMenuItemEntityId,
} from "@/features/translation/workspace-entity-ids";
import type { HeaderWorkspace, MegaMenuContentConfig } from "./types";

export type MenuItemLike = {
  label: string;
  description?: string;
  cardSubtitle?: string;
  badgeText?: string;
  megaMenu?: MegaMenuContentConfig;
  children?: MenuItemLike[];
  id: string;
};

export function collectMenuItemRefs(
  menusDatabase: Record<string, { items?: MenuItemLike[] }>,
): { entityType: "MenuItem"; entityId: string; menuKey: string; itemId: string }[] {
  const refs: { entityType: "MenuItem"; entityId: string; menuKey: string; itemId: string }[] = [];

  function walk(menuKey: string, items: MenuItemLike[]) {
    for (const item of items) {
      refs.push({
        entityType: "MenuItem",
        entityId: makeMenuItemEntityId(menuKey, item.id),
        menuKey,
        itemId: item.id,
      });
      if (item.children?.length) walk(menuKey, item.children);
    }
  }

  for (const [menuKey, menu] of Object.entries(menusDatabase)) {
    walk(menuKey, menu.items ?? []);
  }
  return refs;
}

function walkMegaMenuRefs(
  menuKey: string,
  items: MenuItemLike[],
  add: (entityType: string, entityId: string) => void,
) {
  for (const item of items) {
    const mega = item.megaMenu;
    if (mega?.tabs?.length) {
      for (const tab of mega.tabs) {
        add("MegaMenuTab", makeMegaMenuTabEntityId(menuKey, item.id, tab.id));
      }
    }
    if (mega?.mixed?.left) {
      add("MegaMenuPanel", makeMegaMenuPanelEntityId(menuKey, `${item.id}:left`));
    }
    if (mega?.mixed?.right) {
      add("MegaMenuPanel", makeMegaMenuPanelEntityId(menuKey, `${item.id}:right`));
    }
    if (item.children?.length) walkMegaMenuRefs(menuKey, item.children, add);
  }
}

export function collectHeaderTranslationRefs(
  ws: HeaderWorkspace,
): { entityType: string; entityId: string }[] {
  const unique = new Map<string, { entityType: string; entityId: string }>();

  function add(entityType: string, entityId: string) {
    unique.set(`${entityType}:${entityId}`, { entityType, entityId });
  }

  for (const ref of collectMenuItemRefs(ws.menusDatabase)) {
    add(ref.entityType, ref.entityId);
  }

  for (const [menuKey, menu] of Object.entries(ws.menusDatabase)) {
    walkMegaMenuRefs(menuKey, menu.items ?? [], add);
  }

  for (const action of ws.headerActions ?? []) {
    add("HeaderAction", makeHeaderActionEntityId(action.id));
  }

  return [...unique.values()];
}
