import type { HeaderWorkspace, MenuItem, MenuItemType } from "./types";

const LINKED_MENU_IMAGE_TYPES = new Set<MenuItemType>([
  "brand",
  "collection",
  "packageCategory",
  "product",
  "package",
]);

/** Menu items whose card image should always resolve from live catalog data. */
export function usesLinkedMenuImageSource(type: MenuItemType): boolean {
  return LINKED_MENU_IMAGE_TYPES.has(type);
}

export function shouldPreferStoredMenuImageUrl(item: Pick<MenuItem, "type" | "imageUrl">): boolean {
  return !usesLinkedMenuImageSource(item.type) && Boolean(item.imageUrl?.trim());
}

function stripLinkedMenuItemImage(item: MenuItem): MenuItem {
  const children = (item.children ?? []).map(stripLinkedMenuItemImage);
  if (!usesLinkedMenuImageSource(item.type)) {
    return children === item.children ? item : { ...item, children };
  }
  const { imageUrl: _imageUrl, ...rest } = item;
  return { ...rest, children };
}

/** Remove baked card image URLs for linked catalog items before persisting header workspace. */
export function stripLinkedMenuImagesFromWorkspace(ws: HeaderWorkspace): HeaderWorkspace {
  const menusDatabase = { ...ws.menusDatabase };
  for (const key of Object.keys(menusDatabase)) {
    menusDatabase[key] = {
      ...menusDatabase[key],
      items: menusDatabase[key].items.map(stripLinkedMenuItemImage),
    };
  }
  return { ...ws, menusDatabase };
}