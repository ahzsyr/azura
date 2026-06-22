/** Marketing route segments and CMS patterns that must not be used as locale urlPrefix */
export const RESERVED_URL_PREFIXES = new Set([
  "about",
  "packages",
  "hotels-transport",
  "gallery",
  "testimonials",
  "contact",
  "blog",
  "faq",
  "pages",
  "collections",
  "brands",
  "tags",
  "products",
  "services",
  "compare",
  "favorites",
  "account",
  "search",
  "preview",
  "admin",
  "api",
]);

/**
 * Marketing routes with dedicated page.tsx files — never handled by [slug] catch-all.
 * When these overlap with locale urlPrefixes (e.g. ar), stacked paths like /en/ar must redirect to /ar.
 */
export const RESERVED_MARKETING_SLUGS = new Set([
  "ar",
  "about",
  "packages",
  "hotels-transport",
  "gallery",
  "testimonials",
  "contact",
  "blog",
  "faq",
  "pages",
  "collections",
  "brands",
  "tags",
  "products",
  "services",
  "smart-home",
  "security-solutions",
  "enterprise-wireless",
  "why-choose-us",
  "compare",
  "favorites",
  "account",
]);
