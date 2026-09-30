"use client";

import type { HydratedDiscoveryCard } from "@/features/builder/blocks/discovery/hooks/use-hydrated-discovery-cards";
import {
  DiscoveryCardAccordionBody,
  DiscoveryCardOverflowItem,
} from "@/features/builder/blocks/discovery/components/discovery-card-grid";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  cards: HydratedDiscoveryCard[];
  locale: string;
  columns: 2 | 3 | 4;
  block: BlockNode;
  overflow: BlockOverflowContext;
};

export function DiscoveryItemsOverflow({ cards, locale, columns, block, overflow }: Props) {
  const colClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <MarketingItemsOverflow
      block={block}
      overflowFlags={overflow.flags}
      previewDevice={overflow.previewDevice}
      items={cards}
      columns={columns}
      useSimpleSliderTrack={false}
      gridClassName={cn("grid gap-4", colClass)}
      getItemKey={(card) => card.item.id}
      renderItem={(card) => <DiscoveryCardOverflowItem card={card} locale={locale} />}
      accordionRender={(card) => ({
        title: card.item.title ?? card.item.id,
        body: <DiscoveryCardAccordionBody card={card} locale={locale} />,
      })}
    />
  );
}
