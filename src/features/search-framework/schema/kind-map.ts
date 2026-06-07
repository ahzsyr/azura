import type { SearchEntityType } from "@prisma/client";
import type { SearchContentKind } from "@/features/search-framework/types";

const ENTITY_TO_KIND: Record<SearchEntityType, SearchContentKind> = {
  CONTENT_ITEM: "content_item",
  CONTENT_COLLECTION: "content_collection",
  CONTENT_TYPE: "content_type",
  CATALOG_PRODUCT: "catalog_product",
  CATALOG_COLLECTION: "catalog_collection",
  CATALOG_CATEGORY: "catalog_category",
  POST: "post",
  CMS_PAGE: "cms_page",
  FAQ: "faq",
  TESTIMONIAL: "testimonial",
  MEDIA: "media",
};

const KIND_TO_ENTITY: Record<string, SearchEntityType> = {
  content_item: "CONTENT_ITEM",
  content_collection: "CONTENT_COLLECTION",
  content_type: "CONTENT_TYPE",
  catalog_product: "CATALOG_PRODUCT",
  catalog_collection: "CATALOG_COLLECTION",
  catalog_category: "CATALOG_CATEGORY",
  post: "POST",
  cms_page: "CMS_PAGE",
  faq: "FAQ",
  testimonial: "TESTIMONIAL",
  media: "MEDIA",
};

export function entityTypeToKind(entityType: SearchEntityType): SearchContentKind {
  return ENTITY_TO_KIND[entityType] ?? (entityType.toLowerCase() as SearchContentKind);
}

export function kindToEntityType(kind: SearchContentKind): SearchEntityType | undefined {
  return KIND_TO_ENTITY[kind];
}

export function kindsToEntityTypes(kinds: SearchContentKind[]): SearchEntityType[] {
  const out = new Set<SearchEntityType>();
  for (const k of kinds) {
    const et = kindToEntityType(k);
    if (et) out.add(et);
  }
  return Array.from(out);
}

export function kindFromMetadata(metadata: unknown): SearchContentKind | undefined {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  const kind = meta.kind;
  return typeof kind === "string" ? (kind as SearchContentKind) : undefined;
}
