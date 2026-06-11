import type { SearchEntityType } from "@prisma/client";

export function entityTypeBadge(type: SearchEntityType, locale: string): string {
  const en: Partial<Record<SearchEntityType, string>> = {
    CATALOG_PRODUCT: "Product",
    POST: "Article",
    CONTENT_ITEM: "Content",
    CMS_PAGE: "Page",
    CATALOG_COLLECTION: "Collection",
    CATALOG_CATEGORY: "Category",
  };
  const ar: Partial<Record<SearchEntityType, string>> = {
    CATALOG_PRODUCT: "منتج",
    POST: "مقال",
    CONTENT_ITEM: "محتوى",
    CMS_PAGE: "صفحة",
    CATALOG_COLLECTION: "مجموعة",
    CATALOG_CATEGORY: "فئة",
  };
  return locale.startsWith("ar") ? (ar[type] ?? type) : (en[type] ?? type);
}
