/** Static marketing routes keyed for SeoMeta.pageKey */
export const STATIC_SEO_PAGES = [
  { pageKey: "home", label: "Home", path: "" },
  { pageKey: "about", label: "About", path: "/about" },
  { pageKey: "packages", label: "Packages listing", path: "/packages" },
  { pageKey: "products", label: "Products", path: "/products" },
  { pageKey: "collections", label: "Collections", path: "/collections" },
  { pageKey: "services", label: "Services", path: "/services" },
  { pageKey: "compare", label: "Compare", path: "/compare" },
  { pageKey: "favorites", label: "Favorites", path: "/favorites" },
  { pageKey: "account", label: "Account", path: "/account" },
  { pageKey: "hotels-transport", label: "Hotels & transport", path: "/hotels-transport" },
  { pageKey: "gallery", label: "Gallery", path: "/gallery" },
  { pageKey: "testimonials", label: "Testimonials", path: "/testimonials" },
  { pageKey: "contact", label: "Contact", path: "/contact" },
  { pageKey: "blog", label: "Blog index", path: "/blog" },
  { pageKey: "faq", label: "FAQ", path: "/faq" },
] as const;

export type StaticSeoPageKey = (typeof STATIC_SEO_PAGES)[number]["pageKey"];

export function isStaticSeoPageKey(key: string): key is StaticSeoPageKey {
  return STATIC_SEO_PAGES.some((p) => p.pageKey === key);
}

export function getStaticSeoPage(pageKey: StaticSeoPageKey) {
  return STATIC_SEO_PAGES.find((p) => p.pageKey === pageKey);
}

export const SEO_GLOBAL_NAMESPACE = "seo-global";
export const SEO_STRUCTURED_NAMESPACE = "seo-structured";
export const SEO_INTEGRATIONS_NAMESPACE = "seo-integrations";

export const DEFAULT_ROBOTS = "index, follow";

export const ROBOTS_PRESETS = [
  { value: "index, follow", label: "Index, follow" },
  { value: "noindex, follow", label: "No index, follow" },
  { value: "index, nofollow", label: "Index, no follow" },
  { value: "noindex, nofollow", label: "No index, no follow" },
] as const;
