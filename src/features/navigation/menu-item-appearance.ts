import type { HeaderBuilderCatalog, MenuItem, MenuItemType } from "./types";
import { isCollectionImageSrc } from "@/features/collections/collection-navigation";
import { inferFlyoutSourceDisplay } from "./mega-menu-resolver";
import type { MegaMenuChildDisplayType } from "./types";

/** How a selected destination is drawn inside a flyout. */
export type SourceDisplay = "none" | "logo" | "icon" | "image";

export type SourceMedia = {
  logoUrl?: string;
  iconUrl?: string;
  /** Icon-library id from the destination, when the icon is not an image. */
  iconName?: string;
  imageUrl?: string;
};

function normalizeDisplay(value: string | undefined): MegaMenuChildDisplayType {
  if (value === "link") return "list";
  if (value === "featured" || value === "product") return "card";
  if (value === "list" || value === "icon" || value === "image" || value === "card" || value === "automatic") {
    return value;
  }
  return "automatic";
}

export function readSourceDisplay(
  item: Pick<MenuItem, "sourceDisplay" | "megaMenuChildDisplayType" | "megaMenuCardMedia">,
): SourceDisplay {
  if (
    item.sourceDisplay === "none" ||
    item.sourceDisplay === "logo" ||
    item.sourceDisplay === "icon" ||
    item.sourceDisplay === "image"
  ) {
    return item.sourceDisplay;
  }
  const display = normalizeDisplay(item.megaMenuChildDisplayType);
  if (display === "list") return "none";
  if (display === "icon") return "icon";
  if (display === "card" && item.megaMenuCardMedia === "icon") return "icon";
  if (display === "image" || display === "card") return "image";
  return "none";
}

export function sourceDisplayPatch(
  choice: SourceDisplay,
): Pick<MenuItem, "sourceDisplay" | "megaMenuChildDisplayType" | "megaMenuCardMedia"> {
  switch (choice) {
    case "none":
      return { sourceDisplay: "none", megaMenuChildDisplayType: "list", megaMenuCardMedia: undefined };
    case "logo":
      return { sourceDisplay: "logo", megaMenuChildDisplayType: "icon", megaMenuCardMedia: undefined };
    case "icon":
      return { sourceDisplay: "icon", megaMenuChildDisplayType: "icon", megaMenuCardMedia: undefined };
    case "image":
      return { sourceDisplay: "image", megaMenuChildDisplayType: "image", megaMenuCardMedia: "image" };
  }
}

export function inspectorSourceDisplay(
  item: Pick<
    MenuItem,
    | "type"
    | "label"
    | "collectionId"
    | "packageCategoryId"
    | "brandSlug"
    | "productId"
    | "packageId"
    | "postId"
    | "url"
    | "imageUrl"
    | "megaMenuImageUrl"
    | "sourceDisplay"
    | "megaMenuChildDisplayType"
    | "megaMenuCardMedia"
    | "icon"
  >,
  catalog: HeaderBuilderCatalog,
): SourceDisplay {
  if (
    item.sourceDisplay === "none" ||
    item.sourceDisplay === "logo" ||
    item.sourceDisplay === "icon" ||
    item.sourceDisplay === "image"
  ) {
    return item.sourceDisplay;
  }
  const display = normalizeDisplay(item.megaMenuChildDisplayType);
  if (display !== "automatic") return readSourceDisplay(item);
  const withMedia = applyCatalogSourceMedia(
    { ...item, id: "preview", placement: "both", children: [], label: item.label || "" } as MenuItem,
    catalog,
  );
  return inferFlyoutSourceDisplay(withMedia);
}

export function availableSourceDisplays(media: SourceMedia): SourceDisplay[] {
  const options: SourceDisplay[] = ["none"];
  if (media.logoUrl?.trim()) options.push("logo");
  if (media.iconUrl?.trim() || media.iconName?.trim()) options.push("icon");
  if (media.imageUrl?.trim()) options.push("image");
  return options;
}

