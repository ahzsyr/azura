/** Static marketing routes keyed for SeoMeta.pageKey */
export const STATIC_SEO_PAGES = [
  { pageKey: "home", label: "Home", path: "" },
  { pageKey: "about", label: "About", path: "/about" },
  { pageKey: "packages", label: "Packages listing", path: "/packages" },
  { pageKey: "visa", label: "Visa", path: "/visa" },
  { pageKey: "hotels-transport", label: "Hotels & transport", path: "/hotels-transport" },
  { pageKey: "gallery", label: "Gallery", path: "/gallery" },
  { pageKey: "testimonials", label: "Testimonials", path: "/testimonials" },
  { pageKey: "contact", label: "Contact", path: "/contact" },
  { pageKey: "blog", label: "Blog index", path: "/blog" },
] as const;

export const SEO_GLOBAL_NAMESPACE = "seo-global";
export const SEO_STRUCTURED_NAMESPACE = "seo-structured";

export const DEFAULT_ROBOTS = "index, follow";

export const ROBOTS_PRESETS = [
  { value: "index, follow", label: "Index, follow" },
  { value: "noindex, follow", label: "No index, follow" },
  { value: "index, nofollow", label: "Index, no follow" },
  { value: "noindex, nofollow", label: "No index, no follow" },
] as const;
