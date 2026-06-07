"use client";

import { DiscoveryItemCard } from "@/features/discovery-blocks/components/discovery-item-card";
import type { DiscoveryItem } from "@/features/discovery-blocks/lib/recently-viewed.types";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  items: DiscoveryItem[];
  locale: string;
  columns: 2 | 3 | 4;
  block: BlockNode;
  overflow: BlockOverflowContext;
};

export function DiscoveryItemsOverflow({ items, locale, columns, block, overflow }: Props) {
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
      items={items}
      columns={columns}
      useSimpleSliderTrack
      gridClassName={cn("grid gap-4", colClass)}
      getItemKey={(item) => item.id}
      renderItem={(item) => <DiscoveryItemCard item={item} locale={locale} layout="grid" />}
      accordionRender={(item) => ({
        title: item.title ?? item.id,
        body: <DiscoveryItemCard item={item} locale={locale} layout="list" />,
      })}
    />
  );
}
