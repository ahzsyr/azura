"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { DiscoveryItemCard } from "@/features/discovery-blocks/components/discovery-item-card";
import { getRecentlyViewed } from "@/features/discovery-blocks/lib/recently-viewed.storage";
import { parseRecentlyViewedProps } from "@/features/discovery-blocks/lib/parse-block-props";
import type { DiscoveryItem } from "@/features/discovery-blocks/lib/recently-viewed.types";
import type { SearchEntityType } from "@prisma/client";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { DiscoveryItemsOverflow } from "@/features/discovery-blocks/components/discovery-items-overflow";
import { cn } from "@/lib/utils";

type Props = {
  blockProps: Record<string, unknown>;
  emptyMessage?: string;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export function RecentlyViewedBlockIsland({ blockProps: raw, emptyMessage, block, overflow }: Props) {
  const p = parseRecentlyViewedProps(raw);
  const locale = useLocale();
  const pathname = usePathname();

  const entityTypes =
    p.entityTypes.length > 0 ? (p.entityTypes as SearchEntityType[]) : undefined;

  const entries = useMemo(
    () => getRecentlyViewed(locale, p.limit + (p.excludeCurrentPage ? 1 : 0), entityTypes),
    [locale, p.limit, p.excludeCurrentPage, entityTypes]
  );

  const items: DiscoveryItem[] = useMemo(() => {
    let list = entries.map((e) => ({
      id: `${e.entityType}-${e.entityId}`,
      entityType: e.entityType,
      entityId: e.entityId,
      title: e.title,
      urlPath: e.urlPath,
      imageUrl: e.imageUrl,
    }));
    if (p.excludeCurrentPage) {
      list = list.filter((i) => {
        const normalized = i.urlPath.replace(`/${locale}`, "") || i.urlPath;
        return pathname !== normalized && pathname !== i.urlPath;
      });
    }
    return list.slice(0, p.limit);
  }, [entries, p.excludeCurrentPage, p.limit, pathname, locale]);

  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        {emptyMessage || "No recently viewed items yet."}
      </p>
    );
  }

  const colClass =
    p.columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : p.columns === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-2 sm:grid-cols-4";

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
