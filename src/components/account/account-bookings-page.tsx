"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountNav } from "@/components/account/account-nav";
import { publicLocalePath } from "@/i18n/url-helpers";

type BookingRow = {
  id: string;
  status: string;
  createdAt: string;
  contentItem: { id: string; slug: string | null; title?: string };
};

type Props = { locale: string };

export function AccountBookingsPage({ locale }: Props) {
  const t = useTranslations("account");
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/account/bookings");
      if (res.ok) {
        const data = (await res.json()) as { bookings?: BookingRow[] };
        setRows(data.bookings ?? []);
      }
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="container-premium py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">{t("bookingsTitle")}</h1>
          <p className="text-muted-foreground mt-1">{t("bookingsDescription")}</p>
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
      <Card>
        <CardHeader>
          <CardTitle>{t("navBookings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm">{t("saving")}</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("bookingsEmpty")}</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-lg border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {row.contentItem.title ?? row.contentItem.slug ?? row.contentItem.id}
                  </span>
                  <Badge variant="secondary">{row.status}</Badge>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {new Date(row.createdAt).toLocaleString()}
                </p>
                {row.contentItem.slug ? (
                  <Button asChild variant="link" className="mt-1 px-0">
                    <Link href={publicLocalePath(locale, `/packages/${row.contentItem.slug}`)}>
                      {t("viewLinkedContent")}
                    </Link>
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
