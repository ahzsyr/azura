"use client";

import Link from "next/link";
import type { FavoriteEntityType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type FavoriteListItem = {
  id: string;
  entityType: FavoriteEntityType | string;
  entityId: string;
  locale?: string;
};

type Props = {
  locale: string;
  items: FavoriteListItem[];
  loading?: boolean;
  emptyMessage?: string;
  title?: string;
};

function favoriteHref(locale: string, item: FavoriteListItem): string | null {
  if (item.entityType === "CATALOG_PRODUCT") {
    return `/${locale}/products/${item.entityId}`;
  }
  if (item.entityType === "CONTENT_ITEM") {
    return `/${locale}/packages/${item.entityId}`;
  }
  return null;
}

function favoriteLabel(item: FavoriteListItem): string {
  if (item.entityType === "CATALOG_PRODUCT") return `Product: ${item.entityId}`;
  if (item.entityType === "CONTENT_ITEM") return `Service: ${item.entityId}`;
  return item.entityId;
}

export function SavedFavoritesList({
  locale,
  items,
  loading = false,
  emptyMessage = "No saved items yet.",
  title = "Saved items",
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading saved items">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 w-full rounded-lg bg-muted-foreground/20 motion-safe:animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          items.map((item) => {
            const href = favoriteHref(locale, item);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between border-b py-2 text-sm last:border-0"
              >
                <span>{favoriteLabel(item)}</span>
                {href ? (
                  <Link href={href} className="text-primary underline">
                    View
                  </Link>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
