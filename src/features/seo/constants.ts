/** Static marketing routes keyed for SeoMeta.pageKey */
export const STATIC_SEO_PAGES = [
  { pageKey: "home", label: "Home", path: "" },
  { pageKey: "about", label: "About", path: "/about" },
  { pageKey: "packages", label: "Packages listing", path: "/packages" },
  { pageKey: "products", label: "Products", path: "/products" },
  { pageKey: "categories", label: "Categories", path: "/categories" },
  /** @deprecated Prefer categories — kept for SeoMeta rows until Stage 7 */
  { pageKey: "collections", label: "Collections (legacy)", path: "/categories" },
  { pageKey: "services", label: "Services", path: "/services" },
  { pageKey: "compare", label: "Compare", path: "/compare" },
  { pageKey: "favorites", label: "Favorites", path: "/favorites" },
  { pageKey: "account", label: "Account", path: "/account" },
  { pageKey: "hotels-transport", label: "Hotels & transport", path: "/hotels-transport" },
  { pageKey: "gallery", label: "Gallery", path: "/gallery" },
  { pageKey: "testimonials", label: "Testimonials", path: "/testimonials" },
  { pageKey: "contact", label: "Contact", path: "/contact" },
  { pageKey: "blog", label: "Blog index", path: "/blog" },
  { pageKey: "faqs", label: "FAQs", path: "/faqs" },
  { pageKey: "brands", label: "Brands", path: "/brands" },
  { pageKey: "tags", label: "Tags", path: "/tags" },
] as const;

export type StaticSeoPageKey = (typeof STATIC_SEO_PAGES)[number]["pageKey"];

/** Main marketing pages that must stay indexable and are submitted to search engines. */
export const PRIORITY_INDEXABLE_PAGE_KEYS = [
  "home",
  "about",
  "services",
  "products",
  "categories",
  "packages",
  "contact",
  "blog",
  "faqs",
  "brands",
  "tags",
  "gallery",
  "testimonials",
  "hotels-transport",
] as const satisfies readonly StaticSeoPageKey[];

export function isStaticSeoPageKey(key: string): key is StaticSeoPageKey {
  return STATIC_SEO_PAGES.some((p) => p.pageKey === key);
}

export function getStaticSeoPage(pageKey: StaticSeoPageKey) {
  return STATIC_SEO_PAGES.find((p) => p.pageKey === pageKey);
}

export const SEO_GLOBAL_NAMESPACE = "seo-global";
export const SEO_STRUCTURED_NAMESPACE = "seo-structured";
export const SEO_TRACKING_NAMESPACE = "seo-tracking";
export const SEO_INTEGRATIONS_NAMESPACE = "seo-integrations";
export const SEO_GOOGLE_PLATFORM_NAMESPACE = "seo-google-platform";
export const SEO_SITEMAP_NAMESPACE = "seo-sitemap";
export const SEO_KNOWLEDGE_NAMESPACE = "seo-knowledge";
export const SEO_PIPELINES_NAMESPACE = "seo-pipelines";
export const SEO_PROVENANCE_NAMESPACE = "seo-provenance";
export const SEO_SEARCH_OPS_NAMESPACE = "seo-search-ops";

export const DEFAULT_ROBOTS = "index, follow";

export const ROBOTS_PRESETS = [
  { value: "index, follow", label: "Index, follow" },
  { value: "noindex, follow", label: "No index, follow" },
  { value: "index, nofollow", label: "Index, no follow" },
  { value: "noindex, nofollow", label: "No index, no follow" },
] as const;
