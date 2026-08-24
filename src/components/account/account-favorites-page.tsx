"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AccountNav } from "@/components/account/account-nav";
import {
  SavedFavoritesList,
  type FavoriteListItem,
} from "@/features/account/components/saved-favorites-list";
import { syncFavoritesFromServer } from "@/features/account/lib/favorites-sync";

type Props = { locale: string };

export function AccountFavoritesPage({ locale }: Props) {
  const t = useTranslations("account");
  const [items, setItems] = useState<FavoriteListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void syncFavoritesFromServer();
    async function load() {
      setLoading(true);
      const res = await fetch("/api/account/favorites");
      if (res.ok) {
        const data = (await res.json()) as { favorites?: FavoriteListItem[] };
        setItems(data.favorites ?? []);
      }
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="container-premium py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">{t("favoritesTitle")}</h1>
          <p className="text-muted-foreground mt-1">{t("favoritesDescription")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void signOut({ callbackUrl: `/${locale}` })}
        >
          {t("signOut")}
        </Button>
      </div>
      <AccountNav locale={locale} />
      <SavedFavoritesList
        locale={locale}
        items={items}
        loading={loading}
        emptyMessage={t("favoritesEmpty")}
        title={t("navFavorites")}
      />
    </div>
  );
}
