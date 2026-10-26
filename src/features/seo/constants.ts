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
  { pageKey: "videos", label: "Videos", path: "/videos" },
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
  "videos",
  "testimonials",
  "hotels-transport",
] as const satisfies readonly StaticSeoPageKey[];

export function isStaticSeoPageKey(key: string): key is StaticSeoPageKey {
  return STATIC_SEO_PAGES.some((p) => p.pageKey === key);
}

/**
 * Public routes that must never appear in crawl surfaces (sitemap, llms.txt,
 * priority submissions) even when a SeoMeta row happens to exist for them.
 * These pages are intentionally noindex by template policy.
 */
export const NON_INDEXABLE_STATIC_PAGE_KEYS = new Set<string>([
  "account",
  "compare",
  "favorites",
  "collections",
]);

export function isIndexableStaticPage(pageKey: string): boolean {
  return !NON_INDEXABLE_STATIC_PAGE_KEYS.has(pageKey);
}

/** Private/transactional path prefixes that must never leak into llms.txt. */
export const PRIVATE_PUBLIC_PATH_SEGMENTS = [
  "admin",
  "api",
  "account",
  "favorites",
  "compare",
  "search",
  "checkout",
  "cart",
  "login",
  "signup",
  "portal",
  "dashboard",
] as const;

export function isPrivatePublicPath(pathname: string): boolean {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return PRIVATE_PUBLIC_PATH_SEGMENTS.some(
    (segment) => path === `/${segment}` || path.startsWith(`/${segment}/`),
  );
}

/** Public llms.txt surface (rewritten to the API route in next.config.ts). */
export const LLMS_TXT_PATH = "/llms.txt";
export const LLMS_TXT_API_PATH = "/api/seo/llms";

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
export const SEO_APPEARANCE_NAMESPACE = "seo-appearance";
export const SEO_URL_INSPECTION_NAMESPACE = "seo-url-inspection";
export const SEO_LLMS_NAMESPACE = "seo-llms";

export const DEFAULT_ROBOTS = "index, follow";

export const ROBOTS_PRESETS = [
  { value: "index, follow", label: "Index, follow" },
  { value: "noindex, follow", label: "No index, follow" },
  { value: "index, nofollow", label: "Index, no follow" },
  { value: "noindex, nofollow", label: "No index, no follow" },
] as const;
