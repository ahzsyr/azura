"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { getRecentlyViewed } from "@/features/builder/blocks/discovery/lib/recently-viewed.storage";
import { parseRecentlyViewedProps } from "@/features/builder/blocks/discovery/lib/parse-block-props";
import type { DiscoveryItem } from "@/features/builder/blocks/discovery/lib/recently-viewed.types";
import type { SearchEntityType } from "@prisma/client";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { DiscoveryItemsOverflow } from "@/features/builder/blocks/discovery/components/discovery-items-overflow";
import { DiscoveryCardGrid } from "@/features/builder/blocks/discovery/components/discovery-card-grid";
import { useHydratedDiscoveryCards } from "@/features/builder/blocks/discovery/hooks/use-hydrated-discovery-cards";

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
    [locale, p.limit, p.excludeCurrentPage, entityTypes],
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

  const cards = useHydratedDiscoveryCards(locale, items);

  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        {emptyMessage || "No recently viewed items yet."}
      </p>
    );
  }

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
      personalizationHighlight="recent"
    />
  );
}
