import type { SeoEntityDescriptor } from "../types/entity-descriptor";
import type { SeoWriteTarget } from "../types/change-set";

export function resolveWriteTarget(descriptor: SeoEntityDescriptor): SeoWriteTarget {
  switch (descriptor.kind) {
    case "cms_page":
      return { cmsPageId: descriptor.id };
    case "post":
      return { postId: descriptor.id };
    case "package":
      return { packageId: descriptor.id, entityType: "PACKAGE", entityId: descriptor.id };
    case "content_item":
      return {
        contentItemId: descriptor.id,
        entityType: "ContentItem",
        entityId: descriptor.id,
      };
    case "product":
      return {
        pageKey: descriptor.routingKey ?? `product:${descriptor.id}`,
        entityType: "Product",
        entityId: descriptor.id,
      };
    case "brand":
      return {
        pageKey: descriptor.routingKey ?? `brand:${descriptor.id}`,
        entityType: "Brand",
        entityId: descriptor.id,
      };
    case "collection":
      return {
        pageKey: descriptor.routingKey ?? `collection:${descriptor.id}`,
        entityType: "Collection",
        entityId: descriptor.id,
      };
    case "category":
      return {
        pageKey: descriptor.routingKey ?? `category:${descriptor.id}`,
        entityType: "Category",
        entityId: descriptor.id,
      };
    case "tag":
      return {
        pageKey: descriptor.routingKey ?? `tag:${descriptor.id}`,
        entityType: "Tag",
        entityId: descriptor.id,
      };
    case "static_page":
      return { pageKey: descriptor.routingKey ?? descriptor.id };
    default:
      return { entityType: descriptor.kind, entityId: descriptor.id };
  }
}
