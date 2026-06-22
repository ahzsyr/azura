"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  getLocalContentFavorites,
  getLocalProductFavorites,
  syncFavoritesFromServer,
} from "@/features/account/lib/favorites-sync";
import {
  SavedFavoritesList,
  type FavoriteListItem,
} from "@/features/account/components/saved-favorites-list";

type Props = {
  locale: string;
};

function localFavoriteItems(locale: string): FavoriteListItem[] {
  const products = getLocalProductFavorites().map((entityId) => ({
    id: `local-product-${entityId}`,
    entityType: "CATALOG_PRODUCT" as const,
    entityId,
    locale,
  }));
  const content = getLocalContentFavorites().map((entityId) => ({
    id: `local-content-${entityId}`,
    entityType: "CONTENT_ITEM" as const,
    entityId,
    locale,
  }));
  return [...products, ...content];
}

export function FavoritesPageContent({ locale }: Props) {
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status ?? "unauthenticated";
  const [items, setItems] = useState<FavoriteListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      if (status === "loading") return;

      if (session?.user) {
        await syncFavoritesFromServer();
        try {
          const res = await fetch("/api/account/favorites");
          if (res.ok) {
            const data = (await res.json()) as { favorites?: FavoriteListItem[] };
            setItems(data.favorites ?? []);
          } else {
            setItems(localFavoriteItems(locale));
          }
        } catch {
          setItems(localFavoriteItems(locale));
        }
      } else {
        setItems(localFavoriteItems(locale));
      }

      setLoading(false);
    }

    void load();
  }, [locale, session?.user, status]);

  return (
    <div className="container-premium py-12">
      <SavedFavoritesList
        locale={locale}
        items={items}
        loading={loading || status === "loading"}
        title="Your favorites"
        emptyMessage="No favorites yet. Save products or services while browsing."
      />
    </div>
  );
}
