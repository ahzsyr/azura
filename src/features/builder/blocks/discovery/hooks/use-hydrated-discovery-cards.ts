"use client";

import { useEffect, useMemo, useState } from "react";
import type { DiscoveryItem } from "@/features/builder/blocks/discovery/lib/recently-viewed.types";
import type { ProductListingRecord } from "@/features/products/listing/types";
import {
  catalogProductSlugsFromDiscoveryItems,
  isCatalogProductDiscoveryItem,
  resolveDiscoveryCardRecord,
} from "@/features/products/lib/discovery-to-listing-record";

export type HydratedDiscoveryCard = {
  item: DiscoveryItem;
  record: ProductListingRecord;
  isProduct: boolean;
};

export function useHydratedDiscoveryCards(
  locale: string,
  items: DiscoveryItem[],
): HydratedDiscoveryCard[] {
  const [hydratedBySlug, setHydratedBySlug] = useState<Map<string, ProductListingRecord>>(
    () => new Map(),
  );

  const productSlugs = useMemo(
    () => catalogProductSlugsFromDiscoveryItems(items),
    [items],
  );

  useEffect(() => {
    if (productSlugs.length === 0) {
      setHydratedBySlug(new Map());
      return;
    }

    let cancelled = false;
    const slugs = productSlugs.join(",");

    fetch(
      `/api/catalog/listing-records?locale=${encodeURIComponent(locale)}&slugs=${encodeURIComponent(slugs)}`,
      { credentials: "same-origin" },
    )
      .then(async (res) => {
        if (!res.ok) return { records: [] as ProductListingRecord[] };
        return res.json() as Promise<{ records: ProductListingRecord[] }>;
      })
      .then((payload) => {
        if (cancelled) return;
        setHydratedBySlug(new Map(payload.records.map((r) => [r.slug, r])));
      })
      .catch(() => {
        if (!cancelled) setHydratedBySlug(new Map());
      });

    return () => {
      cancelled = true;
    };
  }, [locale, productSlugs]);

  return useMemo(
    () =>
      items.map((item) => {
        const isProduct = isCatalogProductDiscoveryItem(item);
        const record = resolveDiscoveryCardRecord(
          item,
          isProduct ? hydratedBySlug.get(item.entityId) : null,
        );
        return { item, record, isProduct };
      }),
    [items, hydratedBySlug],
  );
}