function contentItemMedia(
  item: { logoUrl?: string; iconUrl?: string; iconName?: string; imageUrl?: string } | undefined,
): SourceMedia {
  if (!item) return {};
  return {
    logoUrl: item.logoUrl?.trim() || undefined,
    iconUrl: item.iconUrl?.trim() || undefined,
    iconName: item.iconName?.trim() || undefined,
    imageUrl: item.imageUrl?.trim() || undefined,
  };
}

function findCatalogBrand(
  catalog: HeaderBuilderCatalog,
  slug: string,
  label?: string,
) {
  const key = slug.trim().toLowerCase();
  const nameKey = (label ?? "").trim().toLowerCase();
  return catalog.brands.find((entry) => {
    const entrySlug = entry.slug.trim().toLowerCase();
    const entryName = entry.name.trim().toLowerCase();
    return entrySlug === key || entryName === key || (nameKey.length > 0 && (entrySlug === nameKey || entryName === nameKey));
  });
}

export function sourceMediaFromCatalog(
  item: Pick<
    MenuItem,
    | "type"
    | "label"
    | "icon"
    | "collectionId"
    | "packageCategoryId"
    | "brandSlug"
    | "productId"
    | "packageId"
    | "postId"
    | "url"
    | "imageUrl"
    | "megaMenuImageUrl"
  >,
  catalog: HeaderBuilderCatalog,
): SourceMedia {
  const override = item.megaMenuImageUrl?.trim() || undefined;
  const chosenIcon = item.icon?.trim() || undefined;
  switch (item.type) {
    case "collection":
    case "packageCategory": {
      const slug = (item.collectionId ?? item.packageCategoryId ?? "").trim().toLowerCase();
      const col = catalog.collections.find((entry) => entry.slug.trim().toLowerCase() === slug);
      return {
        iconUrl: col?.iconUrl?.trim() || undefined,
        iconName: col?.iconName?.trim() || chosenIcon,
        imageUrl: override || col?.imageUrl?.trim() || undefined,
      };
    }
    case "brand": {
      const slug = (item.brandSlug ?? "").trim().toLowerCase();
      const brand = findCatalogBrand(catalog, slug, item.label);
      return {
        logoUrl: brand?.logoUrl?.trim() || undefined,
        iconName: chosenIcon,
        imageUrl: override || brand?.imageUrl?.trim() || undefined,
      };
    }
    case "product":
    case "package": {
      const slug = (item.productId ?? item.packageId ?? "").trim().toLowerCase();
      const product = catalog.products.find((entry) => entry.slug.trim().toLowerCase() === slug);
      return {
        iconName: chosenIcon,
        imageUrl: override || product?.imageUrl?.trim() || undefined,
      };
    }
    case "post": {
      return { imageUrl: override || item.imageUrl?.trim() || undefined };
    }
    case "link": {
      const path = (item.url ?? "").trim().split("?")[0]?.split("#")[0]?.replace(/^\//, "") ?? "";
      const parts = path.split("/").filter(Boolean);
      const [prefix, itemSlug] = parts[0] === "en" || parts[0] === "ar" ? parts.slice(1) : parts;
      if (prefix === "brands" && itemSlug && !itemSlug.includes("/")) {
        const brand = findCatalogBrand(catalog, itemSlug, item.label);
        return {
          logoUrl: brand?.logoUrl?.trim() || undefined,
          iconName: chosenIcon,
          imageUrl: override || brand?.imageUrl?.trim() || undefined,
        };
      }
      if (prefix === "categories" && itemSlug && !itemSlug.includes("/")) {
        const col = catalog.collections.find((entry) => entry.slug.trim().toLowerCase() === itemSlug.toLowerCase());
        return {
          iconUrl: col?.iconUrl?.trim() || undefined,
          iconName: col?.iconName?.trim() || chosenIcon,
          imageUrl: override || col?.imageUrl?.trim() || undefined,
        };
      }
      if (prefix && itemSlug && !itemSlug.includes("/")) {
        const type = catalog.contentTypes.find(
          (entry) => entry.slug === prefix || entry.routePrefix === prefix,
        );
        const list = type ? catalog.contentByType[type.slug] : undefined;
        const match = list?.find((entry) => entry.slug.trim().toLowerCase() === itemSlug.toLowerCase());
        const media = contentItemMedia(match);
        return {
          ...media,
          iconName: media.iconName || chosenIcon,
          imageUrl: override || media.imageUrl || item.imageUrl?.trim() || undefined,
        };
      }
      return { imageUrl: override || item.imageUrl?.trim() || undefined };
    }
    default:
      return { imageUrl: override || item.imageUrl?.trim() || undefined };
  }
}

export const SOURCE_DISPLAY_LABELS: Record<SourceDisplay, string> = {
  none: "Text only",
  logo: "Logo",
  icon: "Icon",
  image: "Image",
};

function destinationCatalogReady(
  item: Pick<MenuItem, "type">,
  catalog: HeaderBuilderCatalog,
): boolean {
  switch (item.type) {
    case "brand":
      return catalog.brands.length > 0;
    case "collection":
    case "packageCategory":
      return catalog.collections.length > 0;
    case "product":
    case "package":
      return catalog.products.length > 0;
    case "post":
      return catalog.posts.length > 0;
    case "page":
      return catalog.pages.length > 0;
    case "link":
      return (
        catalog.brands.length > 0 ||
        catalog.collections.length > 0 ||
        catalog.contentTypes.length > 0 ||
        catalog.pages.length > 0
      );
    default:
      return true;
  }
}

export function sourceDisplayOptionsForItem(
  item: Pick<MenuItem, "type" | "label" | "icon" | "collectionId" | "packageCategoryId" | "brandSlug" | "productId" | "packageId" | "postId" | "url" | "imageUrl" | "megaMenuImageUrl" | "sourceDisplay">,
  catalog: HeaderBuilderCatalog,
): Array<{ value: SourceDisplay; label: string }> {
  const media = sourceMediaFromCatalog(item, catalog);
  const available = new Set(availableSourceDisplays(media));
  if (item.sourceDisplay && !destinationCatalogReady(item, catalog)) {
    available.add(item.sourceDisplay);
  }
  return (["none", "logo", "icon", "image"] as const)
    .filter((value) => available.has(value))
    .map((value) => ({ value, label: SOURCE_DISPLAY_LABELS[value] }));
}

export function applyCatalogSourceMedia(item: MenuItem, catalog: HeaderBuilderCatalog): MenuItem {
  const media = sourceMediaFromCatalog(item, catalog);
  const children = (item.children ?? []).map((child) => applyCatalogSourceMedia(child, catalog));
  return {
    ...item,
    children,
    sourceLogoUrl: media.logoUrl || item.sourceLogoUrl,
    sourceIconUrl: media.iconUrl || item.sourceIconUrl,
    sourceIconName: item.icon?.trim() ? item.sourceIconName : media.iconName || item.sourceIconName,
    sourceImageUrl: media.imageUrl || item.sourceImageUrl,
    iconImageUrl: media.iconUrl || media.logoUrl || item.iconImageUrl,
    photoUrl: media.imageUrl || item.photoUrl,
    resolvedIcon: item.icon?.trim() ? undefined : media.iconName || item.resolvedIcon,
  };
}

export function applyCatalogSourceMediaToItems(items: MenuItem[], catalog: HeaderBuilderCatalog): MenuItem[] {
  return items.map((item) => applyCatalogSourceMedia(item, catalog));
}

export function sourceAssetIsImage(value: string | undefined): boolean {
  return Boolean(value && isCollectionImageSrc(value));
}

export function childMediaChoiceShowsImagePicker(choice: SourceDisplay): boolean {
  return choice === "image";
}

/** @deprecated Use SourceDisplay */
export type ChildMediaChoice = SourceDisplay;
/** @deprecated Use readSourceDisplay */
export const readChildMediaChoice = readSourceDisplay;
/** @deprecated Use sourceDisplayPatch */
export const childMediaChoicePatch = sourceDisplayPatch;

