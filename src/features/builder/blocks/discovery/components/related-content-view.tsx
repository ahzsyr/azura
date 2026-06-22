"use client";

import { parseRelatedContentProps } from "@/features/builder/blocks/discovery/lib/parse-block-props";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { DiscoveryItemsOverflow } from "@/features/builder/blocks/discovery/components/discovery-items-overflow";
import { DiscoveryCardGrid } from "@/features/builder/blocks/discovery/components/discovery-card-grid";
import type { HydratedDiscoveryCard } from "@/features/builder/blocks/discovery/hooks/use-hydrated-discovery-cards";

type Props = {
  locale: string;
  cards: HydratedDiscoveryCard[];
  blockProps: Record<string, unknown>;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export function RelatedContentView({
  locale,
  cards,
  blockProps: raw,
  block,
  overflow,
}: Props) {
  const p = parseRelatedContentProps(raw);

  if (block && overflow) {
    return (
      <DiscoveryItemsOverflow
        cards={cards}
        locale={locale}
        columns={p.columns}
        block={block}
        overflow={overflow}
      />
    );
  }

  return (
    <DiscoveryCardGrid
      cards={cards}
      locale={locale}
      layout={p.layout}
      columns={p.columns}
      personalizationHighlight="recommended"
    />
  );
}
