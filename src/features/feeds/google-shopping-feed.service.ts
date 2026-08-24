import "server-only";

import { isBuildWithoutDb } from "@/lib/build-db";
import { getDefaultUrlPrefix } from "@/i18n/locale-registry.server";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import { fromDbRow } from "@/features/products/db/product-db-mapper";
import { isProductPublishedForSearch } from "@/features/products/lib/product-publish-status";
import { productRepository } from "@/repositories/product.repository";
import {
  formatGoogleShoppingFeedXml,
  mapProductToGoogleShoppingItem,
  type GoogleShoppingFeedItem,
} from "./google-shopping-feed.mapper";

export {
  GOOGLE_SHOPPING_FEED_PATH,
  formatGoogleShoppingFeedXml,
  formatGoogleShoppingPrice,
  isExcludedFromGoogleShopping,
  mapGoogleShoppingAvailability,
  mapGoogleShoppingCondition,
  mapProductToGoogleShoppingItem,
  resolveGoogleShoppingDescription,
  resolveGoogleShoppingTitle,
  type GoogleShoppingAvailability,
  type GoogleShoppingCondition,
  type GoogleShoppingFeedItem,
  type GoogleShoppingFeedProductInput,
} from "./google-shopping-feed.mapper";

/**
 * Load published catalog products for the Google Shopping feed (default locale URLs).
 */
export async function generateGoogleShoppingFeedItems(
  siteOrigin?: string,
): Promise<{ items: GoogleShoppingFeedItem[]; siteOrigin: string; localePrefix: string }> {
  const origin = (siteOrigin ?? (await resolveSiteOrigin("sitemap"))).replace(/\/$/, "");
  const localePrefix = await getDefaultUrlPrefix();

  if (isBuildWithoutDb()) {
    return { items: [], siteOrigin: origin, localePrefix };
  }

  try {
    const rows = await productRepository.findMany({ status: "published" });
    const items: GoogleShoppingFeedItem[] = [];

    for (const row of rows) {
      if (!isProductPublishedForSearch(row.status)) continue;
      const product = fromDbRow(row);
      const mapped = mapProductToGoogleShoppingItem(
        {
          ...product,
          slug: row.canonicalSlug,
          excludeFromGoogleShopping: product.excludeFromGoogleShopping,
        },
        { siteOrigin: origin, localePrefix },
      );
      if (mapped) items.push(mapped);
    }

    items.sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: "base" }));
    return { items, siteOrigin: origin, localePrefix };
  } catch {
    return { items: [], siteOrigin: origin, localePrefix };
  }
}

export async function generateGoogleShoppingFeedXml(siteOrigin?: string): Promise<string> {
  const { items, siteOrigin: origin } = await generateGoogleShoppingFeedItems(siteOrigin);
  return formatGoogleShoppingFeedXml(items, { siteOrigin: origin });
}
