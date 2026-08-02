"use client";

import Image from "next/image";
import Link from "next/link";
import type { CategoryExplorerNode } from "@/features/builder/blocks/discovery/lib/category-sources";
import { cn } from "@/lib/utils";

type Props = {
  nodes: CategoryExplorerNode[];
  showImages: boolean;
  showCounts: boolean;
  columns?: 2 | 3 | 4;
};

export function CategoryExplorerGrid({
  nodes,
  showImages,
  showCounts,
  columns = 3,
}: Props) {
  const colClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className={cn("grid gap-4", colClass)}>
      {nodes.map((node) => (
        <Link
          key={node.slug}
          href={node.href}
          prefetch={false}
          className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/50 transition-colors hover:border-primary/30"
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
      ))}
    </div>
  );
}
