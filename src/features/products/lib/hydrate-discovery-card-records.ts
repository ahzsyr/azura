import "server-only";

import type { DiscoveryItem } from "@/features/builder/blocks/discovery/lib/recently-viewed.types";
import type { ProductListingRecord } from "@/features/products/listing/types";
import { queryListingRecordsByIdentifiers } from "@/features/products/listing/query-listing";
import {
  catalogProductSlugsFromDiscoveryItems,
  isCatalogProductDiscoveryItem,
  resolveDiscoveryCardRecord,
} from "@/features/products/lib/discovery-to-listing-record";

export type DiscoveryCardRecord = {
  item: DiscoveryItem;
  record: ProductListingRecord;
  isProduct: boolean;
};

export async function hydrateDiscoveryCardRecords(
  locale: string,
  items: DiscoveryItem[],
): Promise<DiscoveryCardRecord[]> {
  const productSlugs = catalogProductSlugsFromDiscoveryItems(items);
  const hydrated =
    productSlugs.length > 0
      ? await queryListingRecordsByIdentifiers(
          locale,
          productSlugs.map((slug) => ({ slug })),
        )
      : [];
  const bySlug = new Map(hydrated.map((r) => [r.slug, r]));

  return items.map((item) => {
    const isProduct = isCatalogProductDiscoveryItem(item);
    const record = resolveDiscoveryCardRecord(
      item,
      isProduct ? bySlug.get(item.entityId) : null,
    );
    return { item, record, isProduct };
  });
}
