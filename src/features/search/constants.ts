import type { SearchEntityType } from "@prisma/client";

export const SEARCH_ENTITY_TYPES: SearchEntityType[] = [
  "CONTENT_TYPE",
  "CONTENT_COLLECTION",
  "CONTENT_ITEM",
  "CATALOG_PRODUCT",
  "CATALOG_COLLECTION",
  "CATALOG_CATEGORY",
  "CMS_PAGE",
  "POST",
  "FAQ",
  "TESTIMONIAL",
  "MEDIA",
];

export const ENTITY_LABELS: Record<SearchEntityType, { en: string; ar: string }> = {
  CONTENT_TYPE: { en: "Content type", ar: "نوع المحتوى" },
  CONTENT_COLLECTION: { en: "Collection", ar: "مجموعة" },
  CONTENT_ITEM: { en: "Catalog item", ar: "عنصر" },
  CATALOG_PRODUCT: { en: "Product", ar: "منتج" },
  CATALOG_COLLECTION: { en: "Product collection", ar: "مجموعة منتجات" },
  CATALOG_CATEGORY: { en: "Category", ar: "فئة" },
  POST: { en: "Blog post", ar: "مقال" },
  CMS_PAGE: { en: "Page", ar: "صفحة" },
  FAQ: { en: "FAQ", ar: "سؤال" },
  MEDIA: { en: "Media", ar: "وسائط" },
  TESTIMONIAL: { en: "Testimonial", ar: "رأي" },
};

/** Labels for dynamic content type slugs (packages, projects, listings, …). */
export function labelForContentTypeSlug(
  slug: string,
  locale: "en" | "ar",
  fallback?: { labelPluralEn: string; labelPluralAr: string }
): string {
  if (fallback) {
    return locale === "ar" ? fallback.labelPluralAr : fallback.labelPluralEn;
  }
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function adminPathFor(
  entityType: SearchEntityType,
  entityId: string,
  metadata?: Record<string, unknown>
): string {
  const meta = metadata ?? {};
  if (typeof meta.adminPath === "string" && meta.adminPath) return meta.adminPath;

  switch (entityType) {
    case "CONTENT_ITEM":
      if (typeof meta.contentTypeSlug === "string") {
        return `/admin/content/${meta.contentTypeSlug}/${entityId}`;
      }
      return `/admin/content/catalog-items/${entityId}`;
    case "CONTENT_TYPE":
      return `/admin/content/types/${entityId}`;
    case "CONTENT_COLLECTION":
      if (typeof meta.contentTypeSlug === "string") {
        return `/admin/content/${meta.contentTypeSlug}`;
      }
      return "/admin/content";
    case "CATALOG_PRODUCT":
    case "CATALOG_COLLECTION":
    case "CATALOG_CATEGORY":
      return "/admin/products";
    case "POST":
      return `/admin/posts/${entityId}`;
    case "CMS_PAGE":
      return `/admin/pages/${entityId}`;
    case "FAQ":
      return `/admin/faqs`;
    case "MEDIA":
      return `/admin/media`;
    case "TESTIMONIAL":
      return `/admin/testimonials`;
    default:
      return "/admin";
  }
}
