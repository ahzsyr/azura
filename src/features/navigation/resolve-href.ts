import { getCmsPagePublicPath } from "@/features/cms/cms-page-path";
import { STATIC_DEFAULT_URL_PREFIX } from "@/i18n/locale-config";
import { localePathFromPrefix, stripAnyLocalePrefix } from "@/i18n/url-helpers";
import type { HeaderAction, MenuItem, MenuLayoutType } from "./types";

/** Legacy travel-agency catalog route (packages remain for old menu items). */
const LEGACY_PACKAGES_PREFIX = "packages";

export function localePath(path: string, urlPrefix: string = STATIC_DEFAULT_URL_PREFIX): string {
  const prefix = urlPrefix.trim() || STATIC_DEFAULT_URL_PREFIX;
  const neutral = stripAnyLocalePrefix(path.startsWith("/") ? path : `/${path}`);
  return localePathFromPrefix(neutral, prefix);
}

export function getSyntheticChildren(item: MenuItem) {
  return [
    { label: `${item.label} Overview`, icon: "fa-circle-info" },
    { label: `${item.label} Highlights`, icon: "fa-star" },
    { label: `${item.label} Deals`, icon: "fa-tag" },
  ];
}

/** Default flyout for menu items with children when no per-item override is set. */
export const DEFAULT_FLYOUT_MENU_TYPE: MenuLayoutType = "dropdown";

export function getEffectiveMegaMenuType(
  item: MenuItem,
  _workspaceDefault?: MenuLayoutType,
): MenuLayoutType {
  return item.megaMenuType ?? DEFAULT_FLYOUT_MENU_TYPE;
}

export function getItemHref(item: MenuItem, localeCode: string = STATIC_DEFAULT_URL_PREFIX): string {
  switch (item.type) {
    case "link": {
      const url = item.url ?? "#";
      if (url.startsWith("http") || url.startsWith("#") || url.startsWith("mailto:")) return url;
      return localePath(url, localeCode);
    }
    case "page": {
      const slug = item.pageId ?? "home";
      return localePath(getCmsPagePublicPath(slug), localeCode);
    }
    case "collection":
    case "packageCategory": {
      const slug = (item.collectionId ?? item.packageCategoryId ?? "").trim();
      return slug ? localePath(`/collections/${slug}`, localeCode) : "#";
    }
    case "product": {
      const slug = (item.productId ?? "").trim();
      return slug ? localePath(`/products/${slug}`, localeCode) : "#";
    }
    case "package": {
      const slug = (item.packageId ?? item.productId ?? "").trim();
      if (!slug) return "#";
      // Legacy package items may still target the old packages route when no productId is set.
      if (item.productId?.trim()) {
        return localePath(`/products/${item.productId.trim()}`, localeCode);
      }
      return localePath(`/${LEGACY_PACKAGES_PREFIX}/${slug}`, localeCode);
    }
    case "post": {
      const slug = item.postId?.trim() ?? "";
      return slug ? localePath(`/blog/${slug}`, localeCode) : "#";
    }
    case "image":
      return item.linkUrl ?? "#";
    default:
      return "#";
  }
}

export function resolveActionHref(
  action: HeaderAction,
  localeCode: string = STATIC_DEFAULT_URL_PREFIX,
): string | null {
  if (action.type !== "custom") return null;
  const url = action.href?.trim();
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("#") || url.startsWith("mailto:")) return url;
  return localePath(url, localeCode);
}
