import { STATIC_DEFAULT_URL_PREFIX } from "@/i18n/locale-config";
import { localePathFromPrefix, stripAnyLocalePrefix } from "@/i18n/url-helpers";
import type { MenuItem, MenuLayoutType } from "./types";

const STATIC_PAGES = new Set([
  "about",
  "packages",
  "visa",
  "hotels-transport",
  "gallery",
  "testimonials",
  "contact",
  "blog",
  "collections",
  "products",
]);

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

export function getEffectiveMegaMenuType(item: MenuItem, workspaceDefault: MenuLayoutType): MenuLayoutType {
  return item.megaMenuType ?? workspaceDefault;
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
      if (slug === "home") return localePath("/", localeCode);
      if (STATIC_PAGES.has(slug)) return localePath(`/${slug}`, localeCode);
      return localePath(`/pages/${slug}`, localeCode);
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
