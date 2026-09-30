import "server-only";

import { loadCatalogUiMessages } from "@/i18n/catalog-ui-messages";
import type { CollectionHierarchyChromeLabels } from "@/features/collections/components/collection-hierarchy-chrome";
import {
  buildProductListingLabels,
  type CatalogToolbarLabels,
  type ProductListingLabels,
} from "./listing-labels";

function pick(
  dict: Record<string, string> | undefined,
  key: string,
  fallback: string,
): string {
  const value = dict?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export async function loadListingLabels(
  mode: "product" | "collection",
  localePrefix: string,
): Promise<{
  labels: ProductListingLabels;
  catalogToolbarLabels: CatalogToolbarLabels;
  hierarchyLabels: CollectionHierarchyChromeLabels;
  pageTitle: string;
}> {
  const { product, collection } = loadCatalogUiMessages(localePrefix);

  const t = (key: string, fallback: string) => {
    if (key.startsWith("collection.")) {
      return pick(collection, key.slice("collection.".length), fallback);
    }
    if (key.startsWith("product.")) {
      return pick(product, key.slice("product.".length), fallback);
    }
    return fallback;
  };

  const { labels, catalogToolbarLabels } = buildProductListingLabels(mode, t);

  const hierarchyLabels: CollectionHierarchyChromeLabels = {
    allCollections: pick(collection, "allCollections", "All collections"),
    ariaLabel: pick(collection, "hierarchyNav", "Browse collections by category"),
    levelRoot: pick(collection, "levelRoot", "Collection"),
    levelUnder: pick(collection, "levelUnder", "Under {parent}"),
  };

  const pageTitle =
    mode === "collection"
      ? pick(collection, "pageTitle", "Collections")
      : pick(product, "pageTitle", "Products");

  return { labels, catalogToolbarLabels, hierarchyLabels, pageTitle };
}
