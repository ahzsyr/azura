"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { syncFavoritesFromServer } from "@/features/account/lib/favorites-sync";
import type { FavoriteListItem } from "@/features/account/components/saved-favorites-list";
import { AccountNav } from "@/components/account/account-nav";
import { accountPublicPath } from "@/features/account/account-public-path";
import { publicLocalePath } from "@/i18n/url-helpers";

type RequestPreview = {
  id: string;
  kind: "inquiry" | "quote";
  label: string;
  status: string;
  createdAt: string;
};

type Props = {
  locale: string;
  userName: string;
  userEmail: string;
};

export function AccountDashboard({ locale, userName, userEmail }: Props) {
  const t = useTranslations("account");
  const [favorites, setFavorites] = useState<FavoriteListItem[]>([]);
  const [requests, setRequests] = useState<RequestPreview[]>([]);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void syncFavoritesFromServer();
    async function load() {
      setLoading(true);
      const [favRes, reqRes, bookRes] = await Promise.all([
        fetch("/api/account/favorites"),
        fetch("/api/account/requests?limit=3"),
        fetch("/api/account/bookings?limit=1"),
      ]);
      if (favRes.ok) {
        const data = (await favRes.json()) as { favorites?: FavoriteListItem[] };
        setFavorites(data.favorites ?? []);
      }
      if (reqRes.ok) {
        const data = (await reqRes.json()) as {
          requests?: RequestPreview[];
          total?: number;
        };
        setRequests(data.requests ?? []);
        setRequestsTotal(data.total ?? data.requests?.length ?? 0);
      }
      if (bookRes.ok) {
        const data = (await bookRes.json()) as { total?: number };
        setBookingsCount(data.total ?? 0);
      }
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="container-premium py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">{t("overviewTitle")}</h1>
          <p className="text-muted-foreground mt-1">
            {userName} · {userEmail}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void signOut({ callbackUrl: publicLocalePath(locale, "/") })}
        >
          {t("signOut")}
        </Button>
      </div>

      <AccountNav locale={locale} />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("navRequests")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{loading ? "…" : requestsTotal}</p>
            <Button asChild variant="link" className="px-0">
              <Link href={accountPublicPath(locale, "requests")}>{t("viewAll")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("navFavorites")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{loading ? "…" : favorites.length}</p>
            <Button asChild variant="link" className="px-0">
              <Link href={accountPublicPath(locale, "favorites")}>{t("viewAll")}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("navBookings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{loading ? "…" : bookingsCount}</p>
            <Button asChild variant="link" className="px-0">
              <Link href={accountPublicPath(locale, "bookings")}>{t("viewAll")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("overviewRecentRequests")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-muted-foreground text-sm">{t("saving")}</p>
            ) : requests.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("requestsEmpty")}</p>
            ) : (
              requests.map((row) => (
                <Link
                  key={`${row.kind}-${row.id}`}
                  href={`${accountPublicPath(locale, `requests/${row.id}`)}?kind=${row.kind}`}
                  className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-muted-foreground">{row.status}</span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("overviewRecentFavorites")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-muted-foreground text-sm">{t("saving")}</p>
            ) : favorites.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("favoritesEmpty")}</p>
            ) : (
              favorites.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-lg border p-3 text-sm">
                  <span className="font-medium">{item.entityType}</span>
                  <p className="text-muted-foreground mt-1 font-mono text-xs">{item.entityId}</p>
                </div>
              ))
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={accountPublicPath(locale, "favorites")}>{t("navFavorites")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
