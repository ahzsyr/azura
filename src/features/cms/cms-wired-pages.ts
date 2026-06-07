/** Wired CMS pages — slugs with dedicated marketing routes (not /pages/[slug] only). */
export const CMS_WIRED_PAGE_DEFINITIONS = [
  { slug: "home", templateKey: "home", titleEn: "Home", titleAr: "الرئيسية" },
  { slug: "about", templateKey: "about", titleEn: "About Us", titleAr: "من نحن" },
  { slug: "contact", templateKey: "contact", titleEn: "Contact", titleAr: "اتصل بنا" },
  { slug: "packages", templateKey: "packages", titleEn: "Packages", titleAr: "الباقات" },
  { slug: "gallery", templateKey: "gallery", titleEn: "Gallery", titleAr: "المعرض" },
  { slug: "testimonials", templateKey: "testimonials", titleEn: "Testimonials", titleAr: "آراء العملاء" },
  { slug: "hotels-transport", templateKey: "hotels-transport", titleEn: "Hotels & Transport", titleAr: "الفنادق والنقل" },
  { slug: "products", templateKey: "products", titleEn: "Products", titleAr: "المنتجات" },
  { slug: "collections", templateKey: "collections", titleEn: "Collections", titleAr: "المجموعات" },
  { slug: "services", templateKey: "services", titleEn: "Services", titleAr: "الخدمات" },
  { slug: "compare", templateKey: "compare", titleEn: "Compare", titleAr: "المقارنة" },
  { slug: "favorites", templateKey: "favorites", titleEn: "Favorites", titleAr: "المفضلة" },
  { slug: "account", templateKey: "account", titleEn: "Account", titleAr: "الحساب" },
  { slug: "smart-home", templateKey: "smart-home", titleEn: "Smart Home", titleAr: "المنزل الذكي" },
  { slug: "security-solutions", templateKey: "security-solutions", titleEn: "Security Solutions", titleAr: "حلول الأمن" },
  { slug: "enterprise-wireless", templateKey: "enterprise-wireless", titleEn: "Enterprise Wireless", titleAr: "شبكات المؤسسات" },
] as const;

export type CmsWiredPageSlug = (typeof CMS_WIRED_PAGE_DEFINITIONS)[number]["slug"];

export const CMS_WIRED_PAGE_SLUGS = CMS_WIRED_PAGE_DEFINITIONS.map((p) => p.slug);

/** Slugs removed from the wired CMS set (cleanup on ensure). */
export const DEPRECATED_CMS_PAGE_SLUGS = ["visa"] as const;
