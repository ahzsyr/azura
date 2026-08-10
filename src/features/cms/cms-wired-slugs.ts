/** CMS slugs wired to live marketing routes (not /pages/[slug]). Edge-safe — no builder imports. */
export const CMS_WIRED_MARKETING_SLUGS: Record<string, string> = {
  home: "/",
  about: "/about",
  contact: "/contact",
  packages: "/packages",
  gallery: "/gallery",
  testimonials: "/testimonials",
  "hotels-transport": "/hotels-transport",
  products: "/products",
  collections: "/categories",
  categories: "/categories",
  services: "/services",
  compare: "/compare",
  favorites: "/favorites",
  account: "/account",
  faqs: "/faqs",
  /** Legacy CMS slugs — canonical public paths live under /services/* */
  "smart-home": "/services/smart-home",
  "security-solutions": "/services/security-solutions",
  "enterprise-wireless": "/services/enterprise-wireless",
  "why-choose-us": "/why-choose-us",
};
