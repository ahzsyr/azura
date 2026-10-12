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
  const next: MenuItem = { ...item, children };
  delete next.iconImageUrl;
  delete next.photoUrl;
  delete next.resolvedIcon;
  delete next.sourceLogoUrl;
  delete next.sourceIconUrl;
  delete next.sourceImageUrl;
  delete next.sourceIconName;
  if (usesLinkedMenuImageSource(item.type)) {
    delete next.imageUrl;
  }
  return next;
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

export type BrandMenuMedia = {
  iconImageUrl?: string;
  photoUrl?: string;
};

/** Logo and banner stay separate so header items can show one or the other. */
export function pickBrandMenuMedia(profile: {
  logoUrl?: string | null;
  bannerUrl?: string | null;
}): BrandMenuMedia {
  const logo = profile.logoUrl?.trim() || undefined;
  const banner = profile.bannerUrl?.trim() || undefined;
  return {
    iconImageUrl: logo,
    photoUrl: banner,
  };
}

/** Prefer brand logo for header menus; fall back to banner only when logo is missing. */
export function pickBrandMenuImageUrl(profile: {
  logoUrl?: string | null;
  bannerUrl?: string | null;
}): string | undefined {
  const media = pickBrandMenuMedia(profile);
  return media.iconImageUrl || media.photoUrl;
}
