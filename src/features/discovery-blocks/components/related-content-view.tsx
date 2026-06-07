"use client";

import { DiscoveryItemCard } from "@/features/discovery-blocks/components/discovery-item-card";
import { parseRelatedContentProps } from "@/features/discovery-blocks/lib/parse-block-props";
import type { DiscoveryItem } from "@/features/discovery-blocks/lib/recently-viewed.types";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { DiscoveryItemsOverflow } from "@/features/discovery-blocks/components/discovery-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  items: DiscoveryItem[];
  blockProps: Record<string, unknown>;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export function RelatedContentView({
  locale,
  items,
  blockProps: raw,
  block,
  overflow,
}: Props) {
  const p = parseRelatedContentProps(raw);

  const colClass =
    p.columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : p.columns === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  if (block && overflow) {
    return (
      <DiscoveryItemsOverflow
        items={items}
        locale={locale}
        columns={p.columns}
        block={block}
        overflow={overflow}
      />
    );
  }

  if (p.layout === "carousel") {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {items.map((item) => (
          <div key={item.id} className="min-w-[220px] max-w-[260px] shrink-0 snap-start">
            <DiscoveryItemCard item={item} locale={locale} layout="grid" />
          </div>
        ))}
      </div>
    );
  }

  if (p.layout === "list") {
    return (
      <ul className="space-y-2" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <DiscoveryItemCard item={item} locale={locale} layout="list" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={cn("grid gap-4", colClass)}>
      {items.map((item) => (
        <DiscoveryItemCard key={item.id} item={item} locale={locale} layout="grid" />
      ))}
    </div>
  );
}
