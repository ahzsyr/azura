import type { SchemaContext, SchemaNode } from "../types";
import { entityRef } from "../identity/entity-registry";
import { pageHashUrl } from "../identity/canonical-url.service";
import { SCHEMA_ID_COLLECTION_PAGE, SCHEMA_ID_ITEM_LIST } from "../constants";

/**
 * CollectionPage (+ optional ItemList) for category/brand listing pages.
 * ItemList is grounded only in `page.listingItems` (rendered listing), never invented.
 */
export const CollectionPageBuilder = {
  id: "collection-page",
  version: 1,
  supports(ctx: SchemaContext): boolean {
    return (
      (ctx.page.pageType === "collection" || ctx.page.pageType === "brand") &&
      Boolean(ctx.page.title || ctx.runtime.canonicalUrl)
    );
  },
  provenance() {
    return {
      name: "page.title",
      description: "page.description",
      url: "page.canonical",
      mainEntity: "page.listingItems",
    };
  },
  build(ctx: SchemaContext): SchemaNode[] {
    const nodes: SchemaNode[] = [];
    const collectionPageId = pageHashUrl(ctx, SCHEMA_ID_COLLECTION_PAGE);
    const listingItems = ctx.page.listingItems ?? [];
    const hasList = listingItems.length > 0;
    const itemListId = hasList ? pageHashUrl(ctx, SCHEMA_ID_ITEM_LIST) : undefined;

    nodes.push({
      "@type": "CollectionPage",
      "@id": collectionPageId,
      url: ctx.runtime.canonicalUrl,
      ...(ctx.page.title ? { name: ctx.page.title } : {}),
      ...(ctx.page.description ? { description: ctx.page.description } : {}),
      isPartOf: entityRef("website", ctx),
      ...(ctx.page.breadcrumbItems.length
        ? { breadcrumb: entityRef("breadcrumb", ctx) }
        : {}),
      ...(hasList && itemListId ? { mainEntity: { "@id": itemListId } } : {}),
    });

    if (hasList && itemListId) {
      nodes.push({
        "@type": "ItemList",
        "@id": itemListId,
        numberOfItems: listingItems.length,
        itemListElement: listingItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: item.url,
          ...(item.name ? { name: item.name } : {}),
        })),
      });
    }

    return nodes;
  },
};
