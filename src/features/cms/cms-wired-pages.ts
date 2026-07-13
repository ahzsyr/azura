/** Wired CMS pages — slugs with dedicated marketing routes (not /pages/[slug] only). */
export const CMS_WIRED_PAGE_DEFINITIONS = [
  { slug: "home", templateKey: "home", defaultTitles: { en: "Home", ar: "الرئيسية" } },
  { slug: "about", templateKey: "about", defaultTitles: { en: "About Us", ar: "من نحن" } },
  { slug: "contact", templateKey: "contact", defaultTitles: { en: "Contact", ar: "اتصل بنا" } },
  { slug: "packages", templateKey: "packages", defaultTitles: { en: "Packages", ar: "الباقات" } },
  { slug: "gallery", templateKey: "gallery", defaultTitles: { en: "Gallery", ar: "المعرض" } },
  { slug: "testimonials", templateKey: "testimonials", defaultTitles: { en: "Testimonials", ar: "آراء العملاء" } },
  { slug: "hotels-transport", templateKey: "hotels-transport", defaultTitles: { en: "Hotels & Transport", ar: "الفنادق والنقل" } },
  { slug: "products", templateKey: "products", defaultTitles: { en: "Products", ar: "المنتجات" } },
  { slug: "collections", templateKey: "collections", defaultTitles: { en: "Collections", ar: "المجموعات" } },
  { slug: "services", templateKey: "services", defaultTitles: { en: "Services", ar: "الخدمات" } },
  { slug: "compare", templateKey: "compare", defaultTitles: { en: "Compare", ar: "المقارنة" } },
  { slug: "favorites", templateKey: "favorites", defaultTitles: { en: "Favorites", ar: "المفضلة" } },
  { slug: "account", templateKey: "account", defaultTitles: { en: "Account", ar: "الحساب" } },
  { slug: "smart-home", templateKey: "smart-home", defaultTitles: { en: "Smart Home", ar: "المنزل الذكي" } },
  { slug: "security-solutions", templateKey: "security-solutions", defaultTitles: { en: "Security Solutions", ar: "حلول الأمن" } },
  { slug: "enterprise-wireless", templateKey: "enterprise-wireless", defaultTitles: { en: "Enterprise Wireless", ar: "شبكات المؤسسات" } },
  { slug: "why-choose-us", templateKey: "why-choose-us", defaultTitles: { en: "Why Choose Us", ar: "لماذا نحن" } },
] as const;

export type CmsWiredPageSlug = (typeof CMS_WIRED_PAGE_DEFINITIONS)[number]["slug"];

export const CMS_WIRED_PAGE_SLUGS = CMS_WIRED_PAGE_DEFINITIONS.map((p) => p.slug);

/** Slugs removed from the wired CMS set (cleanup on ensure). */
export const DEPRECATED_CMS_PAGE_SLUGS = ["visa"] as const;
