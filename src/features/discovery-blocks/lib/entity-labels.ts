import type { SearchEntityType } from "@prisma/client";
import { pickLocaleField } from "@/features/content-blocks/lib/locale-field";

const ENTITY_LABELS: Partial<
  Record<SearchEntityType, { labelEn: string; labelAr: string }>
> = {
  CATALOG_PRODUCT: { labelEn: "Product", labelAr: "منتج" },
  POST: { labelEn: "Article", labelAr: "مقال" },
  CONTENT_ITEM: { labelEn: "Content", labelAr: "محتوى" },
  CMS_PAGE: { labelEn: "Page", labelAr: "صفحة" },
  CATALOG_COLLECTION: { labelEn: "Collection", labelAr: "مجموعة" },
  CATALOG_CATEGORY: { labelEn: "Category", labelAr: "فئة" },
};

export function entityTypeBadge(type: SearchEntityType, locale: string): string {
  const entry = ENTITY_LABELS[type];
  if (!entry) return type;
  return pickLocaleField(entry, "label", locale) || type;
}
