import type { GlobalApply, HeaderAction, HeaderWorkspace, MenuItem, MenuPlacement } from "./types";

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function countTotalItems(items: MenuItem[]): number {
  let count = items.length;
  for (const i of items) {
    if (i.children?.length) count += countTotalItems(i.children);
  }
  return count;
}

export function filterByPlacement(items: MenuItem[], placement: MenuPlacement): MenuItem[] {
  if (placement === "both") return items;
  return items
    .filter((i) => i.placement === placement)
    .map((i) => ({
      ...i,
      children: filterByPlacement(i.children || [], placement),
    }));
}

export function findItemById(items: MenuItem[], id: string): MenuItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function addChildImmutable(items: MenuItem[], parentId: string, child: MenuItem): MenuItem[] {
  return items.map((item) => {
    if (item.id === parentId) {
      return { ...item, children: [...(item.children ?? []), child] };
    }
    if (item.children?.length) {
      return { ...item, children: addChildImmutable(item.children, parentId, child) };
    }
    return item;
  });
}

export function deleteItemImmutable(items: MenuItem[], id: string): MenuItem[] {
  const out: MenuItem[] = [];
  for (const item of items) {
    if (item.id === id) continue;
    if (item.children?.length) {
      out.push({ ...item, children: deleteItemImmutable(item.children, id) });
    } else {
      out.push(item);
    }
  }
  return out;
}

export function updateItemImmutable(
  items: MenuItem[],
  id: string,
  updater: (item: MenuItem) => MenuItem
): MenuItem[] {
  return items.map((item) => {
    if (item.id === id) return updater({ ...item });
    if (item.children?.length) {
      return { ...item, children: updateItemImmutable(item.children, id, updater) };
    }
    return item;
  });
}

export function getItemSubtitle(item: MenuItem): string {
  if (item.type === "link") return `URL: ${item.url ?? "#"}`;
  if (item.type === "page") return `Page: ${item.pageId ?? "home"}`;
  if (item.type === "collection" || item.type === "packageCategory")
    return `Category: ${item.collectionId ?? item.packageCategoryId ?? "default"}`;
  if (item.type === "brand") return `Brand: ${item.brandSlug ?? "N/A"}`;
  if (item.type === "tag") return `Tag: ${item.tagSlug ?? "N/A"}`;
  if (item.type === "product" || item.type === "package")
    return `Package: ${item.productId ?? item.packageId ?? "N/A"}`;
  if (item.type === "post") return `Post: ${item.postId ?? "N/A"}`;
  if (item.type === "image") return `Image: ${(item.imageUrl ?? "").slice(0, 30)}`;
  return "";
}

export function normalizeAction(action: Partial<HeaderAction> & { id?: string }): HeaderAction {
  const type = action.type ?? "custom";
  const href =
    type === "custom" && typeof action.href === "string" && action.href.trim()
      ? action.href.trim()
      : undefined;
  return {
    id: action.id ?? generateId(),
    type,
    label:
      action.label?.trim() ||
      (type === "language"
        ? "EN"
        : type === "search"
          ? "Search"
          : type === "account"
            ? "Account"
            : "Action"),
    icon:
      action.icon?.trim() ||
      (type === "search"
        ? "fa-search"
        : type === "language"
          ? "fa-globe"
          : type === "account"
            ? "fa-user"
            : "fa-link"),
    style: action.style ?? "solid",
    outlined: !!action.outlined,
    visible: action.visible !== false,
    ...(href ? { href } : {}),
  };
}

function orderedMenuKeys(db: HeaderWorkspace["menusDatabase"]): string[] {
  const keys = Object.keys(db);
  return [...keys].sort((a, b) => {
    if (a === "mainMenu") return -1;
    if (b === "mainMenu") return 1;
    return a.localeCompare(b);
  });
}

export function menuAppliesToSurface(
  globalApply: GlobalApply | undefined,
  surface: "desktop" | "mobile"
): boolean {
  const g = globalApply ?? "none";
  if (g === "none") return false;
  if (g === "Both") return true;
  if (g === "Desktop") return surface === "desktop";
  if (g === "Mobile") return surface === "mobile";
  return false;
}

export function findMenuKeyAssignedToSurface(
  workspace: HeaderWorkspace,
  surface: "desktop" | "mobile"
): string | null {
  for (const key of orderedMenuKeys(workspace.menusDatabase)) {
    const menu = workspace.menusDatabase[key];
    if (menu && menuAppliesToSurface(menu.globalApply, surface)) return key;
  }
  return null;
}

export function resolveMenuForSurface(
  workspace: HeaderWorkspace,
  surface: "desktop" | "mobile",
  respectPlacement = true
): MenuItem[] {
  const db = workspace.menusDatabase;
  const assignedKey = findMenuKeyAssignedToSurface(workspace, surface);
  const items = assignedKey
    ? (db[assignedKey]?.items ?? [])
    : (db[workspace.activeMenuKey]?.items ?? []);

  if (!respectPlacement) return items;

  return items.filter((item) => {
    const visibility = item.visibility ?? "visible";
    if (visibility === "hidden" || visibility === "draft") return false;
    if (visibility === "scheduled" && item.scheduledAt) {
      const scheduledAt = Date.parse(item.scheduledAt);
      if (!Number.isNaN(scheduledAt) && scheduledAt > Date.now()) return false;
    }
    if (surface === "desktop") return item.placement === "both" || item.placement === "desktop";
    return item.placement === "both" || item.placement === "mobile";
  });
}

export function getActionTypeLabel(type: HeaderAction["type"]): string {
  if (type === "search") return "Search";
  if (type === "language") return "Language";
  if (type === "account") return "Account";
  return "Custom";
}
