"use client";

import Image from "next/image";
import Link from "next/link";
import type { CategoryExplorerNode } from "@/features/discovery-blocks/lib/category-sources";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";

type Props = {
  nodes: CategoryExplorerNode[];
  showImages: boolean;
  showCounts: boolean;
  block: BlockNode;
  overflow: BlockOverflowContext;
};

export function CategoryExplorerGridOverflow({
  nodes,
  showImages,
  showCounts,
  block,
  overflow,
}: Props) {
  return (
    <MarketingItemsOverflow
      block={block}
      overflowFlags={overflow.flags}
      previewDevice={overflow.previewDevice}
      items={nodes}
      columns={3}
      useSimpleSliderTrack
      gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      getItemKey={(n) => n.slug}
      renderItem={(node) => (
        <Link
          href={node.href}
          className="group flex min-w-[200px] flex-col overflow-hidden rounded-xl border border-border/60 bg-card/50 transition-colors hover:border-primary/30"
        >
          {showImages && node.imageUrl ? (
            <div className="relative aspect-[16/10] bg-muted">
              <Image src={node.imageUrl} alt="" fill className="object-cover" sizes="200px" />
            </div>
          ) : null}
          <div className="p-3">
            <p className="font-medium text-sm">{node.name}</p>
            {showCounts && node.count != null ? (
              <p className="text-xs text-muted-foreground mt-0.5">{node.count} items</p>
            ) : null}
          </div>
        </Link>
      )}
      accordionRender={(node) => ({
        title: node.name,
        body: node.count != null ? `${node.count} items` : "",
      })}
    />
  );
}
