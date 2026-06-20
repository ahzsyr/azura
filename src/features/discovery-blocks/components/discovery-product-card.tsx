"use client";

import type { ReactNode } from "react";
import { ProductListingCard } from "@/features/products/components/listing/product-listing-card";
import type { ProductListingRecord } from "@/features/products/listing/types";
import type { DiscoveryItem } from "@/features/discovery-blocks/lib/recently-viewed.types";
import { nonProductEntityCardOverrides } from "@/features/products/lib/product-card-display";
import { stripAnyLocalePrefix } from "@/i18n/url-helpers";
import { getNumberLocale } from "@/shared/layout/direction/direction-utils";

type Props = {
  item: DiscoveryItem;
  record: ProductListingRecord;
  locale: string;
  isProduct: boolean;
  priority?: boolean;
  personalizationFlags?: {
    recent?: boolean;
    recommended?: boolean;
    trending?: boolean;
  };
};

export function DiscoveryProductCard({
  item,
  record,
  locale,
  isProduct,
  priority = false,
  personalizationFlags,
}: Props) {
  const href = stripAnyLocalePrefix(item.urlPath.startsWith("/") ? item.urlPath : `/${item.urlPath}`);
  const numberLocale = getNumberLocale(locale);

  return (
    <ProductListingCard
      product={record}
      href={href}
      localePrefix={locale}
      numberLocale={numberLocale}
      priority={priority}
      displayOverrides={isProduct ? undefined : nonProductEntityCardOverrides()}
      personalizationFlags={personalizationFlags}
    />
  );
}

export function DiscoveryProductCardList({
  cards,
  locale,
  renderWrapper,
  personalizationHighlight,
}: {
  cards: Array<{ item: DiscoveryItem; record: ProductListingRecord; isProduct: boolean }>;
  locale: string;
  renderWrapper?: (key: string, card: ReactNode) => ReactNode;
  personalizationHighlight?: "recent" | "recommended" | "trending";
}) {
  const personalizationFlags =
    personalizationHighlight === "recent"
      ? { recent: true }
      : personalizationHighlight === "recommended"
        ? { recommended: true }
        : personalizationHighlight === "trending"
          ? { trending: true }
          : undefined;
  return (
    <>
      {cards.map(({ item, record, isProduct }, index) => {
        const card = (
          <DiscoveryProductCard
            key={item.id}
            item={item}
            record={record}
            locale={locale}
            isProduct={isProduct}
            priority={index < 2}
            personalizationFlags={personalizationFlags}
          />
        );
        return renderWrapper ? renderWrapper(item.id, card) : card;
      })}
    </>
  );
}
