"use client";

import type { ReactNode } from "react";
import {
  DiscoveryProductCard,
  DiscoveryProductCardList,
} from "@/features/builder/blocks/discovery/components/discovery-product-card";
import type { DiscoveryItem } from "@/features/builder/blocks/discovery/lib/recently-viewed.types";
import type { HydratedDiscoveryCard } from "@/features/builder/blocks/discovery/hooks/use-hydrated-discovery-cards";
type Props = {
  cards: HydratedDiscoveryCard[];
  locale: string;
  layout: "grid" | "list" | "carousel";
  columns?: 2 | 3 | 4;
  personalizationHighlight?: "recent" | "recommended" | "trending";
};

export function DiscoveryCardGrid({
  cards,
  locale,
  layout,
  columns = 3,
  personalizationHighlight,
}: Props) {
  const colClass =
    columns === 2
      ? "pl-grid pl-grid--block-cols-2"
      : columns === 4
        ? "pl-grid pl-grid--block-cols-4"
        : "pl-grid pl-grid--block-cols-3";

  if (layout === "carousel") {
    return (
      <div className="block-overflow-slider-track pl-block-slider-track">
        <DiscoveryProductCardList
          cards={cards}
          locale={locale}
          personalizationHighlight={personalizationHighlight}
          renderWrapper={(key, card) => (
            <div key={key} className="pl-block-slider-item">
              {card}
            </div>
          )}
        />
      </div>
    );
  }

  if (layout === "list") {
    return (
      <ul className="space-y-2" role="list">
        <DiscoveryProductCardList
          cards={cards}
          locale={locale}
          personalizationHighlight={personalizationHighlight}
          renderWrapper={(key, card) => <li key={key}>{card}</li>}
        />
      </ul>
    );
  }

  return (
    <div className={colClass}>
      <DiscoveryProductCardList
        cards={cards}
        locale={locale}
        personalizationHighlight={personalizationHighlight}
      />
    </div>
  );
}

export function DiscoveryCardOverflowItem({
  card,
  locale,
}: {
  card: HydratedDiscoveryCard;
  locale: string;
}) {
  return (
    <DiscoveryProductCard
      item={card.item}
      record={card.record}
      locale={locale}
      isProduct={card.isProduct}
    />
  );
}

export function DiscoveryCardAccordionBody({
  card,
  locale,
}: {
  card: HydratedDiscoveryCard;
  locale: string;
}): ReactNode {
  return (
    <DiscoveryProductCard
      item={card.item}
      record={card.record}
      locale={locale}
      isProduct={card.isProduct}
    />
  );
}
